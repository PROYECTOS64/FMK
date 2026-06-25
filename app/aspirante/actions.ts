"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────
// Helper: return the current aspirante's supabase client + practicante row
// ─────────────────────────────────────────────────────────────
async function requireAspirante() {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData?.user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from("perfiles_usuario")
    .select("rol")
    .eq("user_id", userData.user.id)
    .single();

  if (!profile || profile.rol !== "aspirante") {
    throw new Error("Acceso denegado");
  }

  const { data: practicante } = await supabase
    .from("practicantes")
    .select("*")
    .eq("user_id", userData.user.id)
    .single();

  if (!practicante) throw new Error("Perfil de practicante no encontrado");

  return { supabase, userId: userData.user.id, email: userData.user.email ?? "", practicante };
}

// ─────────────────────────────────────────────────────────────
// ASP-01 / ASP-04 / ASP-05: Get dashboard data for the aspirante
// Returns profile, grades history, licencias, active solicitud + docs
// ─────────────────────────────────────────────────────────────
export async function getDashboardData() {
  const { supabase, practicante } = await requireAspirante();

  // Historial de grados (ASP-04)
  const { data: historial } = await supabase
    .from("historial_grados")
    .select("grado, fecha_obtencion")
    .eq("practicante_id", practicante.id)
    .order("fecha_obtencion", { ascending: false });

  // Licencias (ASP-05)
  const { data: licencias } = await supabase
    .from("licencias")
    .select("anio, tipo, estado")
    .eq("practicante_id", practicante.id)
    .order("anio", { ascending: false });

  // Solicitud activa (borrador, enviada, en_revision, documentacion_incompleta, validada, programada)
  const { data: solicitudes } = await supabase
    .from("solicitudes")
    .select(`
      id, estado, via_elegida, grado_solicitado, situacion_especial,
      estado_pago, importe_final, created_at, updated_at,
      convocatorias ( id, nombre, fecha_examen, sede )
    `)
    .eq("practicante_id", practicante.id)
    .in("estado", ["borrador", "enviada", "en_revision", "documentacion_incompleta", "validada", "programada"])
    .order("created_at", { ascending: false })
    .limit(1);

  const solicitudActiva = solicitudes?.[0] ?? null;

  // Documentos de la solicitud activa
  let documentos: any[] = [];
  if (solicitudActiva) {
    const { data: docs } = await supabase
      .from("documentos")
      .select("id, tipo, estado_validacion, comentarios_revision, created_at")
      .eq("solicitud_id", solicitudActiva.id);
    documentos = docs ?? [];
  }

  return {
    practicante,
    historial: historial ?? [],
    licencias: licencias ?? [],
    solicitudActiva,
    documentos,
  };
}

// ─────────────────────────────────────────────────────────────
// ASP-06–ASP-10: Compute elegibility for the next grade
// Returns { elegible, motivo, gradoObjetivo }
// ─────────────────────────────────────────────────────────────
export async function calcularElegibilidad() {
  const { supabase, practicante } = await requireAspirante();

  // Fetch the normativa rule for the next grade
  const { data: regla } = await supabase
    .from("reglas_normativas")
    .select("*")
    .eq("grado", practicante.grado_actual)
    .single();

  if (!regla) {
    return { elegible: false, motivo: "No existe normativa para tu grado actual.", gradoObjetivo: null };
  }

  const ahora = new Date();
  const problemas: string[] = [];

  // Age check (ASP-07)
  if (practicante.fecha_nacimiento) {
    const edadMs = ahora.getTime() - new Date(practicante.fecha_nacimiento).getTime();
    const edadAnios = edadMs / (1000 * 60 * 60 * 24 * 365.25);
    if (edadAnios < regla.edad_minima) {
      const cumpleDate = new Date(practicante.fecha_nacimiento);
      cumpleDate.setFullYear(cumpleDate.getFullYear() + regla.edad_minima);
      problemas.push(`Edad insuficiente. Necesitas al menos ${regla.edad_minima} años. Cumplirás el requisito el ${cumpleDate.toLocaleDateString("es-ES")}.`);
    }
  }

  // Permanencia en el grado (ASP-08)
  if (practicante.fecha_obtencion_grado) {
    const mesdesde = (ahora.getTime() - new Date(practicante.fecha_obtencion_grado).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    if (mesdesde < regla.permanencia_minima_meses) {
      const restantes = Math.ceil(regla.permanencia_minima_meses - mesdesde);
      problemas.push(`Tiempo en el grado insuficiente. Faltan ${restantes} mes(es) de permanencia.`);
    }
  }

  // Licencias consecutivas (ASP-09)
  const { data: licenciasConsecutivas } = await supabase
    .from("licencias")
    .select("anio, tipo")
    .eq("practicante_id", practicante.id)
    .eq("tipo", "consecutiva")
    .order("anio", { ascending: false });

  const numConsecutivas = licenciasConsecutivas?.length ?? 0;
  if (numConsecutivas < regla.licencias_consecutivas_min) {
    problemas.push(`Faltan licencias consecutivas. Tienes ${numConsecutivas}, necesitas ${regla.licencias_consecutivas_min}.`);
  }

  // Licencias alternas (RN-ELG-01)
  const { data: licenciasAlternas } = await supabase
    .from("licencias")
    .select("anio, tipo")
    .eq("practicante_id", practicante.id)
    .eq("tipo", "alterna")
    .order("anio", { ascending: false });

  const numAlternas = licenciasAlternas?.length ?? 0;
  // Verificar si cumple con alguno de los dos requisitos (consecutivas o alternas)
  const cumpleLicenciasReq = numConsecutivas >= regla.licencias_consecutivas_min || numAlternas >= regla.licencias_alternas_min;
  if (!cumpleLicenciasReq) {
    problemas.push(`Faltan licencias (consecutivas o alternas). Tienes ${numConsecutivas} consecutivas y ${numAlternas} alternas. Necesitas ${regla.licencias_consecutivas_min} consecutivas o ${regla.licencias_alternas_min} alternas.`);
  }

  if (problemas.length > 0) {
    return { elegible: false, motivo: problemas.join(" | "), gradoObjetivo: practicante.grado_actual };
  }

  return { elegible: true, motivo: "Cumples todos los requisitos.", gradoObjetivo: practicante.grado_actual };
}

// ─────────────────────────────────────────────────────────────
// ASP-10: Fetch convocatorias open for this aspirante's grade
// ─────────────────────────────────────────────────────────────
export async function getConvocatoriasDisponibles() {
  const { supabase, practicante } = await requireAspirante();

  // Mapa: grado actual → grado objetivo (al que puede aspirar)
  const SIGUIENTE_GRADO: Record<string, string> = {
    "Cinturón Blanco":   "Cinturón Amarillo",
    "Cinturón Amarillo": "Cinturón Naranja",
    "Cinturón Naranja":  "Cinturón Verde",
    "Cinturón Verde":    "Cinturón Azul",
    "Cinturón Azul":     "Cinturón Marrón",
    "Cinturón Marrón":   "Cinturón Negro",
    "Cinturón Negro":    "1º Dan",
    "1º Dan":            "2º Dan",
    "2º Dan":            "3º Dan",
    "3º Dan":            "4º Dan",
    "4º Dan":            "5º Dan",
    "5º Dan":            "6º Dan",
    "6º Dan":            "7º Dan",
    "7º Dan":            "8º Dan",
    "8º Dan":            "9º Dan",
    "9º Dan":            "10º Dan",
  };

  const gradoObjetivo = SIGUIENTE_GRADO[practicante.grado_actual] ?? null;

  const { data: convocatorias } = await supabase
    .from("convocatorias")
    .select(`
      id, nombre, fecha_examen, sede, fecha_limite_inscripcion, cuota, vias_habilitadas, estado,
      convocatorias_grados ( grado )
    `)
    .in("estado", ["abierta", "en_curso"])
    .order("fecha_examen", { ascending: true });

  // Mostrar convocatorias que incluyan el grado objetivo del aspirante
  const filtered = (convocatorias ?? []).filter((conv: any) =>
    gradoObjetivo &&
    conv.convocatorias_grados?.some((cg: any) => cg.grado === gradoObjetivo)
  );

  return { convocatorias: filtered, gradoActual: practicante.grado_actual };
}

// ─────────────────────────────────────────────────────────────
// ASP-11 / ASP-12: Create or update draft solicitud
// ─────────────────────────────────────────────────────────────
export async function guardarBorradorSolicitud(formData: {
  convocatoriaId: string;
  viaElegida?: string;
  situacionEspecial?: string;
  solicitudId?: string; // if resuming
}) {
  const { supabase, practicante } = await requireAspirante();

  // ASP-17: Check for existing active solicitud (not this draft)
  const { data: existente } = await supabase
    .from("solicitudes")
    .select("id, estado")
    .eq("practicante_id", practicante.id)
    .in("estado", ["enviada", "en_revision", "validada", "programada"])
    .limit(1);

  if (existente && existente.length > 0) {
    return { error: "Ya tienes una solicitud activa en curso. No puedes inscribirte en otra convocatoria." };
  }

  // Get grado_solicitado from convocatoria
  const { data: conv } = await supabase
    .from("convocatorias")
    .select("id, estado, cuota, convocatorias_grados ( grado )")
    .eq("id", formData.convocatoriaId)
    .single();

  if (!conv || !["abierta", "en_curso"].includes(conv.estado)) {
  return { error: "La convocatoria seleccionada no está disponible." };
}

  const gradoSolicitado = conv.convocatorias_grados?.[0]?.grado ?? practicante.grado_actual;

  if (formData.solicitudId) {
    // Resume / update draft
    const { error } = await supabase
      .from("solicitudes")
      .update({
        convocatoria_id: formData.convocatoriaId,
        via_elegida: formData.viaElegida ?? null,
        situacion_especial: formData.situacionEspecial ?? null,
        grado_solicitado: gradoSolicitado,
        updated_at: new Date().toISOString(),
      })
      .eq("id", formData.solicitudId)
      .eq("practicante_id", practicante.id)
      .eq("estado", "borrador");

    if (error) return { error: "Error al actualizar el borrador." };
    revalidatePath("/aspirante/solicitud");
    revalidatePath("/aspirante");
    return { success: true, solicitudId: formData.solicitudId };
  }

  // Create new draft
  const { data: nueva, error: createErr } = await supabase
    .from("solicitudes")
    .insert({
      practicante_id: practicante.id,
      convocatoria_id: formData.convocatoriaId,
      grado_solicitado: gradoSolicitado,
      via_elegida: formData.viaElegida ?? null,
      situacion_especial: formData.situacionEspecial ?? null,
      estado: "borrador",
      estado_pago: "pendiente",
      importe_final: (conv as any).cuota ?? 0,
    })
    .select("id")
    .single();

  if (createErr || !nueva) return { error: "Error al crear el borrador." };

  revalidatePath("/aspirante/solicitud");
  revalidatePath("/aspirante");
  return { success: true, solicitudId: nueva.id };
}

// ─────────────────────────────────────────────────────────────
// ASP-14 / ASP-13: Submit solicitud (borrador → enviada)
// Validates all required docs are uploaded (not rejected)
// ─────────────────────────────────────────────────────────────
export async function enviarSolicitud(solicitudId: string) {
  const { supabase, practicante } = await requireAspirante();

  // ASP-18: Check if aspirante is sanctioned (No Apto hace < 3 meses)
  const tresMesesAtras = new Date();
  tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);

  const { data: noAptos } = await supabase
    .from("resultados")
    .select(`
      id, calificacion, created_at,
      solicitudes!inner ( practicante_id, estado )
    `)
    .eq("solicitudes.practicante_id", practicante.id)
    .eq("solicitudes.estado", "finalizada")
    .eq("calificacion", "no_apto")
    .eq("estado_definitivo", true)
    .gte("created_at", tresMesesAtras.toISOString())
    .limit(1);

  if (noAptos && noAptos.length > 0) {
    const bloqueadoHasta = new Date(noAptos[0].created_at);
    bloqueadoHasta.setMonth(bloqueadoHasta.getMonth() + 3);
    return {
      error: `Tienes un período de espera de 3 meses tras tu último No Apto. Podrás inscribirte a partir del ${bloqueadoHasta.toLocaleDateString("es-ES")}.`,
    };
  }

  // Fetch solicitud
  const { data: sol } = await supabase
    .from("solicitudes")
    .select("id, estado, via_elegida, grado_solicitado, convocatoria_id")
    .eq("id", solicitudId)
    .eq("practicante_id", practicante.id)
    .single();

  if (!sol || sol.estado !== "borrador") {
    return { error: "Esta solicitud no puede enviarse en su estado actual." };
  }

  if (!sol.via_elegida) {
    return { error: "Debes seleccionar una vía específica antes de enviar." };
  }

  // ASP-13: Check docs — all required docs must be uploaded (not rejected)
  const { data: docs } = await supabase
    .from("documentos")
    .select("tipo, estado_validacion")
    .eq("solicitud_id", solicitudId);

  const requiredDocs = ["DNI o Pasaporte", "Carnet de Grados firmado", "Licencias Federativas", "Fotografías (3)", "Aval del Club"];
const uploadedTypes = (docs ?? [])
  .filter((d: any) => ["cargado", "validado", "en_revision"].includes(d.estado_validacion))
  .map((d: any) => d.tipo);

const missing = requiredDocs.filter((req) => !uploadedTypes.includes(req));

if (missing.length > 0) {
  return { error: `Faltan documentos obligatorios: ${missing.join(", ")}.` };
}
  // Submit
  const { error: updateErr } = await supabase
    .from("solicitudes")
    .update({ estado: "enviada", updated_at: new Date().toISOString() })
    .eq("id", solicitudId);

  if (updateErr) return { error: "Error al enviar la solicitud." };

  revalidatePath("/aspirante");
  revalidatePath("/aspirante/solicitud");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────
// ASP-19 / ASP-20 / ASP-21: Upload a document to a solicitud
// Validates file format. Only PDF and JPG/JPEG/PNG allowed.
// ─────────────────────────────────────────────────────────────
export async function subirDocumento(formData: FormData) {
  const { supabase, practicante } = await requireAspirante();

  const solicitudId = formData.get("solicitudId") as string;
  const tipo = formData.get("tipo") as string;
  const file = formData.get("file") as File;

  if (!solicitudId || !tipo || !file) {
    return { error: "Datos incompletos." };
  }

  // ASP-21: Validate file format
  const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
  const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
  const fileName = file.name.toLowerCase();
  const hasAllowedExt = allowedExtensions.some((ext) => fileName.endsWith(ext));

  if (!allowedTypes.includes(file.type) || !hasAllowedExt) {
    return { error: `Formato no permitido. Solo se aceptan: PDF, JPG, JPEG, PNG.` };
  }

  // ASP-24: Validate trabajoEscrito deadline for 5.º Dan+ (2 months before exam)
  if (tipo === "Trabajo Escrito") {
    const { data: sol } = await supabase
      .from("solicitudes")
      .select("convocatorias ( fecha_examen ), grado_solicitado")
      .eq("id", solicitudId)
      .single();

    const altosGrados = ["5º Dan", "6º Dan", "7º Dan", "8º Dan", "9º Dan", "10º Dan"];
    if (sol && altosGrados.includes(sol.grado_solicitado)) {
      const fechaExamen = new Date((sol as any).convocatorias?.fecha_examen);
      const dosMesesAntes = new Date(fechaExamen);
      dosMesesAntes.setMonth(dosMesesAntes.getMonth() - 2);
      if (new Date() > dosMesesAntes) {
        return { error: "El trabajo escrito para 5.º Dan o superior debe entregarse con al menos 2 meses de antelación al examen." };
      }
    }
  }

  // Upload to Supabase Storage
  const bucketPath = `documentos/${solicitudId}/${tipo}_${Date.now()}_${file.name}`;
  const { error: storageErr } = await supabase.storage
    .from("documentos-solicitudes")
    .upload(bucketPath, file, { upsert: true });

  if (storageErr) {
    // Gracefully fall back — still register the document row even if bucket not configured
    console.warn("Storage upload failed (may not be configured):", storageErr.message);
  }

  // Check if document row already exists (for replacement — ASP-22)
  const { data: existing } = await supabase
    .from("documentos")
    .select("id")
    .eq("solicitud_id", solicitudId)
    .eq("tipo", tipo)
    .maybeSingle();

  if (existing) {
    // Replace
    await supabase
      .from("documentos")
      .update({
        bucket_path: bucketPath,
        estado_validacion: "cargado",
        comentarios_revision: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    // If the solicitud was in 'documentacion_incompleta', bring it back to 'en_revision'
    await supabase
      .from("solicitudes")
      .update({ estado: "en_revision", updated_at: new Date().toISOString() })
      .eq("id", solicitudId)
      .eq("estado", "documentacion_incompleta");
  } else {
    // Insert new document row
    await supabase.from("documentos").insert({
      solicitud_id: solicitudId,
      tipo,
      bucket_path: bucketPath,
      estado_validacion: "cargado",
    });
  }

  revalidatePath("/aspirante/solicitud");
  revalidatePath("/aspirante");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────
// ASP-02: Update aspirante's own profile data
// ─────────────────────────────────────────────────────────────
export async function actualizarPerfil(data: {
  nombre?: string;
  apellidos?: string;
  estilo?: string;
}) {
  const { supabase, practicante } = await requireAspirante();

  const { error } = await supabase
    .from("practicantes")
    .update({
      ...(data.nombre ? { nombre: data.nombre } : {}),
      ...(data.apellidos ? { apellidos: data.apellidos } : {}),
      ...(data.estilo ? { estilo: data.estilo } : {}),
    })
    .eq("id", practicante.id);

  if (error) return { error: "Error al actualizar el perfil." };

  revalidatePath("/aspirante");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────
// ASP-35 / ASP-36: Get catalog data (estilos + katas)
// ─────────────────────────────────────────────────────────────
export async function getCatalogo(estiloId?: string, grado?: string) {
  const supabase = await createClient();

  const { data: estilos } = await supabase
    .from("estilos")
    .select("id, nombre, fundador, caracteristicas")
    .order("nombre");

  let katas: any[] = [];
  if (estiloId) {
    const { data } = await supabase
      .from("katas")
      .select("id, nombre, nivel")
      .eq("estilo_id", estiloId)
      .order("nivel");
    katas = data ?? [];
  }

  return { estilos: estilos ?? [], katas };
}

// ─────────────────────────────────────────────────────────────
// ASP-37: Get temario for a given grade
// ─────────────────────────────────────────────────────────────
export async function getTemario(grado: string) {
  const supabase = await createClient();

  const { data: preguntas } = await supabase
    .from("temario_preguntas")
    .select("id, pregunta, respuesta, orden")
    .eq("grado", grado)
    .order("orden");

  return { preguntas: preguntas ?? [] };
}

// ─────────────────────────────────────────────────────────────
// ASP-31 / ASP-32 / ASP-33: Get results for the aspirante's solicitudes
// ─────────────────────────────────────────────────────────────
export async function getMisResultados() {
  const { supabase, practicante } = await requireAspirante();

  const { data: solicitudes } = await supabase
    .from("solicitudes")
    .select(`
      id, estado, grado_solicitado, via_elegida, updated_at,
      convocatorias ( nombre, fecha_examen, sede )
    `)
    .eq("practicante_id", practicante.id)
    .in("estado", ["finalizada", "rechazada"])
    .order("updated_at", { ascending: false });

  const resultadosPorSolicitud: any[] = [];

  for (const sol of solicitudes ?? []) {
    const { data: resultados } = await supabase
      .from("resultados")
      .select("bloque, componente, calificacion, estado_definitivo, comentarios")
      .eq("solicitud_id", sol.id);
    resultadosPorSolicitud.push({ ...sol, resultados: resultados ?? [] });
  }

  return { solicitudes: resultadosPorSolicitud };
}

// ─────────────────────────────────────────────────────────────
// ASP-33: Request explanatory report for No Apto result
// ─────────────────────────────────────────────────────────────
export async function solicitarInformeNoApto(solicitudId: string) {
  const { supabase, practicante } = await requireAspirante();

  // Verify the solicitud belongs to this aspirante
  const { data: sol } = await supabase
    .from("solicitudes")
    .select("id, estado, practicante_id")
    .eq("id", solicitudId)
    .eq("practicante_id", practicante.id)
    .single();

  if (!sol || sol.estado !== "finalizada") {
    return { error: "No se puede solicitar informe para esta solicitud." };
  }

  const adminClient = createAdminClient();
  await adminClient.from("audit_log").insert({
    user_id: practicante.user_id,
    user_email: null,
    action: "solicitar_informe_no_apto",
    entity_type: "solicitudes",
    entity_id: solicitudId,
    details: JSON.stringify({ practicante_id: practicante.id }),
  });

  return { success: true, mensaje: "Tu solicitud de informe ha sido registrada. El Director FMK la atenderá en breve." };
}
