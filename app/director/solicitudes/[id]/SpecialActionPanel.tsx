"use client";

import { useState, useTransition } from "react";
import {
  aplicarExencionCuota,
  resolverDispensaMedica,
  tramitarConvalidacion,
} from "../../resultados/actions";

export function SpecialActionPanel({
  solicitudId,
  solicitudEstado,
  estadoPago,
  importeFinal,
  situacionEspecial,
}: {
  solicitudId: string;
  solicitudEstado: string;
  estadoPago: string;
  importeFinal: number | null;
  situacionEspecial: string | null;
}) {
  const [isPending, startTransition]               = useTransition();
  const [showDispensaModal, setShowDispensaModal]  = useState(false);
  const [aprobarDispensa, setAprobarDispensa]      = useState(true);
  const [motivoDispensaDenegada, setMotivoDispensaDenegada] = useState("");
  const [showConvalidaModal, setShowConvalidaModal] = useState(false);
  const [resolucionConvalida, setResolucionConvalida] = useState<"convalidado" | "convalidado_inferior" | "denegado">("convalidado");
  const [gradoOtorgado, setGradoOtorgado] = useState("");
  const [informeJunta, setInformeJunta]   = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const triggerExencion = (tipo: "campeon_mundo" | "repetidor" | "ninguna") => {
    startTransition(async () => {
      try {
        const res = await aplicarExencionCuota(solicitudId, tipo);
        setFeedback({
          type: "success",
          message: `Exención aplicada con éxito. Nuevo importe: ${res.nuevoImporte} €`,
        });
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message });
      }
      setTimeout(() => setFeedback(null), 5000);
    });
  };

  const handleDispensa = () => {
    startTransition(async () => {
      try {
        await resolverDispensaMedica(
          solicitudId,
          aprobarDispensa,
          motivoDispensaDenegada
        );
        setFeedback({
          type: "success",
          message: `Dispensa médica ${aprobarDispensa ? "aprobada" : "denegada"} con éxito.`,
        });
        setShowDispensaModal(false);
        setMotivoDispensaDenegada("");
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message });
      }
      setTimeout(() => setFeedback(null), 5000);
    });
  };

  const handleConvalidacion = () => {
    startTransition(async () => {
      try {
        await tramitarConvalidacion(
          solicitudId,
          resolucionConvalida,
          gradoOtorgado,
          informeJunta
        );
        setFeedback({
          type: "success",
          message: "Trámite de convalidación guardado correctamente.",
        });
        setShowConvalidaModal(false);
        setGradoOtorgado("");
        setInformeJunta("");
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message });
      }
      setTimeout(() => setFeedback(null), 5000);
    });
  };

  return (
    <div className="space-y-4">

      {/* Feedback */}
      {feedback && (
        <div className={`rounded border p-3 text-sm font-semibold ${
          feedback.type === "success"
            ? "border-[#2D6A4F]/30 bg-[#EAF5EF] text-[#2D6A4F]"
            : "border-[#BA1A1A]/30 bg-[#FFF1F2] text-[#BA1A1A]"
        }`}>
          {feedback.message}
        </div>
      )}

      {/* ── Gestión de Cuota / Exenciones ── */}
      <section className="rounded-lg border border-[#54585B]/20 bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-[#54585B] mb-3">
          Gestión de Cuota / Exenciones (DIR-31 a DIR-33)
        </p>
        <p className="text-xs text-[#54585B] mb-4">
          Importe actual:{" "}
          <strong>{importeFinal != null && importeFinal > 0 ? `${importeFinal} €` : "—"}</strong>
          {" · "}Estado de pago:{" "}
          <strong className="uppercase">{estadoPago}</strong>
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => triggerExencion("campeon_mundo")}
            className="h-9 rounded bg-[#7A1F2A] px-3 text-xs font-bold text-white hover:bg-[#5B0616] transition disabled:opacity-50"
          >
            Exención 100% (Campeón del Mundo)
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => triggerExencion("repetidor")}
            className="h-9 rounded border border-[#7A1F2A] px-3 text-xs font-bold text-[#7A1F2A] hover:bg-[#F8E9EB] transition disabled:opacity-50"
          >
            Reducción 50% (Repetidor &lt;1 año)
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => triggerExencion("ninguna")}
            className="h-9 rounded border border-[#54585B]/30 px-3 text-xs font-bold text-[#54585B] hover:bg-[#F3F4F5] transition disabled:opacity-50"
          >
            Restaurar Cuota Normal
          </button>
        </div>
      </section>

      {/* ── Dispensas y Convalidaciones — solo si el aspirante declaró situación especial ── */}
      {situacionEspecial && (
        <section className="rounded-lg border border-[#54585B]/20 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[#54585B] mb-3">
            Dispensas Médicas y Convalidaciones (DIR-34 a DIR-38)
          </p>

          {/* Mostrar qué declaró el aspirante */}
          <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2">
            <p className="text-xs text-yellow-800">
              <span className="font-bold">Situación declarada por el aspirante:</span>{" "}
              {situacionEspecial}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowDispensaModal(true)}
              className="h-9 rounded border border-[#54585B]/30 bg-white px-3 text-xs font-bold text-[#191C1D] hover:bg-[#F3F4F5] transition"
            >
              Tramitar Dispensa Médica
            </button>
            <button
              type="button"
              onClick={() => setShowConvalidaModal(true)}
              className="h-9 rounded border border-[#54585B]/30 bg-white px-3 text-xs font-bold text-[#191C1D] hover:bg-[#F3F4F5] transition"
            >
              Tramitar Convalidación / Méritos
            </button>
          </div>
        </section>
      )}

      {/* ── Modal Dispensa Médica ── */}
      {showDispensaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3
              className="text-lg font-bold text-[#191C1D]"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Tramitar Dispensa Médica
            </h3>
            <p className="mt-2 text-sm text-[#54585B]">
              Valida el certificado médico aportado. Aprobar la dispensa
              adaptará los requisitos técnicos correspondientes en el examen.
            </p>
            <div className="mt-4 flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="aprobarDispensa"
                  checked={aprobarDispensa}
                  onChange={() => setAprobarDispensa(true)}
                  className="accent-[#7A1F2A]"
                />
                <span className="text-sm font-semibold text-[#191C1D]">
                  Autorizar Dispensa
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="aprobarDispensa"
                  checked={!aprobarDispensa}
                  onChange={() => setAprobarDispensa(false)}
                  className="accent-[#7A1F2A]"
                />
                <span className="text-sm font-semibold text-[#BA1A1A]">
                  Denegar Dispensa
                </span>
              </label>
            </div>
            {!aprobarDispensa && (
              <textarea
                value={motivoDispensaDenegada}
                onChange={(e) => setMotivoDispensaDenegada(e.target.value)}
                placeholder="Indique el motivo de la denegación (obligatorio)..."
                rows={3}
                className="mt-3 w-full rounded border border-[#BA1A1A]/30 bg-[#FFF1F2] px-3 py-2 text-sm text-[#191C1D] focus:outline-none resize-none"
              />
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDispensaModal(false)}
                className="h-10 rounded border border-[#54585B]/30 bg-white px-4 text-sm font-bold text-[#54585B] hover:bg-[#F8F9FA] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  isPending ||
                  (!aprobarDispensa && !motivoDispensaDenegada.trim())
                }
                onClick={handleDispensa}
                className="h-10 rounded bg-[#7A1F2A] px-4 text-sm font-bold text-white hover:bg-[#5B0616] transition disabled:opacity-50"
              >
                {isPending ? "Procesando..." : "Guardar Resolución"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Convalidación ── */}
      {showConvalidaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3
              className="text-lg font-bold text-[#191C1D]"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Tramitar Convalidación / Méritos
            </h3>
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[#54585B] mb-1">
                  Resolución
                </label>
                <select
                  value={resolucionConvalida}
                  onChange={(e) =>
                    setResolucionConvalida(e.target.value as any)
                  }
                  className="w-full h-10 rounded border border-[#54585B]/30 px-3 text-sm bg-white font-semibold text-[#191C1D]"
                >
                  <option value="convalidado">
                    Convalidado (Aprobar grado solicitado)
                  </option>
                  <option value="convalidado_inferior">
                    Convalidado con grado inferior
                  </option>
                  <option value="denegado">Denegar convalidación</option>
                </select>
              </div>

              {resolucionConvalida === "convalidado_inferior" && (
                <div>
                  <label className="block text-xs font-bold uppercase text-[#54585B] mb-1">
                    Grado Otorgado
                  </label>
                  <input
                    type="text"
                    value={gradoOtorgado}
                    onChange={(e) => setGradoOtorgado(e.target.value)}
                    placeholder="Ej: 1º Dan (si solicitó 2º Dan)"
                    className="w-full h-10 rounded border border-[#54585B]/30 px-3 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-[#54585B] mb-1">
                  Informe Técnico / Justificación
                </label>
                <textarea
                  value={informeJunta}
                  onChange={(e) => setInformeJunta(e.target.value)}
                  placeholder="Escriba las conclusiones técnicas o el informe para la Junta Directiva..."
                  rows={3}
                  className="w-full rounded border border-[#54585B]/30 px-3 py-2 text-sm focus:outline-none resize-none bg-[#F8F9FA]"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConvalidaModal(false)}
                className="h-10 rounded border border-[#54585B]/30 bg-white px-4 text-sm font-bold text-[#54585B] hover:bg-[#F8F9FA] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending || !informeJunta.trim()}
                onClick={handleConvalidacion}
                className="h-10 rounded bg-[#7A1F2A] px-4 text-sm font-bold text-white hover:bg-[#5B0616] transition disabled:opacity-50"
              >
                {isPending ? "Procesando..." : "Guardar Resolución"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}