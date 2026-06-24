"use server"

import { createAdminClient } from "@/lib/supabase/server"
import { createClient } from "@/lib/supabase/server"

// Firma principal: 6 parámetros (usada desde director/resultados y otros módulos)
export async function logAudit(
  userIdOrAction: string | null,
  userEmailOrEntity: string | null,
  actionOrEntityId: string,
  entityTypeOrDetails: string,
  entityId?: string | null,
  details?: any
) {
  const supabase = createAdminClient()

  let insertData: any

  // Detectar si se llamó con 4 parámetros (forma antigua) o 6 (forma nueva)
  if (entityId === undefined) {
    // Forma antigua: logAudit(action, entityType, entityId, details)
    // userIdOrAction     = action
    // userEmailOrEntity  = entityType
    // actionOrEntityId   = entityId
    // entityTypeOrDetails = details (mensaje)

    // Obtener usuario actual para enriquecer el log
    let currentUserId: string | null = null
    let currentEmail: string | null = null
    try {
      const client = await createClient()
      const { data } = await client.auth.getUser()
      currentUserId = data?.user?.id ?? null
      currentEmail  = data?.user?.email ?? null
    } catch {
      // Si no hay sesión activa (ej: service role), se deja null
    }

    insertData = {
      user_id:     currentUserId,
      user_email:  currentEmail,
      action:      userIdOrAction,
      entity_type: userEmailOrEntity,
      entity_id:   actionOrEntityId,
      details:     { mensaje: entityTypeOrDetails }
    }
  } else {
    // Forma nueva: logAudit(userId, userEmail, action, entityType, entityId, details)
    insertData = {
      user_id:     userIdOrAction,
      user_email:  userEmailOrEntity,
      action:      actionOrEntityId,
      entity_type: entityTypeOrDetails,
      entity_id:   entityId,
      details:     typeof details === "object" ? details : { mensaje: details }
    }
  }

  await supabase.from("audit_log").insert(insertData)
}