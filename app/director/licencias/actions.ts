"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getLicenciasPendientes(filtroEstado?: string, filtroCategoria?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("licencias")
    .select(`
      id,
      anio,
      tipo,
      club,
      estado,
      motivo_rechazo,
      documento_url,
      created_at,
      practicantes (
        id,
        nombre,
        apellidos,
        grado_actual
      )
    `)
    .order("created_at", { ascending: false });

  if (filtroEstado && filtroEstado !== "todos") {
    query = query.eq("estado", filtroEstado);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let resultado = data || [];

  // Filtro por categoría
  if (filtroCategoria && filtroCategoria !== "todos") {
    const cinturones = ["Cinturón Blanco", "Cinturón Amarillo", "Cinturón Naranja", "Cinturón Verde", "Cinturón Azul", "Cinturón Marrón"];
    const negros     = ["Cinturón Negro"];
    const danes      = ["1º Dan", "2º Dan", "3º Dan", "4º Dan", "5º Dan", "6º Dan", "7º Dan", "8º Dan", "9º Dan", "10º Dan"];

    resultado = resultado.filter((lic: any) => {
      const grado = lic.practicantes?.grado_actual || "";
      if (filtroCategoria === "color")  return cinturones.includes(grado);
      if (filtroCategoria === "negro")  return negros.includes(grado);
      if (filtroCategoria === "dan")    return danes.includes(grado);
      return true;
    });
  }

  return resultado;
}

export async function aprobarLicencia(licenciaId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("licencias")
    .update({
      estado:         "activa",
      motivo_rechazo: null,
      updated_at:     new Date().toISOString(),
    })
    .eq("id", licenciaId);

  if (error) return { error: error.message };

  revalidatePath("/director/licencias");
  return { success: true };
}

export async function rechazarLicencia(licenciaId: string, motivo: string) {
  if (!motivo.trim()) return { error: "El motivo de rechazo es obligatorio." };

  const supabase = await createClient();

  const { error } = await supabase
    .from("licencias")
    .update({
      estado:         "rechazada",
      motivo_rechazo: motivo.trim(),
      updated_at:     new Date().toISOString(),
    })
    .eq("id", licenciaId);

  if (error) return { error: error.message };

  revalidatePath("/director/licencias");
  return { success: true };
}