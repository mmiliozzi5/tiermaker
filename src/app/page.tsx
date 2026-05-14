"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { createClient } from "@/lib/supabase/client";

export default function HomePage() {
  const router = useRouter();
  const { name, code, setName, setCode, hydrated } = useSession();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [joinCode, setJoinCode] = useState("");
  const [nameInput, setNameInput] = useState(name);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hasContinue = hydrated && Boolean(name) && Boolean(code);

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

    setName(trimmedName);
    setCode(trimmedCode);
    router.push(`/${trimmedCode}`);
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
        {hasContinue && (
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
          {/* Nombre */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Tu nombre
            </label>
            <input
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

          {/* Tabs */}
          <div className="flex bg-gray-700 rounded-xl p-1 mb-5">
            <button
              onClick={() => {
                setTab("create");
                setError("");
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === "create"
                  ? "bg-yellow-500 text-gray-900"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Crear tierlist
            </button>
            <button
              onClick={() => {
                setTab("join");
                setError("");
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === "join"
                  ? "bg-yellow-500 text-gray-900"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Unirme
            </button>
          </div>

          {tab === "create" && (
            <button
              onClick={handleCreate}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-3 rounded-xl transition-colors text-sm"
            >
              Crear nueva tierlist →
            </button>
          )}

          {tab === "join" && (
            <div className="flex flex-col gap-3">
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
              <button
                onClick={handleJoin}
                disabled={loading}
                className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-900 font-bold py-3 rounded-xl transition-colors text-sm"
              >
                {loading ? "Uniéndome..." : "Unirme →"}
              </button>
            </div>
          )}

          {error && (
            <p className="mt-3 text-red-400 text-sm text-center">{error}</p>
          )}
        </div>
      </div>
    </main>
  );
}
