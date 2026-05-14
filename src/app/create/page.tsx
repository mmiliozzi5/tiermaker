"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { createClient } from "@/lib/supabase/client";
import { uploadItemImage } from "@/lib/storage";
import { generateCode } from "@/lib/codes";
import { TIER_COLORS, TIER_LABELS } from "@/lib/scoring";
import { addToTierlistHistory } from "@/lib/localStorage";
import type { TierFormat, RankingMethod } from "@/types";

interface LocalItem {
  id: string;
  name: string;
  imageFile: File | null;
  imagePreview: string | null;
  uploading: boolean;
  imageUrl: string | null;
}

type Step = 1 | 2 | 3 | 4;

export default function CreatePage() {
  const router = useRouter();
  const { name, setCode, hydrated } = useSession();

  const [step, setStep] = useState<Step>(1);
  const [tierlistName, setTierlistName] = useState("");
  const [tierFormat, setTierFormat] = useState<TierFormat>("letters");
  const [rankingMethod, setRankingMethod] = useState<RankingMethod>("score");
  const [items, setItems] = useState<LocalItem[]>([]);
  const [itemName, setItemName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingItemRef = useRef<string>("");

  useEffect(() => {
    if (hydrated && !name) {
      router.push("/");
    }
  }, [hydrated, name, router]);

  function handleStep1() {
    if (!tierlistName.trim()) {
      setError("Ingresá un nombre para la tierlist");
      return;
    }
    setError("");
    setStep(2);
  }

  function handleStep2(format: TierFormat) {
    setTierFormat(format);
    setStep(3);
  }

  function handleStep3(method: RankingMethod) {
    setRankingMethod(method);
    setStep(4);
  }

  function handleAddItem() {
    if (!itemName.trim()) {
      setError("Ingresá un nombre para el ítem");
      return;
    }
    if (items.length >= 20) {
      setError("Máximo 20 ítems");
      return;
    }
    const newItem: LocalItem = {
      id: crypto.randomUUID(),
      name: itemName.trim(),
      imageFile: null,
      imagePreview: null,
      uploading: false,
      imageUrl: null,
    };
    setItems((prev) => [...prev, newItem]);
    setItemName("");
    setError("");
  }

  function handleImageClick(itemId: string) {
    pendingItemRef.current = itemId;
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const itemId = pendingItemRef.current;
    if (!file || !itemId) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no puede superar 5 MB");
      return;
    }

    const preview = URL.createObjectURL(file);
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? { ...it, imageFile: file, imagePreview: preview, uploading: true }
          : it
      )
    );

    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId ? { ...it, uploading: false } : it
      )
    );

    e.target.value = "";
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  async function handleCreate() {
    if (items.length === 0) {
      setError("Agregá al menos un ítem");
      return;
    }

    setSubmitting(true);
    setError("");

    const supabase = createClient();
    let code = generateCode();

    let attempts = 0;
    while (attempts < 5) {
      const { data } = await supabase
        .from("tierlists")
        .select("id")
        .eq("code", code)
        .single();
      if (!data) break;
      code = generateCode();
      attempts++;
    }

    const { data: tierlist, error: tlErr } = await supabase
      .from("tierlists")
      .insert({
        name: tierlistName.trim(),
        code,
        host_name: name,
        tier_format: tierFormat,
        ranking_method: rankingMethod,
        status: "open",
      })
      .select()
      .single();

    if (tlErr || !tierlist) {
      setError("Error al crear la tierlist. Intentá de nuevo.");
      setSubmitting(false);
      return;
    }

    const itemsToInsert = await Promise.all(
      items.map(async (item, idx) => {
        let imageUrl: string | null = null;
        if (item.imageFile) {
          try {
            imageUrl = await uploadItemImage(item.imageFile, code);
          } catch {
            // ignorar error de imagen individual
          }
        }
        return {
          tierlist_id: tierlist.id,
          name: item.name,
          image_url: imageUrl,
          display_order: idx,
        };
      })
    );

    const { error: itemsErr } = await supabase.from("items").insert(itemsToInsert);

    if (itemsErr) {
      setError("Error al guardar los ítems. Intentá de nuevo.");
      setSubmitting(false);
      return;
    }

    await supabase.from("participants").insert({
      tierlist_id: tierlist.id,
      name,
    });

    addToTierlistHistory({ code, name: tierlistName.trim(), joined_at: new Date().toISOString() });
    setCode(code);
    router.push(`/${code}`);
  }

  if (!hydrated) return null;

  return (
    <main className="min-h-dvh bg-black px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => (step > 1 ? setStep((step - 1) as Step) : router.push("/"))}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Volver
          </button>
          <div className="flex-1 flex gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  s <= step ? "bg-sky-400" : "bg-gray-800"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Nombre */}
        {step === 1 && (
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h2 className="text-xl font-bold text-white mb-1">¿Cómo se llama tu tierlist?</h2>
            <p className="text-gray-400 text-sm mb-5">Dale un nombre descriptivo</p>
            <input
              type="text"
              placeholder="Ej: Mejores películas del 2024"
              value={tierlistName}
              onChange={(e) => { setTierlistName(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleStep1()}
              maxLength={60}
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 text-base mb-4"
            />
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <button
              onClick={handleStep1}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-colors text-base"
            >
              Siguiente →
            </button>
          </div>
        )}

        {/* Step 2: Formato de tiers */}
        {step === 2 && (
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h2 className="text-xl font-bold text-white mb-1">Formato de tiers</h2>
            <p className="text-gray-400 text-sm mb-5">¿Cómo querés mostrar los tiers?</p>
            <div className="flex flex-col gap-3">
              {(["letters", "numbers"] as TierFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => handleStep2(fmt)}
                  className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-sky-400 rounded-xl p-4 text-left transition-all"
                >
                  <p className="font-semibold text-white mb-2">
                    {fmt === "letters" ? "Letras (S / A / B / C / D)" : "Números (1 / 2 / 3 / 4 / 5)"}
                  </p>
                  <div className="flex gap-1.5">
                    {TIER_LABELS[fmt].map((label) => (
                      <span
                        key={label}
                        className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-gray-900"
                        style={{ backgroundColor: TIER_COLORS[label] }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Método de ranking */}
        {step === 3 && (
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h2 className="text-xl font-bold text-white mb-1">Método de ranking</h2>
            <p className="text-gray-400 text-sm mb-5">¿Cómo rankearán los participantes?</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleStep3("score")}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-sky-400 rounded-xl p-4 text-left transition-all"
              >
                <p className="font-semibold text-white mb-1">Puntaje (0 a 10)</p>
                <p className="text-gray-400 text-sm">Cada participante le pone una nota del 0 al 10 a cada ítem (ej: 7,5)</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-gray-300">Jurassic Park</span>
                  <div className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sky-400 text-sm font-mono">8,5</div>
                </div>
              </button>
              <button
                onClick={() => handleStep3("position")}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-sky-400 rounded-xl p-4 text-left transition-all"
              >
                <p className="font-semibold text-white mb-1">Posicionamiento</p>
                <p className="text-gray-400 text-sm">Cada participante ordena los ítems de mejor a peor arrastrándolos</p>
                <div className="mt-3 flex flex-col gap-1">
                  {["1° El Padrino", "2° Pulp Fiction", "3° Matrix"].map((ex) => (
                    <div key={ex} className="flex items-center gap-2 bg-gray-700 rounded px-2 py-1">
                      <span className="text-gray-400 text-xs">⠿</span>
                      <span className="text-gray-300 text-xs">{ex}</span>
                    </div>
                  ))}
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Agregar ítems */}
        {step === 4 && (
          <div>
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-4">
              <h2 className="text-xl font-bold text-white mb-1">Agregá los ítems</h2>
              <p className="text-gray-400 text-sm mb-5">
                {items.length}/20 ítems — cada ítem puede tener una foto
              </p>

              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Nombre del ítem"
                  value={itemName}
                  onChange={(e) => { setItemName(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  maxLength={40}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 text-base"
                />
                <button
                  onClick={handleAddItem}
                  disabled={items.length >= 20}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold px-4 py-3 rounded-xl transition-colors text-sm flex-shrink-0"
                >
                  + Agregar
                </button>
              </div>
              {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
            </div>

            {/* Lista de ítems */}
            {items.length > 0 && (
              <div className="flex flex-col gap-2 mb-4">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3"
                  >
                    <span className="text-gray-500 text-sm w-5 text-center flex-shrink-0">
                      {idx + 1}
                    </span>

                    <button
                      onClick={() => handleImageClick(item.id)}
                      className="w-12 h-12 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 flex items-center justify-center border border-dashed border-gray-700 hover:border-sky-400 transition-colors"
                      title="Agregar foto"
                    >
                      {item.imagePreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imagePreview}
                          alt={item.name}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <span className="text-gray-500 text-lg">📷</span>
                      )}
                    </button>

                    <span className="flex-1 text-white text-sm">{item.name}</span>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              onClick={handleCreate}
              disabled={submitting || items.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold py-4 rounded-xl transition-colors text-base"
            >
              {submitting ? "Creando tierlist..." : `Crear tierlist con ${items.length} ítem${items.length !== 1 ? "s" : ""} →`}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
