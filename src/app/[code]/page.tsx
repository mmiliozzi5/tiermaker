"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { useRealtimeParticipants } from "@/hooks/useRealtimeParticipants";
import { ParticipantStatus } from "@/components/ParticipantStatus";
import { createClient } from "@/lib/supabase/client";
import type { Tierlist, Participant } from "@/types";

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { name, setCode, hydrated } = useSession();

  const [tierlist, setTierlist] = useState<Tierlist | null>(null);
  const [initialParticipants, setInitialParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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

    const { data: parts } = await supabase
      .from("participants")
      .select("*")
      .eq("tierlist_id", tl.id)
      .order("created_at", { ascending: true });

    const me = (parts ?? []).find(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );

    if (!me) {
      router.push(`/?join=${upperCode}`);
      return;
    }

    setTierlist(tl);
    setInitialParticipants(parts ?? []);
    setCode(upperCode);
    setLoading(false);
  }, [name, router, upperCode, setCode]);

  useEffect(() => {
    if (!hydrated) return;
    if (!name) {
      router.push(`/?join=${upperCode}`);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [hydrated, name, loadData, router, upperCode]);

  const { participants, tierlistStatus } = useRealtimeParticipants(
    tierlist?.id ?? "",
    initialParticipants,
    tierlist?.status ?? "open"
  );

  const isHost = tierlist?.host_name.toLowerCase() === name.toLowerCase();
  const allConfirmed =
    participants.length > 0 &&
    participants.every((p) => p.status === "confirmed");
  const myStatus = participants.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  )?.status;

  useEffect(() => {
    if (tierlistStatus === "finished" || allConfirmed) {
      router.push(`/${upperCode}/results`);
    }
  }, [tierlistStatus, allConfirmed, upperCode, router]);

  function copyCode() {
    navigator.clipboard.writeText(upperCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    const url = `${window.location.origin}/${upperCode}`;
    const msg = encodeURIComponent(
      `Unite a mi TierMaker! Código: *${upperCode}* — Entrá acá: ${url}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  if (!hydrated || loading) {
    return (
      <div className="min-h-dvh bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Cargando...</div>
      </div>
    );
  }

  if (!tierlist) return null;

  return (
    <main className="min-h-dvh bg-gray-900 px-4 py-8">
      <div className="max-w-md mx-auto flex flex-col gap-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">{tierlist.name}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {isHost ? "Sos el host de esta tierlist" : `Te uniste como ${name}`}
          </p>
        </div>

        {/* Código + Compartir */}
        <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-2 text-center">
            Código de la tierlist
          </p>
          <p className="text-4xl font-bold text-yellow-400 text-center tracking-widest mb-4">
            {upperCode}
          </p>
          <div className="flex gap-2">
            <button
              onClick={copyCode}
              className="flex-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              {copied ? "✓ Copiado" : "Copiar código"}
            </button>
            <button
              onClick={shareWhatsApp}
              className="flex-1 bg-green-700 hover:bg-green-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <span>📱</span> WhatsApp
            </button>
          </div>
        </div>

        {/* Info de la tierlist */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex gap-4 text-sm">
            <div className="flex-1 text-center">
              <p className="text-gray-400 text-xs mb-1">Formato</p>
              <p className="text-white font-medium">
                {tierlist.tier_format === "letters" ? "S / A / B / C / D" : "1 / 2 / 3 / 4 / 5"}
              </p>
            </div>
            <div className="w-px bg-gray-700" />
            <div className="flex-1 text-center">
              <p className="text-gray-400 text-xs mb-1">Método</p>
              <p className="text-white font-medium">
                {tierlist.ranking_method === "score" ? "Puntaje 0-10" : "Posicionamiento"}
              </p>
            </div>
          </div>
        </div>

        {/* Estado de participantes */}
        <ParticipantStatus participants={participants} />

        {/* Acciones */}
        <div className="flex flex-col gap-3">
          {myStatus === "ranking" && (
            <button
              onClick={() => router.push(`/${upperCode}/rank`)}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-3 rounded-xl transition-colors"
            >
              Empezar a rankear →
            </button>
          )}

          {myStatus === "confirmed" && !allConfirmed && (
            <div className="text-center py-3 bg-green-900/30 border border-green-700 rounded-xl">
              <p className="text-green-400 font-medium">✓ Ya confirmaste tu ranking</p>
              <p className="text-gray-400 text-sm mt-1">Esperando que terminen los demás...</p>
            </div>
          )}

          {allConfirmed && (
            <button
              onClick={() => router.push(`/${upperCode}/results`)}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-3 rounded-xl transition-colors"
            >
              Ver resultados 🏆
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
