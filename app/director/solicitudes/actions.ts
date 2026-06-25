"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Helper: verify the current user is a director_fmk
 */
async function requireDirector() {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData?.user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from("perfiles_usuario")
    .select("rol, user_id")
    .eq("user_id", userData.user.id)
    .single();

  if (!profile || profile.rol !== "director_fmk") {
    throw new Error("No tienes permisos para realizar esta acción");
  }

  return { supabase, userId: userData.user.id, email: userData.user.email ?? "" };
}

/**
 * DIR-08 / DIR-09: Validate a single document.
 * If all documents become 'validado', auto-change solicitud to 'validada'.
 */
export async function validarDocumento(documentoId: string) {
  const { supabase, userId, email } = await requireDirector();

  // Update document status
  const { data: doc, error: docErr } = await supabase
    .from("documentos")
    .update({ estado_validacion: "validado" })
    .eq("id", documentoId)
    .select("solicitud_id")
    .single();

  if (docErr || !doc) throw new Error("Error al validar el documento");

  // Check if all documents for this solicitud are now validated
  const { data: allDocs } = await supabase
    .from("documentos")
    .select("id, estado_validacion")
    .eq("solicitud_id", doc.solicitud_id);

  const allValidated = allDocs && allDocs.length > 0 && allDocs.every(
    (d: any) => d.estado_validacion === "validado"
  );

  if (allValidated) {
    // DIR-08: Auto-approve solicitud when last document is validated
    await supabase
      .from("solicitudes")
      .update({ estado: "validada" })
      .eq("id", doc.solicitud_id);
  }

  // Audit log
  const adminClient = createAdminClient();
  await adminClient.from("audit_log").insert({
    user_id: userId,
    user_email: email,
    action: "validate_document",
    entity_type: "documentos",
    entity_id: documentoId,
    details: {
      solicitud_id: doc.solicitud_id,
      auto_validated: allValidated,
    },
  });

  revalidatePath(`/director/solicitudes/${doc.solicitud_id}`);
  revalidatePath("/director/solicitudes");
  return { success: true, solicitudValidada: allValidated };
}

/**
 * DIR-09 / DIR-10: Reject a document with a specific reason.
 * Changes solicitud status to 'documentacion_incompleta'.
 */
export async function rechazarDocumento(documentoId: string, motivo: string) {
  if (!motivo || motivo.trim().length === 0) {
    throw new Error("Debe indicar un motivo de rechazo");
  }

  const { supabase, userId, email } = await requireDirector();

  const { data: doc, error: docErr } = await supabase
    .from("documentos")
    .update({
      estado_validacion: "rechazado",
      comentarios_revision: motivo.trim(),
    })
    .eq("id", documentoId)
    .select("solicitud_id, tipo")
    .single();

  if (docErr || !doc) throw new Error("Error al rechazar el documento");

  // DIR-09: Change solicitud to documentacion_incompleta
  await supabase
    .from("solicitudes")
    .update({ estado: "documentacion_incompleta" })
    .eq("id", doc.solicitud_id);

  // Audit
  const adminClient = createAdminClient();
  await adminClient.from("audit_log").insert({
    user_id: userId,
    user_email: email,
    action: "reject_document",
    entity_type: "documentos",
    entity_id: documentoId,
    details: {
      solicitud_id: doc.solicitud_id,
      tipo: doc.tipo,
      motivo,
    },
  });

  revalidatePath(`/director/solicitudes/${doc.solicitud_id}`);
  revalidatePath("/director/solicitudes");
  return { success: true };
}

/**
 * DIR-12: Reject a solicitud definitively (e.g., document falsification).
 * Requires a mandatory reason.
 */
export async function rechazarSolicitudDefinitiva(solicitudId: string, motivo: string) {
  if (!motivo || motivo.trim().length === 0) {
    throw new Error("Debe indicar el motivo del rechazo definitivo");
  }

  const { supabase, userId, email } = await requireDirector();

  const { error } = await supabase
    .from("solicitudes")
    .update({ estado: "rechazada" })
    .eq("id", solicitudId);

  if (error) throw new Error("Error al rechazar la solicitud");

  // Audit
  const adminClient = createAdminClient();
  await adminClient.from("audit_log").insert({
    user_id: userId,
    user_email: email,
    action: "reject_solicitud_definitive",
    entity_type: "solicitudes",
    entity_id: solicitudId,
    details: {
      motivo,
      tipo: "falsificacion_documental",
    },
  });

  revalidatePath(`/director/solicitudes/${solicitudId}`);
  revalidatePath("/director/solicitudes");
  return { success: true };
}

/**
 * DIR-13: Validate the firma competente on carnet de cinturón marrón.
 * Checks if the firma field matches an authorized profile type.
 */
export async function validarFirmaCompetente(
  documentoId: string,
  firmaAutorizada: boolean,
  tipoFirmante?: string
) {
  const { supabase, userId, email } = await requireDirector();

  const tiposValidos = [
    "entrenador_nacional",
    "tecnico_deportivo_superior",
    "director_grados",
  ];

  if (!firmaAutorizada || (tipoFirmante && !tiposValidos.includes(tipoFirmante))) {
    // Reject the document if firma is not from an authorized person
    await supabase
      .from("documentos")
      .update({
        estado_validacion: "rechazado",
        comentarios_revision: `Firma no competente. Tipo: ${tipoFirmante || "no especificado"}. Solo se aceptan firmas de: Entrenador Nacional, Técnico Deportivo Superior o Director de Grados.`,
      })
      .eq("id", documentoId);

    // Get solicitud_id for revalidation
    const { data: doc } = await supabase
      .from("documentos")
      .select("solicitud_id")
      .eq("id", documentoId)
      .single();

    if (doc) {
      await supabase
        .from("solicitudes")
        .update({ estado: "documentacion_incompleta" })
        .eq("id", doc.solicitud_id);

      revalidatePath(`/director/solicitudes/${doc.solicitud_id}`);
    }

    // Audit
    const adminClient = createAdminClient();
    await adminClient.from("audit_log").insert({
      user_id: userId,
      user_email: email,
      action: "reject_firma_incompetente",
      entity_type: "documentos",
      entity_id: documentoId,
      details: { tipoFirmante, firmaAutorizada: false },
    });

    revalidatePath("/director/solicitudes");
    return { success: true, firmaValida: false, solicitudValidada: false };
  }

  // Firma is valid — validate the document
  const res = await validarDocumento(documentoId);
  return { success: res.success, firmaValida: true, solicitudValidada: res.solicitudValidada };
}


//  SOLICIRUDES VALIDAS
export async function marcarSolicitudValidada(solicitudId: string) {
  const { supabase, userId, email } = await requireDirector();

  // Verificar que todos los documentos estén validados
  const { data: docs } = await supabase
    .from("documentos")
    .select("id, estado_validacion")
    .eq("solicitud_id", solicitudId);

  const todosValidados = docs && docs.length > 0 &&
    docs.every((d: any) => d.estado_validacion === "validado");

  if (!todosValidados) {
    throw new Error("Aún hay documentos pendientes de validar.");
  }

  const { error } = await supabase
    .from("solicitudes")
    .update({ estado: "validada", updated_at: new Date().toISOString() })
    .eq("id", solicitudId);

  if (error) throw new Error("Error al validar la solicitud.");

  // Audit log
  const adminClient = createAdminClient();
  await adminClient.from("audit_log").insert({
    user_id: userId,
    user_email: email,
    action: "marcar_solicitud_validada",
    entity_type: "solicitudes",
    entity_id: solicitudId,
    details: { manual: true },
  });

  revalidatePath(`/director/solicitudes/${solicitudId}`);
  revalidatePath("/director/solicitudes");
  return { success: true };
}