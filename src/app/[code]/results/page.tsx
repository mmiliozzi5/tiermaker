import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { scoreToTier, TIER_LABELS, TIER_COLORS } from "@/lib/scoring";
import { TierRow } from "@/components/TierRow";
import { Podium } from "@/components/Podium";
import type { ItemWithAvg } from "@/types";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function ResultsPage({ params }: Props) {
  const { code } = await params;
  const upperCode = code.toUpperCase();
  const supabase = await createClient();

  // Buscar tierlist
  const { data: tierlist } = await supabase
    .from("tierlists")
    .select("*")
    .eq("code", upperCode)
    .single();

  if (!tierlist) redirect("/");
  if (tierlist.status !== "finished") redirect(`/${upperCode}`);

  // Buscar ítems
  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("tierlist_id", tierlist.id)
    .order("display_order", { ascending: true });

  // Buscar participantes
  const { data: participants } = await supabase
    .from("participants")
    .select("*")
    .eq("tierlist_id", tierlist.id);

  // Buscar todos los rankings de la tierlist
  const { data: allRankings } = await supabase
    .from("rankings")
    .select("*, participants!inner(tierlist_id)")
    .eq("participants.tierlist_id", tierlist.id);

  const itemsList = items ?? [];
  const participantCount = (participants ?? []).length;

  // Calcular promedio por ítem
  const itemsWithAvg: ItemWithAvg[] = itemsList.map((item) => {
    const itemRankings = (allRankings ?? []).filter((r) => r.item_id === item.id);
    const sum = itemRankings.reduce((acc, r) => acc + (r.score ?? 0), 0);
    const avg = participantCount > 0 ? sum / participantCount : 0;
    const tier = scoreToTier(avg, tierlist.tier_format);
    return { ...item, avg, tier };
  });

  // Agrupar por tier
  const tierLabels = TIER_LABELS[tierlist.tier_format as "letters" | "numbers"];
  const groupedByTier = tierLabels.map((tier) => ({
    tier,
    items: itemsWithAvg
      .filter((item) => item.tier === tier)
      .sort((a, b) => b.avg - a.avg),
  }));

  // Top 3 para el podio
  const top3 = [...itemsWithAvg]
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3);

  return (
    <main className="min-h-dvh bg-black px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-sky-400 text-sm font-medium uppercase tracking-widest mb-1">
            Resultados finales
          </p>
          <h1 className="text-2xl font-bold text-white">{tierlist.name}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {participantCount} participante{participantCount !== 1 ? "s" : ""} rankearon
          </p>
        </div>

        {/* Tiers */}
        <div className="flex flex-col gap-2 mb-4">
          {groupedByTier.map(({ tier, items: tierItems }) => (
            <TierRow
              key={tier}
              tier={tier}
              items={tierItems}
              showAvg
            />
          ))}
        </div>

        {/* Podio */}
        <Podium top3={top3} />

        {/* Tabla de todos los ítems */}
        <div className="mt-8 bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h3 className="font-semibold text-white text-sm">Ranking completo</h3>
          </div>
          <div className="divide-y divide-gray-700">
            {[...itemsWithAvg]
              .sort((a, b) => b.avg - a.avg)
              .map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span className="text-gray-500 text-sm w-5 text-right flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span
                    className="w-7 h-7 rounded text-xs font-bold flex items-center justify-center flex-shrink-0 text-gray-900"
                    style={{ backgroundColor: TIER_COLORS[item.tier] ?? "#6b7280" }}
                  >
                    {item.tier}
                  </span>
                  <span className="flex-1 text-white text-sm">{item.name}</span>
                  <span className="text-gray-400 text-sm font-mono tabular-nums">
                    {item.avg.toFixed(2)}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Volver al inicio */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Crear otra tierlist
          </Link>
        </div>
      </div>
    </main>
  );
}
