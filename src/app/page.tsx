import { getLatestSyncRun, getTopProducts } from "@/lib/rankings";

function formatNumber(value: number, decimals = 2) {
  return new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatDate(date: Date | null | undefined) {
  if (!date) {
    return "Aldri";
  }

  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

type RankingSectionProps = {
  title: string;
  unit: string;
  rows: {
    id: number;
    name: string;
    brand: string | null;
    priceNok: number;
    proteinPer100g: number;
    kcalPer100g: number;
    proteinPerKrone: number;
    proteinPerCalorie: number;
    proteinPerCaloriePerKrone: number;
  }[];
  valueAccessor: (row: RankingSectionProps["rows"][number]) => number;
};

function RankingSection({ title, unit, rows, valueAccessor }: RankingSectionProps) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-100 sm:text-xl">{title}</h2>
        <span className="font-mono text-xs uppercase tracking-[0.15em] text-teal-300">{unit}</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-300">Ingen produkter i databasen enda. Kjor forst en sync.</p>
      ) : (
        <ol className="space-y-3">
          {rows.map((row, index) => (
            <li key={row.id} className="item-grid">
              <div className="font-mono text-xs text-teal-300">#{index + 1}</div>
              <div>
                <p className="font-semibold text-slate-100">{row.name}</p>
                <p className="text-sm text-slate-300">{row.brand ?? "Ukjent merke"}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-amber-300">{formatNumber(valueAccessor(row), 3)}</p>
                <p className="text-xs text-slate-400">{formatNumber(row.priceNok)} kr</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const [perKrone, perCalorie, perCaloriePerKrone, latestSync] = await Promise.all([
    getTopProducts("proteinPerKrone", 15),
    getTopProducts("proteinPerCalorie", 15),
    getTopProducts("proteinPerCaloriePerKrone", 15),
    getLatestSyncRun(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-16 pt-10 sm:px-6 lg:px-10">
      <section className="hero card mb-6 p-6 sm:p-8">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-teal-300">Norsk Matvare-ranking</p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-100 sm:text-5xl">
          Proteindex
        </h1>
        <p className="mt-4 max-w-3xl text-pretty text-slate-200 sm:text-lg">
          Produkter rangeres etter protein per krone, protein per kalori og kombinasjonen protein per kalori per krone.
          Data hentes fra Kassalapp og lagres i lokal database.
        </p>
        <div className="mt-6 grid gap-3 text-sm text-slate-200 sm:grid-cols-3">
          <div className="chip">Siste sync: {formatDate(latestSync?.finishedAt ?? latestSync?.startedAt)}</div>
          <div className="chip">Status: {latestSync?.status ?? "ingen kjoring enda"}</div>
          <div className="chip">Lagrede produkter: {latestSync?.productsSaved ?? 0}</div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <RankingSection
          title="Protein per krone"
          unit="g / kr"
          rows={perKrone}
          valueAccessor={(row) => row.proteinPerKrone}
        />
        <RankingSection
          title="Protein per kalori"
          unit="g / kcal"
          rows={perCalorie}
          valueAccessor={(row) => row.proteinPerCalorie}
        />
        <RankingSection
          title="Protein per kalori per krone"
          unit="g / kcal / kr"
          rows={perCaloriePerKrone}
          valueAccessor={(row) => row.proteinPerCaloriePerKrone}
        />
      </section>
    </main>
  );
}
