import { prisma } from "@/lib/prisma";

export type RankingMetric =
  | "proteinPerKrone"
  | "proteinPerCalorie"
  | "proteinPerCaloriePerKrone";

export function resolveMetricLabel(metric: RankingMetric): string {
  switch (metric) {
    case "proteinPerKrone":
      return "Protein per krone";
    case "proteinPerCalorie":
      return "Protein per kalori";
    case "proteinPerCaloriePerKrone":
      return "Protein per kalori per krone";
    default:
      return metric;
  }
}

export async function getTopProducts(metric: RankingMetric, take = 20) {
  return prisma.product.findMany({
    take,
    orderBy: [{ [metric]: "desc" }, { proteinPer100g: "desc" }],
  });
}

export async function getLatestSyncRun() {
  return prisma.syncRun.findFirst({
    orderBy: { startedAt: "desc" },
  });
}
