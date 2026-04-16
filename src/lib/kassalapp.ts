const DEFAULT_BASE_URL = "https://kassal.app/api";
const REQUEST_DELAY_MS = 1_000;

type UnknownRecord = Record<string, unknown>;

export type NormalizedProduct = {
  externalId: string;
  name: string;
  brand: string | null;
  store: string | null;
  category: string | null;
  imageUrl: string | null;
  priceNok: number;
  kcalPer100g: number;
  proteinPer100g: number;
  proteinPerKrone: number;
  proteinPerCalorie: number;
  proteinPerCaloriePerKrone: number;
};

export type FetchProductsResult = {
  products: NormalizedProduct[];
  fetchedCount: number;
  pagesFetched: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" ? (value as UnknownRecord) : null;
}

function pickNumber(source: UnknownRecord | null, keys: string[]): number | null {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value.replace(",", "."));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function pickString(source: UnknownRecord | null, keys: string[]): string | null {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function extractProductArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  const root = asRecord(payload);
  if (!root) {
    return [];
  }

  const candidates = [root.data, root.products, root.items, root.results];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    const maybeRecord = asRecord(candidate);
    if (maybeRecord && Array.isArray(maybeRecord.items)) {
      return maybeRecord.items;
    }
  }

  return [];
}

function extractTotalPages(payload: unknown): number | null {
  const root = asRecord(payload);
  if (!root) {
    return null;
  }

  const direct = pickNumber(root, ["totalPages", "total_pages", "pages", "lastPage"]);
  if (direct && direct > 0) {
    return Math.floor(direct);
  }

  const meta = asRecord(root.meta);
  const fromMeta = pickNumber(meta, ["totalPages", "total_pages", "pages", "lastPage"]);
  if (fromMeta && fromMeta > 0) {
    return Math.floor(fromMeta);
  }

  return null;
}

function normalizeProduct(raw: unknown): NormalizedProduct | null {
  const product = asRecord(raw);
  if (!product) {
    return null;
  }

  const nutrition = asRecord(product.nutrition) ?? asRecord(product.nutrition_per_100g);
  const priceInfo = asRecord(product.price) ?? asRecord(product.current_price);

  const externalIdRaw = pickString(product, ["id", "productId", "product_id", "ean", "gtin"]);
  const name = pickString(product, ["name", "title", "display_name"]);
  const brand = pickString(product, ["brand", "brand_name", "manufacturer"]);
  const store = pickString(product, ["store", "store_name", "chain"]);
  const category = pickString(product, ["category", "category_name", "department"]);
  const imageUrl = pickString(product, ["image", "image_url", "imageUrl", "thumbnail"]);

  const price =
    pickNumber(product, ["price", "price_now", "current_price", "sale_price"]) ??
    pickNumber(priceInfo, ["value", "now", "amount", "price"]);

  const protein =
    pickNumber(product, ["protein_per_100g", "protein"]) ??
    pickNumber(nutrition, ["protein", "protein_per_100g", "proteins"]);

  const kcal =
    pickNumber(product, ["kcal_per_100g", "energy_kcal", "calories"]) ??
    pickNumber(nutrition, ["kcal", "energy_kcal", "energyKcal", "calories"]);

  if (!externalIdRaw || !name || !price || !protein || !kcal) {
    return null;
  }

  if (price <= 0 || protein <= 0 || kcal <= 0) {
    return null;
  }

  const externalId = String(externalIdRaw);
  const proteinPerKrone = protein / price;
  const proteinPerCalorie = protein / kcal;
  const proteinPerCaloriePerKrone = proteinPerCalorie / price;

  return {
    externalId,
    name,
    brand,
    store,
    category,
    imageUrl,
    priceNok: price,
    kcalPer100g: kcal,
    proteinPer100g: protein,
    proteinPerKrone,
    proteinPerCalorie,
    proteinPerCaloriePerKrone,
  };
}

async function fetchWithRetry(url: URL, apiKey: string, attempts = 3): Promise<unknown> {
  let errorMessage = "";

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-API-KEY": apiKey,
      },
      cache: "no-store",
    });

    if (response.ok) {
      return response.json();
    }

    errorMessage = `HTTP ${response.status} on ${url.pathname}${url.search}`;

    // Respect remote throttling and backoff before a retry.
    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
    const delayMs =
      Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds * 1_000
        : attempt * 1_500;

    if (attempt < attempts) {
      await sleep(delayMs);
      continue;
    }
  }

  throw new Error(`Kunne ikke hente fra Kassalapp. ${errorMessage}`);
}

export async function fetchAllKassalappProducts(options?: {
  pageSize?: number;
  maxPages?: number;
}): Promise<FetchProductsResult> {
  const apiKey = process.env.KASSALAPP_API_KEY;
  if (!apiKey) {
    throw new Error("Mangler KASSALAPP_API_KEY i miljøvariabler.");
  }

  const baseUrl = process.env.KASSALAPP_BASE_URL ?? DEFAULT_BASE_URL;
  const pageSize = options?.pageSize ?? 100;
  const maxPages = options?.maxPages ?? Number.POSITIVE_INFINITY;

  let page = 1;
  let pagesFetched = 0;
  let fetchedCount = 0;
  const normalizedProducts: NormalizedProduct[] = [];

  while (true) {
    const url = new URL("/products", baseUrl);
    url.searchParams.set("size", String(pageSize));
    url.searchParams.set("page", String(page));

    const payload = await fetchWithRetry(url, apiKey);
    const pageProducts = extractProductArray(payload);
    const totalPages = extractTotalPages(payload);

    pagesFetched += 1;
    fetchedCount += pageProducts.length;

    for (const rawProduct of pageProducts) {
      const normalized = normalizeProduct(rawProduct);
      if (normalized) {
        normalizedProducts.push(normalized);
      }
    }

    const isLastPageByCount = pageProducts.length < pageSize;
    const isLastPageByMeta = totalPages !== null && page >= totalPages;

    const reachedMaxPages = pagesFetched >= maxPages;

    if (pageProducts.length === 0 || isLastPageByCount || isLastPageByMeta || reachedMaxPages) {
      break;
    }

    page += 1;
    await sleep(REQUEST_DELAY_MS);
  }

  return {
    products: normalizedProducts,
    fetchedCount,
    pagesFetched,
  };
}
