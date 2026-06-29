"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getEstilos() {
  const admin = createAdminClient();
  const { data, error } = await admin.from("estilos").select("*").order("nombre", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function createEstilo(nombre: string, descripcion: string) {
  if (!nombre.trim()) return { error: "El nombre es obligatorio." };

  const admin = createAdminClient();
  const { data, error } = await admin.from("estilos").insert({ nombre, descripcion }).select().single();
  if (error) return { error: error.message };

  // Registrar en auditoría (ADM-14)
  const { logAudit } = require("../auditoria/actions");
  await logAudit("CREATE", "estilo", data.id, `Creado estilo de karate: ${nombre}`);

  revalidatePath("/admin/estilos");
  return { success: true };
}

export async function updateEstilo(id: string, nombre: string, descripcion: string) {
  if (!nombre.trim()) return { error: "El nombre es obligatorio." };

  const admin = createAdminClient();
  const { error } = await admin.from("estilos").update({ nombre, descripcion }).eq("id", id);
  if (error) return { error: error.message };

  // Registrar en auditoría (ADM-14)
  const { logAudit } = require("../auditoria/actions");
  await logAudit("UPDATE", "estilo", id, `Actualizado estilo de karate: ${nombre}`);

  revalidatePath("/admin/estilos");
  return { success: true };
}

export async function deleteEstilo(id: string) {
  const admin = createAdminClient();

  // Obtener nombre antes de borrar para el log
  const { data: estilo } = await admin.from("estilos").select("nombre").eq("id", id).single();

  // Verificar que el estilo no tenga practicantes asociados antes de eliminar
  const { count: practicantesCount } = await admin
    .from("practicantes")
    .select("id", { count: "exact", head: true })
    .eq("estilo_id", id);

  if ((practicantesCount ?? 0) > 0) {
    return {
      error: `No se puede eliminar el estilo "${estilo?.nombre || id}" porque tiene ${practicantesCount} practicante(s) asociado(s).`,
    };
  }

  const { error } = await admin.from("estilos").delete().eq("id", id);
  if (error) return { error: error.message };

  // Registrar en auditoría (ADM-14)
  const { logAudit } = require("../auditoria/actions");
  await logAudit("DELETE", "estilo", id, `Eliminado estilo de karate: ${estilo?.nombre || id}`);

  revalidatePath("/admin/estilos");
  return { success: true };
}

