import { prisma } from "@/lib/prisma";
import { fetchAllKassalappProducts } from "@/lib/kassalapp";

export type SyncSummary = {
  syncRunId: number;
  status: "success" | "failed";
  pagesFetched: number;
  productsReceived: number;
  productsSaved: number;
  errorMessage?: string;
};

export async function runProductSync(): Promise<SyncSummary> {
  const syncRun = await prisma.syncRun.create({
    data: {
      status: "running",
    },
  });

  try {
    const maxPagesFromEnv = Number(process.env.KASSALAPP_MAX_PAGES ?? "");
    const maxPages = Number.isFinite(maxPagesFromEnv) && maxPagesFromEnv > 0 ? maxPagesFromEnv : undefined;

    const fetched = await fetchAllKassalappProducts({
      pageSize: 100,
      maxPages,
    });
    let productsSaved = 0;

    for (const product of fetched.products) {
      await prisma.product.upsert({
        where: { externalId: product.externalId },
        update: {
          name: product.name,
          brand: product.brand,
          store: product.store,
          category: product.category,
          imageUrl: product.imageUrl,
          priceNok: product.priceNok,
          kcalPer100g: product.kcalPer100g,
          proteinPer100g: product.proteinPer100g,
          proteinPerKrone: product.proteinPerKrone,
          proteinPerCalorie: product.proteinPerCalorie,
          proteinPerCaloriePerKrone: product.proteinPerCaloriePerKrone,
          lastSeenAt: new Date(),
        },
        create: {
          externalId: product.externalId,
          name: product.name,
          brand: product.brand,
          store: product.store,
          category: product.category,
          imageUrl: product.imageUrl,
          priceNok: product.priceNok,
          kcalPer100g: product.kcalPer100g,
          proteinPer100g: product.proteinPer100g,
          proteinPerKrone: product.proteinPerKrone,
          proteinPerCalorie: product.proteinPerCalorie,
          proteinPerCaloriePerKrone: product.proteinPerCaloriePerKrone,
          lastSeenAt: new Date(),
        },
      });

      productsSaved += 1;
    }

    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: "success",
        pagesFetched: fetched.pagesFetched,
        productsReceived: fetched.fetchedCount,
        productsSaved,
        finishedAt: new Date(),
      },
    });

    return {
      syncRunId: syncRun.id,
      status: "success",
      pagesFetched: fetched.pagesFetched,
      productsReceived: fetched.fetchedCount,
      productsSaved,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Ukjent feil";

    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        errorMessage,
      },
    });

    return {
      syncRunId: syncRun.id,
      status: "failed",
      pagesFetched: 0,
      productsReceived: 0,
      productsSaved: 0,
      errorMessage,
    };
  }
}
