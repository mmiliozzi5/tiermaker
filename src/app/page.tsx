"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { createClient } from "@/lib/supabase/client";
import {
  getTierlistHistory,
  addToTierlistHistory,
  removeFromTierlistHistory,
  type HistoryEntry,
} from "@/lib/localStorage";

interface HistoryEntryWithStatus extends HistoryEntry {
  status: "open" | "finished";
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { name, code, setName, setCode, hydrated } = useSession();

  const joinParam = searchParams.get("join")?.toUpperCase() ?? "";
  const initialTab = joinParam ? "join" : "create";

  const [tab, setTab] = useState<"create" | "join">(initialTab);
  const [joinCode, setJoinCode] = useState(joinParam);
  const [nameInput, setNameInput] = useState(name);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntryWithStatus[]>([]);

  const nameInputRef = useRef<HTMLInputElement>(null);

  const hasContinue = hydrated && Boolean(name) && Boolean(code);

  useEffect(() => {
    if (hydrated && joinParam) {
      nameInputRef.current?.focus();
    }
  }, [hydrated, joinParam]);

  useEffect(() => {
    if (hydrated && name) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNameInput(name);
    }
  }, [hydrated, name]);

  // Cargar historial y sus estados actuales desde Supabase
  useEffect(() => {
    if (!hydrated) return;
    const localHistory = getTierlistHistory();
    if (localHistory.length === 0) return;

    const supabase = createClient();
    supabase
      .from("tierlists")
      .select("code, status, name")
      .in("code", localHistory.map((h) => h.code))
      .then(({ data }) => {
        const found = new Map((data ?? []).map((t) => [t.code, t]));
        // Eliminar del historial local las tierlists que ya no existen en DB
        localHistory.forEach((h) => {
          if (!found.has(h.code)) removeFromTierlistHistory(h.code);
        });
        setHistory(
          localHistory
            .filter((h) => found.has(h.code))
            .map((h) => ({
              ...h,
              name: found.get(h.code)!.name,
              status: found.get(h.code)!.status as "open" | "finished",
            }))
        );
      });
  }, [hydrated]);

  function handleNameChange(value: string) {
    setNameInput(value);
    setError("");
  }

  function handleCreate() {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setError("Ingresá tu nombre");
      return;
    }
    setName(trimmed);
    router.push("/create");
  }

  async function handleJoin() {
    const trimmedName = nameInput.trim();
    const trimmedCode = joinCode.trim().toUpperCase();

    if (!trimmedName) {
      setError("Ingresá tu nombre");
      return;
    }
    if (trimmedCode.length !== 6) {
      setError("El código debe tener 6 caracteres");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();

    const { data: tierlist, error: tlErr } = await supabase
      .from("tierlists")
      .select("*")
      .eq("code", trimmedCode)
      .single();

    if (tlErr || !tierlist) {
      setError("No encontramos una tierlist con ese código");
      setLoading(false);
      return;
    }

    if (tierlist.status === "finished") {
      setError("Esa tierlist ya terminó");
      setLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from("participants")
      .select("*")
      .eq("tierlist_id", tierlist.id)
      .eq("name", trimmedName)
      .single();

    if (!existing) {
      const { count } = await supabase
        .from("participants")
        .select("*", { count: "exact", head: true })
        .eq("tierlist_id", tierlist.id);

      if ((count ?? 0) >= 20) {
        setError("Esta tierlist ya tiene el máximo de 20 participantes");
        setLoading(false);
        return;
      }

      const { error: insertErr } = await supabase
        .from("participants")
        .insert({ tierlist_id: tierlist.id, name: trimmedName });

      if (insertErr) {
        setError("Error al unirse. Intentá de nuevo.");
        setLoading(false);
        return;
      }
    }

    addToTierlistHistory({ code: trimmedCode, name: tierlist.name, joined_at: new Date().toISOString() });
    setName(trimmedName);
    setCode(trimmedCode);
    router.push(`/${trimmedCode}`);
  }

  function navigateToTierlist(entry: HistoryEntryWithStatus) {
    if (entry.status === "finished") {
      router.push(`/${entry.code}/results`);
    } else {
      router.push(`/${entry.code}`);
    }
  }

  if (!hydrated) return null;

  return (
    <main className="flex flex-col items-center justify-center min-h-dvh px-4 py-8 bg-gray-900">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Tier<span className="text-yellow-400">Maker</span>
          </h1>
          <p className="text-gray-400 text-sm">
            Creá o participá en tierlists colaborativas
          </p>
        </div>

        {/* Banner continuar sesión */}
        {hasContinue && !joinParam && (
          <div className="mb-4 p-3 bg-yellow-900/40 border border-yellow-700 rounded-xl flex items-center justify-between gap-2">
            <p className="text-yellow-300 text-sm">
              Sesión activa como <strong>{name}</strong>
            </p>
            <button
              onClick={() => router.push(`/${code}`)}
              className="text-xs bg-yellow-500 text-gray-900 font-bold px-3 py-1.5 rounded-lg flex-shrink-0 hover:bg-yellow-400 transition-colors"
            >
              Continuar
            </button>
          </div>
        )}

        {/* Card */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">

          {/* Banner informativo cuando viene de un link */}
          {joinParam && (
            <div className="mb-5 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-xl text-center">
              <p className="text-yellow-300 text-sm font-medium">
                Te invitaron a una tierlist
              </p>
              <p className="text-yellow-400 text-xl font-bold tracking-widest mt-1">
                {joinParam}
              </p>
            </div>
          )}

          {/* Nombre */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Tu nombre
            </label>
            <input
              ref={nameInputRef}
              type="text"
              placeholder="Ej: Maxi"
              value={nameInput}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                (tab === "create" ? handleCreate() : handleJoin())
              }
              maxLength={30}
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 text-sm"
            />
          </div>

          {/* Tabs — ocultos si viene de un link directo */}
          {!joinParam && (
            <div className="flex bg-gray-700 rounded-xl p-1 mb-5">
              <button
                onClick={() => { setTab("create"); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === "create"
                    ? "bg-yellow-500 text-gray-900"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Crear tierlist
              </button>
              <button
                onClick={() => { setTab("join"); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === "join"
                    ? "bg-yellow-500 text-gray-900"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Unirme
              </button>
            </div>
          )}

          {/* Crear */}
          {tab === "create" && !joinParam && (
            <button
              onClick={handleCreate}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-3 rounded-xl transition-colors text-sm"
            >
              Crear nueva tierlist →
            </button>
          )}

          {/* Unirse — código pre-cargado si viene de link */}
          {(tab === "join" || joinParam) && (
            <div className="flex flex-col gap-3">
              {!joinParam && (
                <input
                  type="text"
                  placeholder="Código (ej: AB12CD)"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase());
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  maxLength={6}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 text-sm tracking-widest uppercase text-center"
                />
              )}
              <button
                onClick={handleJoin}
                disabled={loading}
                className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-900 font-bold py-3 rounded-xl transition-colors text-sm"
              >
                {loading ? "Uniéndome..." : "Unirme a la tierlist →"}
              </button>
            </div>
          )}

          {error && (
            <p className="mt-3 text-red-400 text-sm text-center">{error}</p>
          )}
        </div>

        {/* Historial de tierlists */}
        {history.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">
              Tierlists anteriores
            </h2>
            <div className="flex flex-col gap-2">
              {history.map((entry) => (
                <button
                  key={entry.code}
                  onClick={() => navigateToTierlist(entry)}
                  className="w-full bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-xl px-4 py-3 flex items-center gap-3 text-left transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{entry.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {entry.code} · {new Date(entry.joined_at).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        entry.status === "finished"
                          ? "bg-green-900/50 text-green-400 border border-green-800"
                          : "bg-yellow-900/50 text-yellow-400 border border-yellow-800"
                      }`}
                    >
                      {entry.status === "finished" ? "Finalizada" : "En curso"}
                    </span>
                    <span className="text-gray-600 text-sm">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
