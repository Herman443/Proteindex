import { NextResponse } from "next/server";
import { getTopProducts, type RankingMetric } from "@/lib/rankings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const METRICS: RankingMetric[] = [
  "proteinPerKrone",
  "proteinPerCalorie",
  "proteinPerCaloriePerKrone",
];

function getMetric(rawMetric: string | null): RankingMetric {
  if (!rawMetric) {
    return "proteinPerKrone";
  }

  if (METRICS.includes(rawMetric as RankingMetric)) {
    return rawMetric as RankingMetric;
  }

  return "proteinPerKrone";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const metric = getMetric(searchParams.get("metric"));
  const limit = Number(searchParams.get("limit") ?? "20");

  const products = await getTopProducts(metric, Number.isFinite(limit) ? Math.min(limit, 100) : 20);

  return NextResponse.json({
    metric,
    count: products.length,
    products,
  });
}
