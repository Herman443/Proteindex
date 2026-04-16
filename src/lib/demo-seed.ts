import { prisma } from "@/lib/prisma";

const DEMO_PRODUCTS = [
  {
    externalId: "demo_001",
    name: "Tursian Kyllingbryst",
    brand: "Tursian",
    store: "Rema",
    category: "Kjøtt",
    imageUrl: null,
    priceNok: 89.9,
    kcalPer100g: 165,
    proteinPer100g: 31,
  },
  {
    externalId: "demo_002",
    name: "Tro Magert Storfekjøtt",
    brand: "Tro",
    store: "Coop",
    category: "Kjøtt",
    imageUrl: null,
    priceNok: 179.9,
    kcalPer100g: 130,
    proteinPer100g: 26,
  },
  {
    externalId: "demo_003",
    name: "Lactofree Melk",
    brand: "Lactofree",
    store: "Rema",
    category: "Meieri",
    imageUrl: null,
    priceNok: 18.9,
    kcalPer100g: 61,
    proteinPer100g: 3.3,
  },
  {
    externalId: "demo_004",
    name: "Skyr Islandsk Yoghurt",
    brand: "MSC",
    store: "Rema",
    category: "Meieri",
    imageUrl: null,
    priceNok: 35.9,
    kcalPer100g: 100,
    proteinPer100g: 10,
  },
  {
    externalId: "demo_005",
    name: "Doritos Paprika",
    brand: "Frito-Lay",
    store: "Coop",
    category: "Snacks",
    imageUrl: null,
    priceNok: 12.9,
    kcalPer100g: 530,
    proteinPer100g: 5.9,
  },
  {
    externalId: "demo_006",
    name: "Egg x12 Friland",
    brand: "Røros Egg",
    store: "Coop",
    category: "Meieri",
    imageUrl: null,
    priceNok: 39.9,
    kcalPer100g: 155,
    proteinPer100g: 13,
  },
  {
    externalId: "demo_007",
    name: "Brunost BruksKost",
    brand: "TINE",
    store: "Rema",
    category: "Meieri",
    imageUrl: null,
    priceNok: 42.9,
    kcalPer100g: 450,
    proteinPer100g: 15,
  },
  {
    externalId: "demo_008",
    name: "Thaisuppe Buddha",
    brand: "Knorr",
    store: "Coop",
    category: "Soup",
    imageUrl: null,
    priceNok: 20.0,
    kcalPer100g: 65,
    proteinPer100g: 2.1,
  },
  {
    externalId: "demo_009",
    name: "Atira Proteinshake",
    brand: "Atira",
    store: "Extra",
    category: "Drikker",
    imageUrl: null,
    priceNok: 29.9,
    kcalPer100g: 405,
    proteinPer100g: 40,
  },
  {
    externalId: "demo_010",
    name: "Tyveskjære Kyllingfilet",
    brand: "Norsk Kylling",
    store: "Rema",
    category: "Kjøtt",
    imageUrl: null,
    priceNok: 99.9,
    kcalPer100g: 165,
    proteinPer100g: 31,
  },
  {
    externalId: "demo_011",
    name: "Prim Lett Ost 16%",
    brand: "TINE",
    store: "Extra",
    category: "Meieri",
    imageUrl: null,
    priceNok: 48.9,
    kcalPer100g: 240,
    proteinPer100g: 28,
  },
  {
    externalId: "demo_012",
    name: "Ricotta Galbani",
    brand: "Galbani",
    store: "Coop",
    category: "Meieri",
    imageUrl: null,
    priceNok: 25.9,
    kcalPer100g: 174,
    proteinPer100g: 11,
  },
];

export async function seedDemoData() {
  const syncRun = await prisma.syncRun.create({
    data: {
      status: "running",
    },
  });

  try {
    let productsSaved = 0;

    for (const product of DEMO_PRODUCTS) {
      const priceNok = product.priceNok;
      const protein = product.proteinPer100g;
      const kcal = product.kcalPer100g;

      const proteinPerKrone = protein / priceNok;
      const proteinPerCalorie = protein / kcal;
      const proteinPerCaloriePerKrone = proteinPerCalorie / priceNok;

      await prisma.product.upsert({
        where: { externalId: product.externalId },
        update: {
          name: product.name,
          brand: product.brand,
          store: product.store,
          category: product.category,
          imageUrl: product.imageUrl,
          priceNok,
          kcalPer100g: kcal,
          proteinPer100g: protein,
          proteinPerKrone,
          proteinPerCalorie,
          proteinPerCaloriePerKrone,
          lastSeenAt: new Date(),
        },
        create: {
          externalId: product.externalId,
          name: product.name,
          brand: product.brand,
          store: product.store,
          category: product.category,
          imageUrl: product.imageUrl,
          priceNok,
          kcalPer100g: kcal,
          proteinPer100g: protein,
          proteinPerKrone,
          proteinPerCalorie,
          proteinPerCaloriePerKrone,
          lastSeenAt: new Date(),
        },
      });

      productsSaved += 1;
    }

    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: "success",
        pagesFetched: 1,
        productsReceived: DEMO_PRODUCTS.length,
        productsSaved,
        finishedAt: new Date(),
      },
    });

    return { success: true, productsSaved };
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

    throw error;
  }
}
