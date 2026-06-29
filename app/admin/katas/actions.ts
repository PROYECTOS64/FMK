"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getKatas() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("katas")
    .select(`
      id,
      nombre,
      nivel,
      descripcion,
      video_url,
      estilo_id,
      estilos (nombre)
    `)
    .order("nombre", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function createKata(nombre: string, estiloId: string, nivel: "básico" | "superior", descripcion: string, videoUrl: string) {
  if (!nombre.trim() || !estiloId) return { error: "El nombre y el estilo son obligatorios." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("katas")
    .insert({ nombre, estilo_id: estiloId, nivel, descripcion, video_url: videoUrl })
    .select()
    .single();

  if (error) return { error: error.message };

  // Registrar auditoría en BD
  const { logAudit } = require("../auditoria/actions");
  await logAudit("CREATE", "kata", data.id, `Creado kata: ${nombre} (${nivel})`);

  revalidatePath("/admin/katas");
  return { success: true };
}

export async function updateKata(id: string, nombre: string, estiloId: string, nivel: "básico" | "superior", descripcion: string, videoUrl: string) {
  if (!nombre.trim() || !estiloId) return { error: "El nombre y el estilo son obligatorios." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("katas")
    .update({ nombre, estilo_id: estiloId, nivel, descripcion, video_url: videoUrl })
    .eq("id", id);

  if (error) return { error: error.message };

  // Registrar auditoría en BD
  const { logAudit } = require("../auditoria/actions");
  await logAudit("UPDATE", "kata", id, `Actualizado kata: ${nombre}`);

  revalidatePath("/admin/katas");
  return { success: true };
}

export async function deleteKata(id: string) {
  const admin = createAdminClient();
  const { data: kata } = await admin.from("katas").select("nombre").eq("id", id).single();

  // Verificar que el kata no tenga resultados asociados antes de eliminar
  const { count: resultadosCount } = await admin
    .from("resultados")
    .select("id", { count: "exact", head: true })
    .eq("kata_id", id);

  if ((resultadosCount ?? 0) > 0) {
    return {
      error: `No se puede eliminar el kata "${kata?.nombre || id}" porque tiene ${resultadosCount} resultado(s) de examen asociado(s).`,
    };
  }

  const { error } = await admin.from("katas").delete().eq("id", id);
  if (error) return { error: error.message };

  // Registrar auditoría en BD
  const { logAudit } = require("../auditoria/actions");
  await logAudit("DELETE", "kata", id, `Eliminado kata: ${kata?.nombre || id}`);

  revalidatePath("/admin/katas");
  return { success: true };
}

