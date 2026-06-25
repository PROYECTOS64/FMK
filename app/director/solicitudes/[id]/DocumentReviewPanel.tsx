"use client";

import { useState, useTransition } from "react";
import {
  validarDocumento,
  rechazarDocumento,
  rechazarSolicitudDefinitiva,
  validarFirmaCompetente,
} from "../actions";

function DocStatusIcon({ estado }: { estado: string }) {
  if (estado === "validado") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-[#2D6A4F]">
        <span className="material-symbols-outlined text-[16px]">check_circle</span>
        Validado
      </span>
    );
  }
  if (estado === "rechazado") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-[#BA1A1A]">
        <span className="material-symbols-outlined text-[16px]">cancel</span>
        Rechazado
      </span>
    );
  }
  if (estado === "en_revision") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-[#7A1F2A]">
        <span className="material-symbols-outlined text-[16px]">visibility</span>
        En revisión
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-[#54585B]">
      <span className="material-symbols-outlined text-[16px]">pending</span>
      Pendiente
    </span>
  );
}

// DIR-13: Types of authorized signatures
const TIPOS_FIRMA = [
  { value: "entrenador_nacional", label: "Entrenador Nacional" },
  { value: "tecnico_deportivo_superior", label: "Técnico Deportivo Superior" },
  { value: "director_grados", label: "Director de Grados" },
  { value: "otro", label: "Otro (no autorizado)" },
];

interface Documento {
  id: string;
  tipo: string;
  estado_validacion: string;
  comentarios_revision: string | null;
  created_at: string;
  bucket_path: string;
}

export function DocumentReviewPanel({
  solicitudId,
  solicitudEstado,
  documentos,
  gradoSolicitado,
}: {
  solicitudId: string;
  solicitudEstado: string;
  documentos: Documento[];
  gradoSolicitado: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [firmaDocId, setFirmaDocId] = useState<string | null>(null);
  const [tipoFirmante, setTipoFirmante] = useState("");
  const [showRejectSolicitud, setShowRejectSolicitud] = useState(false);
  const [rejectSolicitudReason, setRejectSolicitudReason] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const canReview = solicitudEstado !== "rechazada" && solicitudEstado !== "validada" && solicitudEstado !== "finalizada";

  // Is this a carnet de cinturón marrón?
  const isCarnetMarron = (tipo: string) =>
    tipo.toLowerCase().includes("carnet") && tipo.toLowerCase().includes("grado");

  // DIR-08: Validate a document
  const handleValidate = (docId: string, tipo: string) => {
    // DIR-13: If it's a carnet de grados, require firma validation
    if (isCarnetMarron(tipo)) {
      setFirmaDocId(docId);
      return;
    }

    startTransition(async () => {
      try {
        const result = await validarDocumento(docId);
        if (result.solicitudValidada) {
          setFeedback({
            type: "success",
            message: "✅ Todos los documentos validados. La solicitud ha sido aprobada automáticamente.",
          });
        } else {
          setFeedback({ type: "success", message: "Documento validado correctamente." });
        }
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message });
      }
      setTimeout(() => setFeedback(null), 5000);
    });
  };

  // DIR-09 / DIR-10: Reject a document with reason
  const handleReject = () => {
    if (!rejectingDocId || !rejectReason.trim()) return;
    startTransition(async () => {
      try {
        await rechazarDocumento(rejectingDocId, rejectReason);
        setFeedback({
          type: "success",
          message: "Documento rechazado. Solicitud marcada como documentación incompleta.",
        });
        setRejectingDocId(null);
        setRejectReason("");
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message });
      }
      setTimeout(() => setFeedback(null), 5000);
    });
  };

  // DIR-13: Validate firma competente
  const handleFirmaValidation = () => {
    if (!firmaDocId || !tipoFirmante) return;
    const firmaAutorizada = tipoFirmante !== "otro";
    startTransition(async () => {
      try {
        const result = await validarFirmaCompetente(firmaDocId, firmaAutorizada, tipoFirmante);
        if (result.firmaValida === false) {
          setFeedback({
            type: "error",
            message: "⚠ Firma no competente. El documento ha sido rechazado.",
          });
        } else if (result.solicitudValidada) {
          setFeedback({
            type: "success",
            message: "✅ Firma validada. Todos los documentos aprobados. Solicitud validada automáticamente.",
          });
        } else {
          setFeedback({ type: "success", message: "Firma validada correctamente." });
        }
        setFirmaDocId(null);
        setTipoFirmante("");
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message });
      }
      setTimeout(() => setFeedback(null), 5000);
    });
  };

  // DIR-12: Reject solicitud definitively
  const handleRejectSolicitud = () => {
    if (!rejectSolicitudReason.trim()) return;
    startTransition(async () => {
      try {
        await rechazarSolicitudDefinitiva(solicitudId, rejectSolicitudReason);
        setFeedback({
          type: "success",
          message: "Solicitud rechazada definitivamente por falsificación documental.",
        });
        setShowRejectSolicitud(false);
        setRejectSolicitudReason("");
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message });
      }
      setTimeout(() => setFeedback(null), 5000);
    });
  };

  return (
    <section className="rounded-lg border border-[#54585B]/20 bg-white">
      <div className="border-b border-[#54585B]/15 p-5 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#54585B]">
            Checklist documental
          </p>
          <h2
            className="mt-1 text-lg font-bold text-[#191C1D]"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Documentos requeridos
          </h2>
        </div>
        {canReview && (
          <button
            type="button"
            onClick={() => setShowRejectSolicitud(true)}
            className="h-9 rounded border border-[#BA1A1A]/30 bg-white px-3 text-xs font-bold text-[#BA1A1A] hover:bg-[#FFF1F2] transition"
          >
            Rechazar solicitud (DIR-12)
          </button>
        )}
      </div>

      {/* Feedback */}
      {feedback && (

        <div
          className={`mx-5 mt-4 rounded border p-3 text-sm font-semibold ${
            feedback.type === "success"
              ? "border-[#2D6A4F]/30 bg-[#EAF5EF] text-[#2D6A4F]"
              : "border-[#BA1A1A]/30 bg-[#FFF1F2] text-[#BA1A1A]"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Botón manual para validar solicitud cuando todos los docs están validados */}
      {solicitudEstado === "en_revision" &&
        documentos.length > 0 &&
        documentos.every((d) => d.estado_validacion === "validado") && (
          <div className="mx-5 mt-4 rounded-lg border border-[#2D6A4F]/30 bg-[#EAF5EF] p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#2D6A4F]">
                ✅ Todos los documentos han sido validados
              </p>
              <p className="text-xs text-[#2D6A4F]/80 mt-0.5">
                Puedes aprobar la solicitud manualmente para continuar con el proceso.
              </p>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    const { marcarSolicitudValidada } = await import("../actions");
                    await marcarSolicitudValidada(solicitudId);
                    setFeedback({
                      type: "success",
                      message: "✅ Solicitud marcada como validada correctamente.",
                    });
                  } catch (err: any) {
                    setFeedback({ type: "error", message: err.message });
                  }
                  setTimeout(() => setFeedback(null), 5000);
                });
              }}
              className="shrink-0 h-10 rounded bg-[#2D6A4F] px-4 text-sm font-bold text-white hover:bg-[#1B5E3A] transition disabled:opacity-50"
            >
              {isPending ? "Procesando..." : "Aprobar solicitud"}
            </button>
          </div>
        )}

      {/* Document list */}
      <div className="divide-y divide-[#54585B]/10">
        {documentos.length === 0 ? (
          <div className="p-8 text-center">
            <span className="material-symbols-outlined text-[36px] text-[#54585B]/30">
              description
            </span>
            <p className="mt-2 text-sm text-[#54585B]">No hay documentos cargados aún.</p>
          </div>
        ) : (
          documentos.map((doc) => (
            <div key={doc.id} className="px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold ${
                      doc.estado_validacion === "validado"
                        ? "border-[#2D6A4F] bg-[#EAF5EF] text-[#2D6A4F]"
                        : doc.estado_validacion === "rechazado"
                        ? "border-[#BA1A1A] bg-[#FFF1F2] text-[#BA1A1A]"
                        : "border-[#7A1F2A] bg-white text-[#7A1F2A]"
                    }`}
                  >
                    {doc.estado_validacion === "validado"
                      ? "✓"
                      : doc.estado_validacion === "rechazado"
                      ? "✗"
                      : "!"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#191C1D] truncate">{doc.tipo}</p>
                    <p className="text-xs text-[#54585B]">
                      Cargado:{" "}
                      {new Date(doc.created_at).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <DocStatusIcon estado={doc.estado_validacion} />
                  {canReview &&
                    doc.estado_validacion !== "validado" &&
                    doc.estado_validacion !== "rechazado" && (
                      <div className="flex gap-1.5 ml-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleValidate(doc.id, doc.tipo)}
                          className="h-8 rounded bg-[#2D6A4F] px-3 text-xs font-bold text-white hover:bg-[#1B5E3A] transition disabled:opacity-50"
                        >
                          Validar
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            setRejectingDocId(doc.id);
                            setRejectReason("");
                          }}
                          className="h-8 rounded border border-[#BA1A1A]/30 px-3 text-xs font-bold text-[#BA1A1A] hover:bg-[#FFF1F2] transition disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                </div>
              </div>

              {/* Show rejection reason if rejected */}
              {doc.estado_validacion === "rechazado" && doc.comentarios_revision && (
                <div className="mt-2 ml-11 rounded border border-[#BA1A1A]/15 bg-[#FFF1F2] px-3 py-2">
                  <p className="text-xs text-[#BA1A1A]">
                    <strong>Motivo:</strong> {doc.comentarios_revision}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* DIR-09/10: Reject document modal */}
      {rejectingDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3
              className="text-lg font-bold text-[#191C1D]"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Rechazar documento
            </h3>
            <p className="mt-2 text-sm text-[#54585B]">
              Indique el motivo del rechazo. El aspirante será notificado y la solicitud pasará a
              estado &quot;Documentación incompleta&quot;.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ej: Imagen ilegible, documento incompleto, falta aval del Entrenador Nacional..."
              rows={4}
              className="mt-3 w-full rounded border border-[#54585B]/30 bg-[#F8F9FA] px-3 py-2 text-sm text-[#191C1D] placeholder:text-[#54585B]/50 focus:border-[#7A1F2A] focus:outline-none resize-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingDocId(null);
                  setRejectReason("");
                }}
                className="h-10 rounded border border-[#54585B]/30 bg-white px-4 text-sm font-bold text-[#54585B] hover:bg-[#F8F9FA] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim() || isPending}
                onClick={handleReject}
                className="h-10 rounded bg-[#BA1A1A] px-4 text-sm font-bold text-white hover:bg-[#8B0000] transition disabled:opacity-50"
              >
                {isPending ? "Procesando..." : "Confirmar rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIR-13: Firma competente modal */}
      {firmaDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3
              className="text-lg font-bold text-[#191C1D]"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Validación de firma competente
            </h3>
            <p className="mt-2 text-sm text-[#54585B]">
              El carnet de cinturón marrón debe estar firmado por una persona competente. Seleccione
              el tipo de firmante:
            </p>
            <div className="mt-4 space-y-2">
              {TIPOS_FIRMA.map((tf) => (
                <label
                  key={tf.value}
                  className={`flex items-center gap-3 rounded border p-3 cursor-pointer transition ${
                    tipoFirmante === tf.value
                      ? tf.value === "otro"
                        ? "border-[#BA1A1A]/40 bg-[#FFF1F2]"
                        : "border-[#7A1F2A]/40 bg-[#F8E9EB]"
                      : "border-[#54585B]/20 hover:border-[#54585B]/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="tipoFirmante"
                    value={tf.value}
                    checked={tipoFirmante === tf.value}
                    onChange={(e) => setTipoFirmante(e.target.value)}
                    className="accent-[#7A1F2A]"
                  />
                  <span
                    className={`text-sm font-semibold ${
                      tf.value === "otro" ? "text-[#BA1A1A]" : "text-[#191C1D]"
                    }`}
                  >
                    {tf.label}
                  </span>
                </label>
              ))}
            </div>
            {tipoFirmante === "otro" && (
              <div className="mt-3 rounded border border-[#BA1A1A]/20 bg-[#FFF1F2] p-3">
                <p className="text-xs text-[#BA1A1A] font-semibold">
                  ⚠ Solo se aceptan firmas de Entrenador Nacional, Técnico Deportivo Superior o
                  Director de Grados. Seleccionar esta opción rechazará el documento.
                </p>
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setFirmaDocId(null);
                  setTipoFirmante("");
                }}
                className="h-10 rounded border border-[#54585B]/30 bg-white px-4 text-sm font-bold text-[#54585B] hover:bg-[#F8F9FA] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!tipoFirmante || isPending}
                onClick={handleFirmaValidation}
                className={`h-10 rounded px-4 text-sm font-bold text-white transition disabled:opacity-50 ${
                  tipoFirmante === "otro"
                    ? "bg-[#BA1A1A] hover:bg-[#8B0000]"
                    : "bg-[#2D6A4F] hover:bg-[#1B5E3A]"
                }`}
              >
                {isPending
                  ? "Procesando..."
                  : tipoFirmante === "otro"
                  ? "Rechazar documento"
                  : "Validar firma"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIR-12: Reject solicitud definitively modal */}
      {showRejectSolicitud && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[28px] text-[#BA1A1A] mt-0.5">
                gpp_bad
              </span>
              <div>
                <h3
                  className="text-lg font-bold text-[#BA1A1A]"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  Rechazo definitivo de solicitud
                </h3>
                <p className="mt-1 text-sm text-[#54585B]">
                  Esta acción es irreversible. La solicitud será rechazada definitivamente por
                  falsificación documental. El aspirante será notificado.
                </p>
              </div>
            </div>
            <textarea
              value={rejectSolicitudReason}
              onChange={(e) => setRejectSolicitudReason(e.target.value)}
              placeholder="Describa el motivo de rechazo definitivo (obligatorio)..."
              rows={4}
              className="mt-4 w-full rounded border border-[#BA1A1A]/30 bg-[#FFF1F2] px-3 py-2 text-sm text-[#191C1D] placeholder:text-[#54585B]/50 focus:border-[#BA1A1A] focus:outline-none resize-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowRejectSolicitud(false);
                  setRejectSolicitudReason("");
                }}
                className="h-10 rounded border border-[#54585B]/30 bg-white px-4 text-sm font-bold text-[#54585B] hover:bg-[#F8F9FA] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!rejectSolicitudReason.trim() || isPending}
                onClick={handleRejectSolicitud}
                className="h-10 rounded bg-[#BA1A1A] px-4 text-sm font-bold text-white hover:bg-[#8B0000] transition disabled:opacity-50"
              >
                {isPending ? "Procesando..." : "Rechazar definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
