import { NextResponse } from "next/server";
import { runProductSync } from "@/lib/sync-products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const summary = await runProductSync();
  const status = summary.status === "success" ? 200 : 500;

  return NextResponse.json(summary, { status });
}
