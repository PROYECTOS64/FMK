"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Obtener licencias del aspirante autenticado
export async function getMisLicencias() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: practicante } = await supabase
    .from("practicantes")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!practicante) throw new Error("Practicante no encontrado");

  const { data, error } = await supabase
    .from("licencias")
    .select("id, anio, tipo, club, estado, motivo_rechazo, documento_url, created_at")
    .eq("practicante_id", practicante.id)
    .order("anio", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

// Subir una nueva licencia
export async function subirLicencia(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: practicante } = await supabase
    .from("practicantes")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!practicante) return { error: "Practicante no encontrado" };

  // Verificar límite de 15 licencias
  const { count } = await supabase
    .from("licencias")
    .select("id", { count: "exact" })
    .eq("practicante_id", practicante.id);

  if ((count || 0) >= 15) {
    return { error: "Has alcanzado el límite máximo de 15 licencias." };
  }

  const anio     = parseInt(formData.get("anio") as string);
  const tipo     = formData.get("tipo") as string;
  const club     = formData.get("club") as string || null;
  const archivo  = formData.get("documento") as File;

  // Validar año
  const anioActual = new Date().getFullYear();
  if (!anio || anio < 2000 || anio > anioActual) {
    return { error: `El año debe estar entre 2000 y ${anioActual}.` };
  }

  // Validar archivo
  if (!archivo || archivo.size === 0) {
    return { error: "Debes adjuntar el documento de la licencia." };
  }
  if (archivo.size < 50 * 1024) {
    return { error: "El archivo es demasiado pequeño (mínimo 50 KB)." };
  }
  if (archivo.size > 10 * 1024 * 1024) {
    return { error: "El archivo supera el límite de 10 MB." };
  }

  const tiposPermitidos = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
  if (!tiposPermitidos.includes(archivo.type)) {
    return { error: "Formato no permitido. Usa PDF, JPG o PNG." };
  }

  // Verificar que no exista ya una licencia para ese año
  const { data: existente } = await supabase
    .from("licencias")
    .select("id")
    .eq("practicante_id", practicante.id)
    .eq("anio", anio)
    .single();

  if (existente) {
    return { error: `Ya tienes una licencia registrada para el año ${anio}.` };
  }

  // Subir archivo a Storage
  const ext       = archivo.name.split(".").pop();
  const filePath  = `${practicante.id}/${anio}_${Date.now()}.${ext}`;
  const arrayBuf  = await archivo.arrayBuffer();

  const { error: storageError } = await supabase.storage
    .from("licencias")
    .upload(filePath, arrayBuf, { contentType: archivo.type, upsert: false });

  if (storageError) return { error: `Error al subir el archivo: ${storageError.message}` };

  // Obtener URL pública firmada (privada, firmada por 1 año)
  const { data: urlData } = await supabase.storage
    .from("licencias")
    .createSignedUrl(filePath, 60 * 60 * 24 * 365);

  // Insertar en BD
  const { error: dbError } = await supabase
    .from("licencias")
    .insert({
      practicante_id: practicante.id,
      anio,
      tipo,
      club,
      estado:        "pendiente",
      documento_url: urlData?.signedUrl || filePath,
    });

  if (dbError) return { error: `Error al guardar: ${dbError.message}` };

  revalidatePath("/aspirante/licencias");
  return { success: true };
}

// Reemplazar documento de una licencia rechazada
export async function reemplazarLicencia(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const licenciaId = formData.get("licenciaId") as string;
  const archivo    = formData.get("documento") as File;

  if (!archivo || archivo.size === 0) return { error: "Debes adjuntar un documento." };
  if (archivo.size < 50 * 1024)       return { error: "El archivo es demasiado pequeño (mínimo 50 KB)." };
  if (archivo.size > 10 * 1024 * 1024) return { error: "El archivo supera el límite de 10 MB." };

  const tiposPermitidos = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
  if (!tiposPermitidos.includes(archivo.type)) return { error: "Formato no permitido. Usa PDF, JPG o PNG." };

  const { data: practicante } = await supabase
    .from("practicantes")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!practicante) return { error: "Practicante no encontrado" };

  // Verificar que la licencia pertenece al aspirante y está rechazada
  const { data: licencia } = await supabase
    .from("licencias")
    .select("id, anio, estado")
    .eq("id", licenciaId)
    .eq("practicante_id", practicante.id)
    .single();

  if (!licencia)               return { error: "Licencia no encontrada." };
  if (licencia.estado !== "rechazada") return { error: "Solo puedes reemplazar licencias rechazadas." };

  const ext      = archivo.name.split(".").pop();
  const filePath = `${practicante.id}/${licencia.anio}_${Date.now()}.${ext}`;
  const arrayBuf = await archivo.arrayBuffer();

  const { error: storageError } = await supabase.storage
    .from("licencias")
    .upload(filePath, arrayBuf, { contentType: archivo.type });

  if (storageError) return { error: `Error al subir: ${storageError.message}` };

  const { data: urlData } = await supabase.storage
    .from("licencias")
    .createSignedUrl(filePath, 60 * 60 * 24 * 365);

  const { error: dbError } = await supabase
    .from("licencias")
    .update({
      estado:         "pendiente",
      motivo_rechazo: null,
      documento_url:  urlData?.signedUrl || filePath,
      updated_at:     new Date().toISOString(),
    })
    .eq("id", licenciaId);

  if (dbError) return { error: dbError.message };

  revalidatePath("/aspirante/licencias");
  return { success: true };
}