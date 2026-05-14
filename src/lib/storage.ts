import { createClient } from "@/lib/supabase/client";
import { v4 as uuidv4 } from "uuid";

const BUCKET = "item-images";

export async function uploadItemImage(
  file: File,
  tierslistCode: string
): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${tierslistCode}/${uuidv4()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw new Error(`Error al subir imagen: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
