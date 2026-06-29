"use server";

import { createAdminClient } from "@/lib/supabase/server";

export interface AuditLogFilters {
  fechaDesde?: string;   // ISO date string, e.g. "2025-01-01"
  fechaHasta?: string;   // ISO date string, e.g. "2025-12-31"
  tipoAccion?: string;   // e.g. "CREATE", "UPDATE", "DELETE"
  usuarioId?: string;    // UUID of the user
}

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const admin = createAdminClient();

  let query = admin
    .from("audit_log")
    .select(
      `
        id,
        created_at,
        action,
        entity_type,
        entity_id,
        details,
        user_id,
        user_email,
        perfiles_usuario ( nombre_visible )
      `
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters.fechaDesde) {
    query = query.gte("created_at", filters.fechaDesde);
  }

  if (filters.fechaHasta) {
    // Include the entire day of fechaHasta
    const hasta = new Date(filters.fechaHasta);
    hasta.setDate(hasta.getDate() + 1);
    query = query.lt("created_at", hasta.toISOString());
  }

  if (filters.tipoAccion) {
    query = query.eq("action", filters.tipoAccion);
  }

  if (filters.usuarioId) {
    query = query.eq("user_id", filters.usuarioId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Flatten nombre_visible into the record for easy consumption in the UI
  return (data ?? []).map((log: any) => ({
    ...log,
    nombre_usuario: log.perfiles_usuario?.nombre_visible ?? log.user_email ?? "Sistema",
  }));
}
