"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import {
  guardarBorradorSolicitud,
  enviarSolicitud,
  subirDocumento,
  getConvocatoriasDisponibles,
  calcularElegibilidad,
  getDashboardData,
  getDocumentoUrl
} from "@/app/aspirante/actions";

const PASOS = ["Elegibilidad", "Convocatoria", "Documentos", "Vía", "Declaración", "Revisión"];

// Allowed extensions for display
const DOC_ESTADO_COLORS: Record<string, string> = {
  cargado: "text-[#2D6A4F]",
  validado: "text-[#2D6A4F] font-bold",
  rechazado: "text-[#BA1A1A] font-bold",
  en_revision: "text-[#54585B]",
  pendiente: "text-[#54585B]",
};

const DOCUMENTOS_REQUERIDOS = [
  "DNI o Pasaporte",
  "Carnet de Grados firmado",
  "Licencias Federativas",
  "Fotografías (3)",
  "Aval del Club",
];

export default function SolicitudInscripcionPage() {
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Data
  const [elegibilidad, setElegibilidad] = useState<{ elegible: boolean; motivo: string; gradoObjetivo: string | null } | null>(null);
  const [convocatorias, setConvocatorias] = useState<any[]>([]);
  const [solicitudActiva, setSolicitudActiva] = useState<any | null>(null);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [practicante, setPracticante] = useState<any | null>(null);

  // Form state
  const [convocatoriaSeleccionada, setConvocatoriaSeleccionada] = useState<string>("");
  const [viaElegida, setViaElegida] = useState<string>("");
  const [situacionEspecial, setSituacionEspecial] = useState<string>("");
  const [solicitudId, setSolicitudId] = useState<string | null>(null);
  const [solicitudEnviada, setSolicitudEnviada] = useState(false);
  const uploadRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ───────────────────────────────────────────
  // Load initial data on mount
  // ───────────────────────────────────────────
  useEffect(() => {
    startTransition(async () => {
      const [eligData, convData, dashData] = await Promise.all([
        calcularElegibilidad(),
        getConvocatoriasDisponibles(),
        getDashboardData(),
      ]);

      setElegibilidad(eligData);
      setConvocatorias(convData.convocatorias);
      setPracticante(dashData.practicante);

      if (dashData.solicitudActiva) {
        const sol = dashData.solicitudActiva as any;
        setSolicitudActiva(sol);
        setSolicitudId(sol.id);
        setConvocatoriaSeleccionada(sol.convocatoria_id ?? "");
        setViaElegida(sol.via_elegida ?? "");
        setSituacionEspecial(sol.situacion_especial ?? "");
        setDocumentos(dashData.documentos);

        // If already sent, lock modifications
        if (["enviada", "en_revision", "validada", "programada"].includes(sol.estado)) {
          setSolicitudEnviada(true);
          setStep(6); // Go straight to review
        } else {
          // Resume draft from step 2
          setStep(2);
        }
      }
    });
  }, []);

  function clearMessages() {
    setError(null);
    setInfo(null);
  }

  // ───────────────────────────────────────────
  // Step 2: Save draft & advance
  // ───────────────────────────────────────────
  async function handleSaveDraftAndContinue() {
    if (!convocatoriaSeleccionada) {
      setError("Debes seleccionar una convocatoria.");
      return;
    }
    clearMessages();
    startTransition(async () => {
      const result = await guardarBorradorSolicitud({
        convocatoriaId: convocatoriaSeleccionada,
        solicitudId: solicitudId ?? undefined,
      });
      if ("error" in result) {
        setError(result.error ?? "Error desconocido");
        return;
      }
      setSolicitudId(result.solicitudId ?? null);
      setStep(3);
    });
  }

  // ───────────────────────────────────────────
  // Step 3: File upload
  // ───────────────────────────────────────────
  async function handleUpload(tipo: string, file: File) {
    clearMessages();
    if (!solicitudId) {
      setError("Debes guardar primero la selección de convocatoria.");
      return;
    }
    const fd = new FormData();
    fd.append("solicitudId", solicitudId);
    fd.append("tipo", tipo);
    fd.append("file", file);

    startTransition(async () => {
      const result = await subirDocumento(fd);
      if ("error" in result) {
        setError(result.error ?? "Error al subir el archivo");
        return;
      }
      // Refresh docs
      const dashData = await getDashboardData();
      setDocumentos(dashData.documentos);
      setInfo(`"${tipo}" cargado correctamente.`);
    });
  }

  // ───────────────────────────────────────────
  // Step 4: Save via (ASP-15 — can't change once sent)
  // ───────────────────────────────────────────
  async function handleSaveVia() {
    if (!viaElegida) {
      setError("Debes seleccionar una vía específica.");
      return;
    }
    clearMessages();
    startTransition(async () => {
      const result = await guardarBorradorSolicitud({
        convocatoriaId: convocatoriaSeleccionada,
        viaElegida,
        solicitudId: solicitudId ?? undefined,
      });
      if ("error" in result) {
        setError(result.error ?? "Error");
        return;
      }
      setStep(5);
    });
  }

  // ───────────────────────────────────────────
  // Step 5: Save situación especial & go to review
  // ───────────────────────────────────────────
  async function handleSaveDeclaracion() {
    clearMessages();
    startTransition(async () => {
      await guardarBorradorSolicitud({
        convocatoriaId: convocatoriaSeleccionada,
        viaElegida,
        situacionEspecial,
        solicitudId: solicitudId ?? undefined,
      });
      setStep(6);
    });
  }

  // ───────────────────────────────────────────
  // Step 6: Submit solicitud (ASP-14)
  // ───────────────────────────────────────────
  async function handleEnviar() {
    if (!solicitudId) {
      setError("No hay solicitud que enviar.");
      return;
    }
    clearMessages();
    startTransition(async () => {
      const result = await enviarSolicitud(solicitudId, viaElegida || undefined);
      if ("error" in result) {
        setError(result.error ?? "Error al enviar");
        return;
      }
      setSolicitudEnviada(true);
      setInfo("¡Solicitud enviada correctamente! La FMK revisará tu documentación.");
    });
  }

  const convocatoriaSeleccionadaObj = convocatorias.find((c) => c.id === convocatoriaSeleccionada);
  const docsMap: Record<string, any> = {};
  documentos.forEach((d) => { docsMap[d.tipo] = d; });

  // ───────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6">
      <div className="border-b border-[#54585B]/20 pb-6 mb-8">
        <p className="text-xs font-bold uppercase tracking-wide text-[#7A1F2A]">Inscripción a Examen</p>
        <h1 className="mt-2 text-3xl font-bold text-[#191C1D]" style={{ fontFamily: "Montserrat, sans-serif" }}>
          Solicitud Oficial
        </h1>
        <p className="mt-1 text-sm text-[#54585B]">
          {solicitudEnviada ? "Tu solicitud ha sido enviada. Puedes consultar el estado en el panel principal." : "Completa los pasos para formalizar tu candidatura."}
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8 relative flex items-center justify-between">
        <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-[#54585B]/15 z-0" />
        <div
          className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-[#7A1F2A] z-0 transition-all duration-300"
          style={{ width: `${((step - 1) / (PASOS.length - 1)) * 100}%` }}
        />
        {PASOS.map((label, idx) => {
          const s = idx + 1;
          return (
            <div key={s} className="relative z-10 flex flex-col items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold border-2 transition-colors ${
                step === s ? "border-[#7A1F2A] bg-white text-[#7A1F2A]" :
                step > s ? "border-[#7A1F2A] bg-[#7A1F2A] text-white" :
                "border-[#54585B]/20 bg-white text-[#54585B]"
              }`}>
                {step > s ? "✓" : s}
              </div>
              <span className={`text-[10px] font-bold uppercase hidden sm:block ${step >= s ? "text-[#7A1F2A]" : "text-[#54585B]"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error / Info banner */}
      {error && (
        <div className="mb-4 rounded border border-[#BA1A1A]/30 bg-[#FFF1F2] px-4 py-3 flex gap-2 items-start">
          <span className="material-symbols-outlined text-[#BA1A1A] text-lg mt-0.5">error</span>
          <p className="text-sm text-[#BA1A1A]">{error}</p>
        </div>
      )}
      {info && (
        <div className="mb-4 rounded border border-[#2D6A4F]/30 bg-[#EAF5EF] px-4 py-3 flex gap-2 items-start">
          <span className="material-symbols-outlined text-[#2D6A4F] text-lg mt-0.5">check_circle</span>
          <p className="text-sm text-[#2D6A4F]">{info}</p>
        </div>
      )}

      {/* Content Area */}
      <div className="rounded-lg border border-[#54585B]/20 bg-white p-6 md:p-8 min-h-[400px]">

        {/* ─── STEP 1: Elegibilidad (ASP-06–ASP-09) ─── */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
              <h2 className="text-xl font-bold text-[#191C1D]" style={{ fontFamily: "Montserrat, sans-serif" }}>Consultar Elegibilidad</h2>
              <p className="text-sm text-[#54585B] mt-1">Verificación de los requisitos para el grado siguiente.</p>
            </div>

            {isPending && !elegibilidad ? (
              <div className="flex items-center gap-3 text-sm text-[#54585B]">
                <span className="material-symbols-outlined animate-spin text-[#7A1F2A]">progress_activity</span>
                Calculando elegibilidad…
              </div>
            ) : elegibilidad ? (
              <div className={`rounded-lg border-2 p-6 flex gap-4 items-start ${elegibilidad.elegible ? "border-[#2D6A4F] bg-[#EAF5EF]" : "border-[#BA1A1A] bg-[#FFF1F2]"}`}>
                <span className={`material-symbols-outlined text-3xl ${elegibilidad.elegible ? "text-[#2D6A4F]" : "text-[#BA1A1A]"}`}>
                  {elegibilidad.elegible ? "verified" : "block"}
                </span>
                <div>
                  <p className={`font-bold text-lg ${elegibilidad.elegible ? "text-[#2D6A4F]" : "text-[#BA1A1A]"}`}>
                    {elegibilidad.elegible ? "Elegible" : "No Elegible"}
                  </p>
                  <p className="text-sm text-[#191C1D] mt-1">{elegibilidad.motivo}</p>
                  {practicante && (
                    <p className="text-xs text-[#54585B] mt-2">Grado actual: <strong>{practicante.grado_actual}</strong></p>
                  )}
                </div>
              </div>
            ) : null}

            <p className="text-xs text-[#54585B]">
              Aun si no eres elegible, puedes revisar el formulario. Solo podrás enviar si cumples todos los requisitos.
            </p>
          </div>
        )}

        {/* ─── STEP 2: Seleccionar Convocatoria (ASP-10, ASP-11) ─── */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
              <h2 className="text-xl font-bold text-[#191C1D]" style={{ fontFamily: "Montserrat, sans-serif" }}>Seleccionar Convocatoria</h2>
              <p className="text-sm text-[#54585B] mt-1">Solo se muestran convocatorias abiertas para tu grado. (ASP-10)</p>
            </div>
            {solicitudEnviada ? (
              <div className="rounded border border-[#7A1F2A]/20 bg-[#F8E9EB] p-4 text-sm text-[#7A1F2A] font-semibold">
                La solicitud ya fue enviada. No puedes cambiar la convocatoria. (ASP-15)
              </div>
            ) : convocatorias.length === 0 ? (
              <p className="text-sm text-[#54585B]">No hay convocatorias abiertas disponibles para tu grado en este momento.</p>
            ) : (
              <div className="grid gap-4">
                {convocatorias.map((conv: any) => (
                  <label
                    key={conv.id}
                    className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition ${
                      convocatoriaSeleccionada === conv.id ? "border-[#7A1F2A] bg-[#F8E9EB]" : "border-[#54585B]/20 bg-white hover:border-[#54585B]/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="convocatoria"
                      value={conv.id}
                      checked={convocatoriaSeleccionada === conv.id}
                      onChange={() => setConvocatoriaSeleccionada(conv.id)}
                      className="mt-1 h-4 w-4 accent-[#7A1F2A]"
                    />
                    <div>
                      <p className="font-bold text-[#191C1D]">
                        {new Date(conv.fecha_examen).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })} · {conv.sede}
                      </p>
                      <p className="text-sm text-[#54585B] mt-1">
                        Cierre de inscripciones: {new Date(conv.fecha_limite_inscripcion).toLocaleDateString("es-ES")} · Cuota: {conv.cuota?.toFixed(2)} €
                      </p>
                      <p className="text-xs text-[#7A1F2A] font-semibold mt-1">
                        Vías: {conv.vias_habilitadas?.join(", ")}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 3: Subir Documentos (ASP-19–ASP-24) ─── */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
              <h2 className="text-xl font-bold text-[#191C1D]" style={{ fontFamily: "Montserrat, sans-serif" }}>Subir Documentos</h2>
              <p className="text-sm text-[#54585B] mt-1">Formatos permitidos: PDF, JPG, JPEG, PNG. (ASP-21)</p>
            </div>
            <div className="space-y-4">
              {DOCUMENTOS_REQUERIDOS.map((tipo) => {
                const docExist = docsMap[tipo];
                const estadoColor = docExist ? DOC_ESTADO_COLORS[docExist.estado_validacion] ?? "text-[#54585B]" : "text-[#54585B]";
                const isRechazado = docExist?.estado_validacion === "rechazado";

                async function handleVerDoc() {
                  if (!docExist?.id) return;
                  const res = await getDocumentoUrl(docExist.id);
                  if ("error" in res) {
                    setError(res.error);
                  } else {
                    window.open(res.url, "_blank", "noopener,noreferrer");
                  }
                }

                return (
                  <div
                    key={tipo}
                    className={`rounded border p-4 ${isRechazado ? "border-[#BA1A1A]/30 bg-[#FFF1F2]" : "border-[#54585B]/15 bg-[#F8F9FA]"}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-sm font-semibold text-[#191C1D]">{tipo}</span>
                        {docExist && (
                          <span className={`ml-3 text-xs font-bold uppercase ${estadoColor}`}>
                            {docExist.estado_validacion}
                          </span>
                        )}
                        {isRechazado && docExist?.comentarios_revision && (
                          <p className="text-xs text-[#BA1A1A] mt-1">Motivo: {docExist.comentarios_revision}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Botón Ver — solo si ya hay archivo subido */}
                        {docExist?.ruta_archivo && (
                          <button
                            type="button"
                            onClick={handleVerDoc}
                            disabled={isPending}
                            className="py-2 px-4 rounded text-sm font-bold bg-[#EEF0F1] text-[#54585B] hover:bg-[#54585B]/20 transition disabled:opacity-50 flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[15px]">visibility</span>
                            Ver
                          </button>
                        )}

                        {/* Botón Cargar / Reemplazar */}
                        {!solicitudEnviada && (
                          <>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              id={`upload-${tipo}`}
                              className="hidden"
                              ref={(el) => { uploadRefs.current[tipo] = el; }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUpload(tipo, file);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => uploadRefs.current[tipo]?.click()}
                              disabled={isPending}
                              className="py-2 px-4 rounded text-sm font-bold bg-[#EAF5EF] text-[#2D6A4F] hover:bg-[#2D6A4F]/20 transition disabled:opacity-50"
                            >
                              {docExist ? "Reemplazar" : "Cargar"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── STEP 4: Elegir Vía (ASP-15) ─── */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
              <h2 className="text-xl font-bold text-[#191C1D]" style={{ fontFamily: "Montserrat, sans-serif" }}>Elegir Vía Específica</h2>
              <p className="text-sm text-[#54585B] mt-1">
                {solicitudEnviada
                  ? "La vía no puede cambiarse una vez enviada la solicitud. (ASP-15)"
                  : "Selecciona la modalidad para el Bloque Específico."}
              </p>
            </div>
            {solicitudEnviada && (
              <div className="rounded border border-[#7A1F2A]/20 bg-[#F8E9EB] p-4 text-sm text-[#7A1F2A] font-semibold">
                Vía seleccionada: <span className="capitalize">{viaElegida}</span>. No modificable.
              </div>
            )}
            <div className="grid gap-4">
              {[
                { id: "kumite", label: "Vía de Kumite", desc: "Combate reglamentado. Shiai Kumite o Jyu Kumite según grado y edad." },
                { id: "tecnica", label: "Vía de Técnica", desc: "Aplicación práctica de los katas (Bunkai / Oyo Waza)." },
                { id: "campeonatos", label: "Vía de Campeonatos", desc: "Requiere justificar al menos 10 puntos de competición." },
              ]
                .filter((v) =>
                  convocatoriaSeleccionadaObj?.vias_habilitadas
                    ? convocatoriaSeleccionadaObj.vias_habilitadas.includes(v.id)
                    : true
                )
                .map((via) => (
                  <label
                    key={via.id}
                    className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition ${
                      viaElegida === via.id ? "border-[#7A1F2A] bg-[#F8E9EB]" : "border-[#54585B]/20 bg-white hover:border-[#54585B]/40"
                    } ${solicitudEnviada ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="radio"
                      name="via"
                      value={via.id}
                      checked={viaElegida === via.id}
                      onChange={() => { if (!solicitudEnviada) setViaElegida(via.id); }}
                      disabled={solicitudEnviada}
                      className="mt-1 h-4 w-4 accent-[#7A1F2A]"
                    />
                    <div>
                      <p className="font-bold text-[#191C1D]">{via.label}</p>
                      <p className="text-sm text-[#54585B] mt-1">{via.desc}</p>
                    </div>
                  </label>
                ))}
            </div>
          </div>
        )}

        {/* ─── STEP 5: Declaración situación especial (ASP-16) ─── */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
              <h2 className="text-xl font-bold text-[#191C1D]" style={{ fontFamily: "Montserrat, sans-serif" }}>Declaración de Méritos</h2>
              <p className="text-sm text-[#54585B] mt-1">
                Declara si tienes alguna situación especial: mérito deportivo, campeonato, dispensa médica, etc. (ASP-16)
              </p>
            </div>
            <div>
              <label className="text-sm font-semibold text-[#191C1D] block mb-2">
                Situación especial (opcional)
              </label>
              <textarea
                id="situacion-especial"
                rows={5}
                value={situacionEspecial}
                onChange={(e) => setSituacionEspecial(e.target.value)}
                disabled={solicitudEnviada}
                placeholder="Ej: Campeón de la Comunidad de Madrid en Kumite 2025. Solicito consideración de mérito deportivo."
                className="w-full rounded border border-[#54585B]/20 px-4 py-3 text-sm text-[#191C1D] focus:outline-none focus:ring-2 focus:ring-[#7A1F2A]/30 resize-none disabled:bg-[#F8F9FA] disabled:text-[#54585B]"
              />
            </div>
          </div>
        )}

        {/* ─── STEP 6: Revisión y envío (ASP-14) ─── */}
        {step === 6 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {solicitudEnviada ? (
              <div className="text-center py-8">
                <div className="mx-auto h-16 w-16 bg-[#EAF5EF] text-[#2D6A4F] rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl">task_alt</span>
                </div>
                <h2 className="text-2xl font-bold text-[#2D6A4F]" style={{ fontFamily: "Montserrat, sans-serif" }}>¡Solicitud enviada!</h2>
                <p className="text-sm text-[#54585B] mt-2 max-w-md mx-auto">
                  La FMK ha recibido tu solicitud y procederá a revisar la documentación. Recibirás una notificación cuando tu expediente esté validado.
                </p>
              </div>
            ) : (
              <>
                <div className="text-center pb-4">
                  <div className="mx-auto h-16 w-16 bg-[#EAF5EF] text-[#2D6A4F] rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-3xl">task_alt</span>
                  </div>
                  <h2 className="text-2xl font-bold text-[#191C1D]" style={{ fontFamily: "Montserrat, sans-serif" }}>¡Casi listo!</h2>
                  <p className="text-sm text-[#54585B] mt-2 max-w-md mx-auto">
                    Revisa los datos antes de enviar. Una vez enviada, no podrás modificarla.
                  </p>
                </div>

                <div className="bg-[#F8F9FA] border border-[#54585B]/15 rounded p-4 text-sm space-y-2">
                  {convocatoriaSeleccionadaObj && (
                    <p>
                      <span className="font-bold text-[#54585B]">Convocatoria:</span>{" "}
                      {new Date(convocatoriaSeleccionadaObj.fecha_examen).toLocaleDateString("es-ES")} · {convocatoriaSeleccionadaObj.sede}
                    </p>
                  )}
                  <p><span className="font-bold text-[#54585B]">Vía Específica:</span> {viaElegida || "—"}</p>
                  <p><span className="font-bold text-[#54585B]">Documentos:</span> {documentos.length} archivo(s) adjunto(s)</p>
                  {situacionEspecial && (
                    <p><span className="font-bold text-[#54585B]">Situación especial:</span> {situacionEspecial}</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={() => { clearMessages(); setStep(Math.max(1, step - 1)); }}
          disabled={step === 1 || isPending || solicitudEnviada}
          id="btn-atras"
          className="h-11 px-6 rounded border border-[#54585B]/30 bg-white text-[#54585B] font-bold text-sm disabled:opacity-50 transition hover:bg-[#F8F9FA]"
        >
          Atrás
        </button>

        {step < 6 ? (
          <button
            onClick={async () => {
              clearMessages();
              if (step === 2) { await handleSaveDraftAndContinue(); }
              else if (step === 4 && !solicitudEnviada) { await handleSaveVia(); }
              else if (step === 5 && !solicitudEnviada) { await handleSaveDeclaracion(); }
              else { setStep(Math.min(6, step + 1)); }
            }}
            disabled={isPending}
            id="btn-siguiente"
            className="h-11 px-6 rounded bg-[#7A1F2A] text-white font-bold text-sm hover:bg-[#5B0616] transition disabled:opacity-50 flex items-center gap-2"
          >
            {isPending && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
            Siguiente
          </button>
        ) : !solicitudEnviada ? (
          <button
            onClick={handleEnviar}
            disabled={isPending}
            id="btn-enviar-solicitud"
            className="h-11 px-6 rounded bg-[#2D6A4F] text-white font-bold text-sm hover:bg-[#1B5E3A] transition disabled:opacity-50 flex items-center gap-2"
          >
            {isPending && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
            Confirmar y Enviar
          </button>
        ) : (
          <a
            href="/aspirante"
            id="btn-ir-panel"
            className="h-11 px-6 rounded bg-[#2D6A4F] text-white font-bold text-sm hover:bg-[#1B5E3A] transition flex items-center"
          >
            Ir al Panel Principal
          </a>
        )}
      </div>
    </div>
  );
}
