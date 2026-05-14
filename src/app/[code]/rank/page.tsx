"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { ScoreInput } from "@/components/ScoreInput";
import { PositionSorter } from "@/components/PositionSorter";
import { createClient } from "@/lib/supabase/client";
import { positionToScore } from "@/lib/scoring";
import type { Tierlist, Item, Participant } from "@/types";

export default function RankPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { name, hydrated } = useSession();

  const [tierlist, setTierlist] = useState<Tierlist | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [scores, setScores] = useState<Record<string, string>>({});
  const [orderedItems, setOrderedItems] = useState<Item[]>([]);

  const upperCode = code.toUpperCase();

  const loadData = useCallback(async () => {
    if (!name) {
      router.push("/");
      return;
    }
    const supabase = createClient();

    const { data: tl } = await supabase
      .from("tierlists")
      .select("*")
      .eq("code", upperCode)
      .single();

    if (!tl) {
      router.push("/");
      return;
    }

    if (tl.status === "finished") {
      router.push(`/${upperCode}/results`);
      return;
    }

    const { data: part } = await supabase
      .from("participants")
      .select("*")
      .eq("tierlist_id", tl.id)
      .eq("name", name)
      .single();

    if (!part) {
      router.push("/");
      return;
    }

    if (part.status === "confirmed") {
      router.push(`/${upperCode}`);
      return;
    }

    const { data: its } = await supabase
      .from("items")
      .select("*")
      .eq("tierlist_id", tl.id)
      .order("display_order", { ascending: true });

    const { data: existingRankings } = await supabase
      .from("rankings")
      .select("*")
      .eq("participant_id", part.id);

    const itemsList = its ?? [];

    if (tl.ranking_method === "score") {
      const savedScores: Record<string, string> = {};
      (existingRankings ?? []).forEach((r) => {
        if (r.score !== null) {
          savedScores[r.item_id] = String(r.score);
        }
      });
      setScores(savedScores);
    } else {
      const savedPositions = new Map<string, number>();
      (existingRankings ?? []).forEach((r) => {
        if (r.position !== null) {
          savedPositions.set(r.item_id, r.position);
        }
      });

      if (savedPositions.size > 0) {
        const sorted = [...itemsList].sort((a, b) => {
          const pa = savedPositions.get(a.id) ?? 999;
          const pb = savedPositions.get(b.id) ?? 999;
          return pa - pb;
        });
        setOrderedItems(sorted);
      } else {
        setOrderedItems(itemsList);
      }
    }

    setTierlist(tl);
    setItems(itemsList);
    setParticipant(part);
    setLoading(false);
  }, [name, router, upperCode]);

  useEffect(() => {
    if (!hydrated) return;
    if (!name) {
      router.push("/");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [hydrated, name, loadData, router]);

  const saveProgress = useCallback(async () => {
    if (!tierlist || !participant) return;
    const supabase = createClient();

    if (tierlist.ranking_method === "score") {
      const records = Object.entries(scores)
        .filter(([, v]) => v !== "")
        .map(([itemId, v]) => ({
          participant_id: participant.id,
          item_id: itemId,
          score: parseFloat(v),
          position: null,
        }));

      if (records.length > 0) {
        await supabase.from("rankings").upsert(records, {
          onConflict: "participant_id,item_id",
        });
      }
    } else {
      const records = orderedItems.map((item, idx) => ({
        participant_id: participant.id,
        item_id: item.id,
        score: null,
        position: idx,
      }));

      await supabase.from("rankings").upsert(records, {
        onConflict: "participant_id,item_id",
      });
    }
  }, [tierlist, participant, scores, orderedItems]);

  async function handleConfirm() {
    if (!tierlist || !participant) return;
    setError("");

    if (tierlist.ranking_method === "score") {
      const missing = items.filter(
        (item) => scores[item.id] === undefined || scores[item.id] === ""
      );
      if (missing.length > 0) {
        setError(`Falta puntuar ${missing.length} ítem${missing.length > 1 ? "s" : ""}`);
        return;
      }
      const invalid = items.filter((item) => {
        const v = parseFloat(scores[item.id]);
        return isNaN(v) || v < 0 || v > 10;
      });
      if (invalid.length > 0) {
        setError("Los puntajes deben estar entre 0 y 10");
        return;
      }
    }

    setSubmitting(true);
    const supabase = createClient();

    let records: Array<{
      participant_id: string;
      item_id: string;
      score: number | null;
      position: number | null;
    }>;

    if (tierlist.ranking_method === "score") {
      records = items.map((item) => ({
        participant_id: participant.id,
        item_id: item.id,
        score: parseFloat(scores[item.id]),
        position: null,
      }));
    } else {
      records = orderedItems.map((item, idx) => ({
        participant_id: participant.id,
        item_id: item.id,
        score: positionToScore(idx, orderedItems.length),
        position: idx,
      }));
    }

    const { error: rankErr } = await supabase.from("rankings").upsert(records, {
      onConflict: "participant_id,item_id",
    });

    if (rankErr) {
      setError("Error al guardar el ranking. Intentá de nuevo.");
      setSubmitting(false);
      return;
    }

    await supabase
      .from("participants")
      .update({ status: "confirmed" })
      .eq("id", participant.id);

    const { data: allParts } = await supabase
      .from("participants")
      .select("status")
      .eq("tierlist_id", tierlist.id);

    const allDone = (allParts ?? []).every((p) => p.status === "confirmed");
    if (allDone) {
      await supabase
        .from("tierlists")
        .update({ status: "finished" })
        .eq("id", tierlist.id);

      router.push(`/${upperCode}/results`);
    } else {
      router.push(`/${upperCode}`);
    }
  }

  if (!hydrated || loading) {
    return (
      <div className="min-h-dvh bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Cargando...</div>
      </div>
    );
  }

  if (!tierlist || !participant) return null;

  const isScoreMethod = tierlist.ranking_method === "score";
  const scoredCount = isScoreMethod
    ? items.filter((item) => scores[item.id] !== undefined && scores[item.id] !== "").length
    : items.length;

  return (
    <main className="min-h-dvh bg-gray-900 px-4 py-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-5">
          <button
            onClick={() => {
              saveProgress();
              router.push(`/${upperCode}`);
            }}
            className="text-gray-400 hover:text-white text-sm transition-colors mb-3 block"
          >
            ← Volver
          </button>
          <h1 className="text-xl font-bold text-white">{tierlist.name}</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {isScoreMethod
              ? `Puntaje: ${scoredCount}/${items.length} puntuados`
              : "Arrastrá del mejor al peor"}
          </p>
        </div>

        {isScoreMethod ? (
          <ScoreInput
            items={items}
            values={scores}
            onChange={(itemId, value) => {
              setScores((prev) => ({ ...prev, [itemId]: value }));
              setError("");
            }}
          />
        ) : (
          <PositionSorter items={orderedItems} onChange={setOrderedItems} />
        )}

        {error && (
          <p className="mt-4 text-red-400 text-sm text-center">{error}</p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-900 font-bold py-3.5 rounded-xl transition-colors"
          >
            {submitting ? "Confirmando..." : "Confirmar ranking ✓"}
          </button>
          <p className="text-gray-500 text-xs text-center">
            Tu progreso se guarda automáticamente
          </p>
        </div>
      </div>
    </main>
  );
}
