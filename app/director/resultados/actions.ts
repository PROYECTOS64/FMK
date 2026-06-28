"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Helper para verificar que el usuario es director_fmk
 */
async function requireDirector() {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData?.user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from("perfiles_usuario")
    .select("rol")
    .eq("user_id", userData.user.id)
    .single();

  if (!profile || profile.rol !== "director_fmk") {
    throw new Error("No tienes permisos para realizar esta acción");
  }

  return { supabase, userId: userData.user.id, email: userData.user.email ?? "" };
}

/**
 * Bitácora de Auditoría local simplificada
 */
async function logAuditLocal(
  userId: string,
  userEmail: string,
  action: string,
  entityType: string,
  entityId: string,
  details: any
) {
  const adminClient = createAdminClient();
  await adminClient.from("audit_log").insert({
    user_id: userId,
    user_email: userEmail,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: typeof details === "object" ? JSON.stringify(details) : details,
  });
}

/**
 * DIR-14 a DIR-18: Constitución e Inscripción del Tribunal
 */
export async function guardarTribunal(
  convocatoriaId: string,
  juecesIds: string[],
  arbitroShiaiId?: string
) {
  const { supabase, userId, email } = await requireDirector();

  // DIR-16: Validar que todos los jueces tengan un diploma vigente
  if (juecesIds.length > 0) {
    const { data: juecesInfo } = await supabase
      .from("jueces")
      .select("id, diploma, fecha_obtencion_diploma")
      .in("id", juecesIds);

    const validJueces = juecesInfo || [];
    for (const jid of juecesIds) {
      const match = validJueces.find((v) => v.id === jid);
      if (!match || !match.diploma || !match.fecha_obtencion_diploma) {
        throw new Error(`El juez seleccionado con ID ${jid} no posee un diploma FMK registrado o vigente.`);
      }
    }
  }

  // DIR-14 / DIR-15: Verificar número impar de jueces
  const totalJueces = juecesIds.length + (arbitroShiaiId ? 1 : 0);
  const esImpar = totalJueces % 2 !== 0;

  // Buscar o crear el tribunal asociado a la convocatoria
  let { data: tribunal } = await supabase
    .from("tribunales")
    .select("id")
    .eq("convocatoria_id", convocatoriaId)
    .maybeSingle();

  if (!tribunal) {
    const { data: newTribunal, error: insErr } = await supabase
      .from("tribunales")
      .insert({ convocatoria_id: convocatoriaId })
      .select("id")
      .single();

    if (insErr || !newTribunal) throw new Error("Error al crear tribunal");
    tribunal = newTribunal;
  }

  // Eliminar jueces previos asignados a este tribunal (DIR-18: Modificar composición)
  await supabase.from("tribunal_jueces").delete().eq("tribunal_id", tribunal.id);

  // Insertar nuevos jueces
  const insertData = juecesIds.map((jid) => ({
    tribunal_id: tribunal.id,
    juez_id: jid,
    rol: "juez",
  }));

  // DIR-17: Insertar árbitro de Shiai Kumite si existe
  if (arbitroShiaiId) {
    insertData.push({
      tribunal_id: tribunal.id,
      juez_id: arbitroShiaiId,
      rol: "arbitro_shiai_kumite",
    });
  }

  if (insertData.length > 0) {
    const { error: insJuecesErr } = await supabase
      .from("tribunal_jueces")
      .insert(insertData);
    if (insJuecesErr) throw new Error("Error al asignar jueces");
  }

  await logAuditLocal(
    userId,
    email,
    "guardar_tribunal",
    "tribunales",
    tribunal.id,
    { convocatoria_id: convocatoriaId, total_jueces: totalJueces, es_impar: esImpar }
  );

  revalidatePath(`/director/convocatorias/${convocatoriaId}`);
  return { success: true, advertenciaPar: !esImpar };
}

/**
 * DIR-19 a DIR-25: Registro de Calificaciones
 */
export async function registrarResultado(
  solicitudId: string,
  bloque: "comun" | "especifico",
  componente: string,
  calificacion: "apto" | "no_apto",
  comentarios?: string,
  porcentajeVotosFavor?: number // DIR-23
) {
  const { supabase, userId, email } = await requireDirector();

  // Validaciones previas de la solicitud
  const { data: sol } = await supabase
    .from("solicitudes")
    .select("grado_solicitado, estado")
    .eq("id", solicitudId)
    .single();

  if (!sol) throw new Error("Solicitud no encontrada");

  // DIR-21: Si es Bloque Específico, validar que el Bloque Común esté en 'apto'
  if (bloque === "especifico") {
    const { data: resultComun } = await supabase
      .from("resultados")
      .select("calificacion")
      .eq("solicitud_id", solicitudId)
      .eq("bloque", "comun")
      .maybeSingle();

    if (!resultComun || resultComun.calificacion !== "apto") {
      throw new Error("El Bloque Común debe registrarse como Apto antes de calificar el Bloque Específico.");
    }
  }

  // DIR-23: Validación de 80% de votos favorables de los jueces para 5.º Dan o superior en el Bloque Común
  const altoGrado = ["5º Dan", "6º Dan", "7º Dan", "8º Dan", "9º Dan", "10º Dan"].includes(sol.grado_solicitado);
  if (bloque === "comun" && altoGrado && calificacion === "apto") {
    if (porcentajeVotosFavor === undefined || porcentajeVotosFavor < 80) {
      throw new Error("Para grados de 5.º Dan o superior, se requiere la confirmación de al menos un 80% de votos favorables de los jueces del tribunal.");
    }
  }

  // Registrar resultado en la tabla
  const { error: resErr } = await supabase.from("resultados").upsert(
    {
      solicitud_id: solicitudId,
      bloque,
      componente,
      calificacion,
      comentarios: comentarios || "",
      estado_definitivo: false,
    },
    { onConflict: "solicitud_id,bloque,componente" }
  );

  if (resErr) {
    console.error("Error upserting result:", resErr);
    throw new Error("Error al registrar la calificación.");
  }

  await logAuditLocal(userId, email, "registrar_calificacion", "resultados", solicitudId, {
    bloque,
    componente,
    calificacion,
    altoGrado,
    porcentajeVotosFavor,
  });

  return { success: true };
}

/**
 * DIR-26: Publicar resultados provisionalmente
 */
export async function publicarResultadosProvisionales(convocatoriaId: string) {
  const { supabase, userId, email } = await requireDirector();

  const { error } = await supabase
    .from("convocatorias")
    .update({ estado: "en_curso" }) // en_curso representa resultados provisionales cargados
    .eq("id", convocatoriaId);

  if (error) throw new Error("Error al publicar resultados provisionales");

  // Create notifications for all aspirantes in this convocatoria
  const { data: solicitudes } = await supabase
    .from("solicitudes")
    .select("practicantes(user_id)")
    .eq("convocatoria_id", convocatoriaId) as any;

  if (solicitudes && solicitudes.length > 0) {
    const adminClient = createAdminClient();
    const notifications = solicitudes
      .filter((s: any) => s.practicantes?.user_id)
      .map((s: any) => ({
        user_id: s.practicantes.user_id,
        titulo: "Resultados Provisionales Publicados",
        mensaje: "Se han publicado los resultados provisionales de tu convocatoria.",
        tipo: "resultado",
        enlace: "/aspirante/resultado",
      }));
    if (notifications.length > 0) {
      await adminClient.from("notificaciones").insert(notifications);
    }
  }

  await logAuditLocal(userId, email, "publicar_resultados_provisionales", "convocatorias", convocatoriaId, {});
  revalidatePath(`/director/resultados`);
  return { success: true };
}

/**
 * DIR-27 y DIR-28: Generar y Firmar Acta Oficial
 */
export async function generarActaOficial(convocatoriaId: string) {
  const { supabase, userId, email } = await requireDirector();

  // Obtener todas las solicitudes de la convocatoria
  const { data: solicitudes } = await supabase
    .from("solicitudes")
    .select("id, practicante_id, grado_solicitado, practicantes(user_id, nombre, apellidos)")
    .eq("convocatoria_id", convocatoriaId) as any;

  if (!solicitudes || solicitudes.length === 0) {
    throw new Error("No hay solicitudes vinculadas a esta convocatoria.");
  }

  const adminClient = createAdminClient();

  // ── Validación previa: todos deben tener B. Común calificado ──
  const sinCalificar: string[] = [];
  for (const sol of solicitudes) {
    const { data: resVal } = await adminClient
      .from("resultados")
      .select("bloque, calificacion")
      .eq("solicitud_id", sol.id);
    const comunVal = (resVal || []).find((r: any) => r.bloque === "comun")?.calificacion;
    if (!comunVal) {
      const pract = (sol as any).practicantes;
      sinCalificar.push(pract ? `${pract.nombre ?? ""} ${pract.apellidos ?? ""}`.trim() : sol.id);
    }
  }
  if (sinCalificar.length > 0) {
    throw new Error(
      `No se puede firmar el acta. Los siguientes aspirantes no tienen el Bloque Común calificado: ${sinCalificar.join(", ")}. Registra todas las calificaciones antes de firmar.`
    );
  }

  for (const sol of solicitudes) {
    // Obtener resultados de la solicitud
    const { data: res } = await adminClient
      .from("resultados")
      .select("bloque, calificacion")
      .eq("solicitud_id", sol.id);

    const resultList = res || [];
    const comun = resultList.find((r: any) => r.bloque === "comun")?.calificacion;
    const espec = resultList.find((r: any) => r.bloque === "especifico")?.calificacion;

    const esAptoGlobal = comun === "apto" && (espec === "apto" || espec === undefined);

    // Actualizar resultados a definitivos
    await supabase
      .from("resultados")
      .update({ estado_definitivo: true })
      .eq("solicitud_id", sol.id);

    // Actualizar estado de solicitud
    const nuevoEstado = esAptoGlobal ? "finalizada" : "rechazada";
    await supabase
      .from("solicitudes")
      .update({ estado: nuevoEstado })
      .eq("id", sol.id);

    // DIR-28: Si el resultado es apto, actualizar grado del practicante en el perfil
    if (esAptoGlobal) {
      await adminClient
        .from("practicantes")
        .update({
          grado_actual: sol.grado_solicitado,
          fecha_obtencion_grado: new Date().toISOString().split("T")[0],
        })
        .eq("id", sol.practicante_id);

      // Insertar en historial de grados
      await adminClient.from("historial_grados").insert({
        practicante_id: sol.practicante_id,
        grado: sol.grado_solicitado,
        fecha_obtencion: new Date().toISOString().split("T")[0],
        examen_asociado_id: convocatoriaId,
      });
    }
  }

  // Actualizar convocatoria a finalizada
  await supabase
    .from("convocatorias")
    .update({ estado: "finalizada" })
    .eq("id", convocatoriaId);

  // Notify aspirantes
  if (solicitudes && solicitudes.length > 0) {
    const notifications = solicitudes
      .filter((s: any) => s.practicantes?.user_id)
      .map((s: any) => ({
        user_id: s.practicantes.user_id,
        titulo: "Acta Oficial Emitida",
        mensaje: "El acta oficial de la convocatoria ha sido firmada y tu resultado es definitivo.",
        tipo: "resultado",
        enlace: "/aspirante/resultado",
      }));
    if (notifications.length > 0) {
      await adminClient.from("notificaciones").insert(notifications);
    }
  }

  await logAuditLocal(userId, email, "generar_acta_oficial", "convocatorias", convocatoriaId, {
    total_solicitudes: solicitudes.length,
  });

  revalidatePath("/director/resultados");
  return { success: true };
}

/**
 * DIR-30: Rectificar calificación con justificación obligatoria
 */
export async function rectificarCalificacionAuditada(
  solicitudId: string,
  bloque: "comun" | "especifico",
  componente: string,
  nuevaCalificacion: "apto" | "no_apto",
  motivo: string
) {
  if (!motivo || motivo.trim().length === 0) {
    throw new Error("Debe ingresar obligatoriamente el motivo o justificación de la rectificación.");
  }

  const { supabase, userId, email } = await requireDirector();

  const { error } = await supabase
    .from("resultados")
    .update({
      calificacion: nuevaCalificacion,
      comentarios: `[Rectificado]: ${motivo}. Original modificado por Director FMK.`,
    })
    .eq("solicitud_id", solicitudId)
    .eq("bloque", bloque)
    .eq("componente", componente);

  if (error) throw new Error("Error al rectificar la calificación.");

  await logAuditLocal(userId, email, "rectificar_calificacion", "resultados", solicitudId, {
    bloque,
    componente,
    nuevaCalificacion,
    motivo,
  });

  return { success: true };
}

/**
 * DIR-31 a DIR-33: Gestión de Exenciones de Pago
 */
export async function aplicarExencionCuota(
  solicitudId: string,
  tipoExencion: "campeon_mundo" | "repetidor" | "ninguna"
) {
  const { supabase, userId, email } = await requireDirector();

  const { data: sol } = await supabase
    .from("solicitudes")
    .select("*, practicantes ( id, user_id )")
    .eq("id", solicitudId)
    .single();

  if (!sol) throw new Error("Solicitud no encontrada");

  let estadoPago: "pendiente" | "pagado" | "exento" = "pendiente";
  let importeFinal = sol.importe_final || 0;

  if (tipoExencion === "campeon_mundo") {
    // DIR-31: Exención total de cuota (100%)
    estadoPago = "exento";
    importeFinal = 0;
  } else if (tipoExencion === "repetidor") {
    // DIR-32 / DIR-33: Buscar si hay un No Apto en el último año
    // Buscamos solicitudes finalizadas no aptas (estado = rechazada) del mismo practicante en los últimos 365 días
    const unAnioAtras = new Date();
    unAnioAtras.setDate(unAnioAtras.getDate() - 365);

    const { data: rechazadasPrevias } = await supabase
      .from("solicitudes")
      .select("id, created_at")
      .eq("practicante_id", sol.practicantes.id)
      .eq("estado", "rechazada")
      .eq("grado_solicitado", sol.grado_solicitado)
      .gte("created_at", unAnioAtras.toISOString());

    if (!rechazadasPrevias || rechazadasPrevias.length === 0) {
      throw new Error("El aspirante no cumple con la regla de reducción del 50%: no se detectó un resultado No Apto para este grado dentro del último año.");
    }

    // Aplica reducción del 50%
    importeFinal = Number((importeFinal / 2).toFixed(2));
  }

  await supabase
    .from("solicitudes")
    .update({
      estado_pago: estadoPago,
      importe_final: importeFinal,
      situacion_especial: tipoExencion === "ninguna" ? null : `Exención aplicada: ${tipoExencion}`,
    })
    .eq("id", solicitudId);

  await logAuditLocal(userId, email, "aplicar_exencion_cuota", "solicitudes", solicitudId, {
    tipoExencion,
    importeFinal,
    estadoPago,
  });

  revalidatePath(`/director/solicitudes/${solicitudId}`);
  return { success: true, nuevoImporte: importeFinal };
}

/**
 * DIR-34 / DIR-35: Tramitar Dispensa Médica
 */
export async function resolverDispensaMedica(
  solicitudId: string,
  aprobar: boolean,
  motivoDenegacion?: string
) {
  const { supabase, userId, email } = await requireDirector();

  let situacionEspecialText = "";
  let estadoSolicitud = "en_revision";

  if (aprobar) {
    situacionEspecialText = "Dispensa Médica Autorizada: Componentes prácticos de examen adaptados.";
  } else {
    situacionEspecialText = `Dispensa Médica Denegada: ${motivoDenegacion || "Documentación médica insuficiente."}`;
    estadoSolicitud = "documentacion_incompleta"; // Deja sin efecto la solicitud hasta subsanación
  }

  await supabase
    .from("solicitudes")
    .update({
      situacion_especial: situacionEspecialText,
      estado: estadoSolicitud,
    })
    .eq("id", solicitudId);

  await logAuditLocal(userId, email, "resolver_dispensa_medica", "solicitudes", solicitudId, {
    aprobar,
    motivoDenegacion,
  });

  revalidatePath(`/director/solicitudes/${solicitudId}`);
  return { success: true };
}

/**
 * DIR-37 / DIR-38: Tramitar Convalidación u Homologación de Grado
 */
export async function tramitarConvalidacion(
  solicitudId: string,
  resolucion: "convalidado" | "convalidado_inferior" | "denegado",
  gradoOtorgado?: string,
  informeJunta?: string
) {
  const { supabase, userId, email } = await requireDirector();

  const detalleText = `Resolución de convalidación: ${resolucion.toUpperCase()}. Grado otorgado: ${gradoOtorgado || "Ninguno"}. Informe: ${informeJunta || "No especificado"}.`;

  await supabase
    .from("solicitudes")
    .update({
      situacion_especial: detalleText,
      estado: resolucion === "denegado" ? "rechazada" : "validada",
    })
    .eq("id", solicitudId);

  await logAuditLocal(userId, email, "tramitar_convalidacion", "solicitudes", solicitudId, {
    resolucion,
    gradoOtorgado,
    informeJunta,
  });

  revalidatePath(`/director/solicitudes/${solicitudId}`);
  return { success: true };
}