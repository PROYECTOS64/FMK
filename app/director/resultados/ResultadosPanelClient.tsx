"use client";

import { useState, useTransition } from "react";
import {
  registrarResultado,
  publicarResultadosProvisionales,
  generarActaOficial,
  rectificarCalificacionAuditada,
} from "./actions";

interface AspiranteResult {
  solicitudId: string;
  nombre: string;
  gradoSolicitado: string;
  viaElegida: string;
  edad: number | null;
  bloqueComun: string | null; // 'apto' | 'no_apto' | null
  bloqueEspecifico: string | null;
  estadoSolicitud: string;
}

export function ResultadosPanelClient({
  convocatoriasDisponibles,
  aspirantesIniciales,
  convocatoriaIdInicial,
  convocatoriaEstado,
}: {
  convocatoriasDisponibles: { id: string; nombre: string }[];
  aspirantesIniciales: AspiranteResult[];
  convocatoriaIdInicial: string;
  convocatoriaEstado: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedConvId, setSelectedConvId] = useState(convocatoriaIdInicial);
  const [aspirantes, setAspirantes] = useState<AspiranteResult[]>(aspirantesIniciales);

  // Modales estado
  const [califModal, setCalifModal] = useState<{
    solicitudId: string;
    bloque: "comun" | "especifico";
    grado: string;
    edad: number | null;
    via: string;
  } | null>(null);

  const [calificacionSel, setCalificacionSel] = useState<"apto" | "no_apto">("apto");
  const [votosFavor, setVotosFavor] = useState(100);
  const [comentarios, setComentarios] = useState("");

  // Subpanel Kumite Combates (DIR-25)
  const [shiaiCombates, setShiaiCombates] = useState<{ c1: string; c2: string; c3: string }>({
    c1: "gana",
    c2: "gana",
    c3: "pierde",
  });

  const [rectificarModal, setRectificarModal] = useState<{
    solicitudId: string;
    bloque: "comun" | "especifico";
    componente: string;
  } | null>(null);
  const [rectificarCal, setRectificarCal] = useState<"apto" | "no_apto">("apto");
  const [rectificarMotivo, setRectificarMotivo] = useState("");

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleRegistrar = () => {
    if (!califModal) return;

    // Calcular automático para Shiai Kumite (DIR-24/25)
    let finalCal = calificacionSel;
    let finalComentarios = comentarios;
    const esShiaiKumite =
      califModal.bloque === "especifico" &&
      califModal.via.toLowerCase() === "kumite" &&
      califModal.edad !== null &&
      califModal.edad >= 16 &&
      califModal.edad <= 22;

    if (esShiaiKumite) {
      const victorias = [shiaiCombates.c1, shiaiCombates.c2, shiaiCombates.c3].filter(
        (v) => v === "gana"
      ).length;
      finalCal = victorias >= 2 ? "apto" : "no_apto";
      finalComentarios = `[Shiai Kumite]: Combate 1: ${shiaiCombates.c1}, Combate 2: ${shiaiCombates.c2}, Combate 3: ${shiaiCombates.c3}. Victorias: ${victorias}/3. ${comentarios}`;
    }

    startTransition(async () => {
      try {
        await registrarResultado(
          califModal.solicitudId,
          califModal.bloque,
          califModal.bloque === "comun" ? "Examen Teórico/Práctico General" : `Vía ${califModal.via}`,
          finalCal,
          finalComentarios,
          califModal.bloque === "comun" ? votosFavor : undefined
        );

        setFeedback({ type: "success", message: "Calificación registrada correctamente." });
        setCalifModal(null);
        setComentarios("");
        // Reload page to reflect changes
        window.location.reload();
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message });
      }
      setTimeout(() => setFeedback(null), 5000);
    });
  };

  const handleRectificar = () => {
    if (!rectificarModal || !rectificarMotivo.trim()) return;

    startTransition(async () => {
      try {
        await rectificarCalificacionAuditada(
          rectificarModal.solicitudId,
          rectificarModal.bloque,
          rectificarModal.componente,
          rectificarCal,
          rectificarMotivo
        );

        setFeedback({ type: "success", message: "Rectificación auditada registrada con éxito." });
        setRectificarModal(null);
        setRectificarMotivo("");
        window.location.reload();
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message });
      }
      setTimeout(() => setFeedback(null), 5000);
    });
  };

  const handlePublicarProvisionales = () => {
    startTransition(async () => {
      try {
        await publicarResultadosProvisionales(selectedConvId);
        setFeedback({ type: "success", message: "Resultados provisionales publicados con éxito." });
        window.location.reload();
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message });
      }
    });
  };

  const handleGenerarActa = () => {
    if (!confirm("¿Está seguro de cerrar definitivamente la convocatoria y firmar el Acta Oficial? Esto actualizará permanentemente los grados de los aprobados.")) return;
    startTransition(async () => {
      try {
        await generarActaOficial(selectedConvId);
        setFeedback({ type: "success", message: "Acta Oficial firmada y emitida. Grados actualizados." });
        window.location.reload();
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message });
      }
    });
  };

  const isFinalizada = convocatoriaEstado === "finalizada";

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`rounded border p-3 text-sm font-semibold ${
            feedback.type === "success"
              ? "border-[#2D6A4F]/30 bg-[#EAF5EF] text-[#2D6A4F]"
              : "border-[#BA1A1A]/30 bg-[#FFF1F2] text-[#BA1A1A]"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Selector y Cierre Acta Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-[#54585B] mb-1.5">
            Seleccionar convocatoria
          </label>
          <select
            value={selectedConvId}
            onChange={(e) => {
              setSelectedConvId(e.target.value);
              window.location.href = `/director/resultados?convocatoriaId=${e.target.value}`;
            }}
            className="h-11 rounded border border-[#54585B]/30 bg-white px-3 text-sm font-semibold text-[#191C1D] min-w-[300px]"
          >
            {convocatoriasDisponibles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          {!isFinalizada && (
            <>
              <button
                type="button"
                onClick={handlePublicarProvisionales}
                disabled={isPending}
                className="h-11 rounded border border-[#7A1F2A] px-4 text-sm font-bold text-[#7A1F2A] hover:bg-[#F8E9EB]"
              >
                Publicar Prov. (DIR-26)
              </button>
              <button
                type="button"
                onClick={handleGenerarActa}
                disabled={isPending}
                className="h-11 rounded bg-[#7A1F2A] px-4 text-sm font-bold text-white hover:bg-[#5B0616] flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">verified</span>
                Firmar Acta Oficial (DIR-27)
              </button>
            </>
          )}
          {isFinalizada && (
            <div className="flex items-center gap-2">
              <span className="h-11 inline-flex items-center rounded border border-[#2D6A4F]/30 bg-[#EAF5EF] px-4 text-sm font-bold text-[#2D6A4F]">
                Acta Oficial Firmada y Cerrada
              </span>
              <a
                href={`/director/resultados/acta/${selectedConvId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 rounded border border-[#7A1F2A] px-4 text-sm font-bold text-[#7A1F2A] hover:bg-[#F8E9EB] flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">description</span>
                Ver Acta
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[#54585B]/20 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F3F4F5] text-xs uppercase tracking-wide text-[#54585B]">
              <tr>
                <th className="px-4 py-3">Aspirante</th>
                <th className="px-4 py-3">Grado</th>
                <th className="px-4 py-3">Vía</th>
                <th className="px-4 py-3 text-center">Bloque Común</th>
                <th className="px-4 py-3 text-center">Bloque Específico</th>
                <th className="px-4 py-3 text-center">Estado Acta</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#54585B]/10">
              {aspirantes.map((a) => {
                const hasComun = a.bloqueComun !== null;
                const hasEspecifico = a.bloqueEspecifico !== null;
                const esAptoComun = a.bloqueComun === "apto";

                return (
                  <tr key={a.solicitudId} className="hover:bg-[#F8F9FA]">
                    <td className="px-4 py-3 font-bold text-[#191C1D]">{a.nombre}</td>
                    <td className="px-4 py-3 font-semibold">{a.gradoSolicitado}</td>
                    <td className="px-4 py-3 text-[#54585B]">{a.viaElegida}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-bold uppercase cursor-pointer ${
                          a.bloqueComun === "apto"
                            ? "border-[#2D6A4F]/30 bg-[#EAF5EF] text-[#2D6A4F]"
                            : a.bloqueComun === "no_apto"
                            ? "border-[#BA1A1A]/30 bg-[#FFF1F2] text-[#BA1A1A]"
                            : "border-[#54585B]/20 bg-gray-100 text-gray-500"
                        }`}
                        onClick={() => {
                          if (hasComun && !isFinalizada) {
                            setRectificarModal({
                              solicitudId: a.solicitudId,
                              bloque: "comun",
                              componente: "Examen Teórico/Práctico General",
                            });
                          }
                        }}
                        title={hasComun ? "Haga clic para rectificar" : ""}
                      >
                        {a.bloqueComun || "Pendiente"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-bold uppercase cursor-pointer ${
                          a.bloqueEspecifico === "apto"
                            ? "border-[#2D6A4F]/30 bg-[#EAF5EF] text-[#2D6A4F]"
                            : a.bloqueEspecifico === "no_apto"
                            ? "border-[#BA1A1A]/30 bg-[#FFF1F2] text-[#BA1A1A]"
                            : "border-[#54585B]/20 bg-gray-100 text-gray-500"
                        }`}
                        onClick={() => {
                          if (hasEspecifico && !isFinalizada) {
                            setRectificarModal({
                              solicitudId: a.solicitudId,
                              bloque: "especifico",
                              componente: `Vía ${a.viaElegida}`,
                            });
                          }
                        }}
                        title={hasEspecifico ? "Haga clic para rectificar" : ""}
                      >
                        {a.bloqueEspecifico || "Pendiente"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center uppercase text-xs font-bold text-[#54585B]">
                      {a.estadoSolicitud}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isFinalizada && (
                        <div className="flex gap-1.5 justify-end">
                          {!hasComun && (
                            <button
                              type="button"
                              onClick={() =>
                                setCalifModal({
                                  solicitudId: a.solicitudId,
                                  bloque: "comun",
                                  grado: a.gradoSolicitado,
                                  edad: a.edad,
                                  via: a.viaElegida,
                                })
                              }
                              className="h-8 rounded border border-[#7A1F2A] px-2.5 text-xs font-bold text-[#7A1F2A] hover:bg-[#F8E9EB]"
                            >
                              + B. Común
                            </button>
                          )}
                          {esAptoComun && !hasEspecifico && (
                            <button
                              type="button"
                              onClick={() =>
                                setCalifModal({
                                  solicitudId: a.solicitudId,
                                  bloque: "especifico",
                                  grado: a.gradoSolicitado,
                                  edad: a.edad,
                                  via: a.viaElegida,
                                })
                              }
                              className="h-8 rounded border border-[#7A1F2A] px-2.5 text-xs font-bold text-[#7A1F2A] hover:bg-[#F8E9EB]"
                            >
                              + B. Específico
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calificar Modal */}
      {califModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-bold text-[#191C1D]" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Calificar Bloque {califModal.bloque === "comun" ? "Común" : "Específico"}
            </h3>
            <p className="text-xs text-[#54585B] mt-1">
              Aspirante para {califModal.grado} · Vía {califModal.via}
            </p>

            <div className="mt-4 space-y-4">
              {/* Shiai Kumite Adaptation DIR-24/25 */}
              {califModal.bloque === "especifico" &&
              califModal.via.toLowerCase() === "kumite" &&
              califModal.edad !== null &&
              califModal.edad >= 16 &&
              califModal.edad <= 22 ? (
                <div className="rounded border border-[#7A1F2A]/20 bg-[#FFF8F8] p-3 space-y-3">
                  <p className="text-xs font-bold text-[#7A1F2A]">
                    Regla Especial Shiai Kumite (Aspirante de {califModal.edad} años, 2 mins)
                  </p>
                  <p className="text-[11px] text-[#54585B]">
                    Debe ganar al menos 2 de los 3 combates reglamentarios de Shiai para ser Apto (o pasar a repesca).
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {["c1", "c2", "c3"].map((cName) => (
                      <div key={cName}>
                        <label className="block text-[10px] font-bold text-[#54585B] uppercase mb-1">
                          Combate {cName.replace("c", "")}
                        </label>
                        <select
                          value={(shiaiCombates as any)[cName]}
                          onChange={(e) =>
                            setShiaiCombates({ ...shiaiCombates, [cName]: e.target.value })
                          }
                          className="w-full h-8 rounded border border-[#54585B]/30 px-2 text-xs bg-white"
                        >
                          <option value="gana">Ganado</option>
                          <option value="pierde">Perdido</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase text-[#54585B] mb-1">Calificación</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="calif"
                        checked={calificacionSel === "apto"}
                        onChange={() => setCalificacionSel("apto")}
                        className="accent-[#7A1F2A]"
                      />
                      <span className="text-sm font-semibold text-[#2D6A4F]">APTO</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="calif"
                        checked={calificacionSel === "no_apto"}
                        onChange={() => setCalificacionSel("no_apto")}
                        className="accent-[#7A1F2A]"
                      />
                      <span className="text-sm font-semibold text-[#BA1A1A]">NO APTO</span>
                    </label>
                  </div>
                </div>
              )}

              {/* 5º Dan+ 80% Votos DIR-23 */}
              {califModal.bloque === "comun" &&
                ["5º Dan", "6º Dan", "7º Dan", "8º Dan", "9º Dan", "10º Dan"].includes(califModal.grado) && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#54585B] mb-1">
                      Porcentaje de votos favorables del tribunal (Min. 80% para Apto)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={votosFavor}
                      onChange={(e) => setVotosFavor(Number(e.target.value))}
                      className="w-full h-10 rounded border border-[#54585B]/30 px-3 text-sm"
                    />
                  </div>
                )}

              <div>
                <label className="block text-xs font-bold uppercase text-[#54585B] mb-1">Comentarios / Observaciones</label>
                <textarea
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  placeholder="Detalles sobre la ejecución técnica del kata, kumite..."
                  rows={3}
                  className="w-full rounded border border-[#54585B]/30 px-3 py-2 text-sm resize-none bg-[#F8F9FA]"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCalifModal(null)}
                className="h-10 rounded border border-[#54585B]/30 bg-white px-4 text-sm font-bold text-[#54585B] hover:bg-[#F8F9FA] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleRegistrar}
                className="h-10 rounded bg-[#7A1F2A] px-4 text-sm font-bold text-white hover:bg-[#5B0616] transition"
              >
                {isPending ? "Guardando..." : "Confirmar Calificación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rectificar Modal DIR-30 */}
      {rectificarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-bold text-[#191C1D]" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Rectificación Auditada (DIR-30)
            </h3>
            <p className="text-xs text-[#54585B] mt-1">
              Modifica la calificación ya asentada. Esta acción se auditará con justificación obligatoria.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#54585B] mb-1">Nueva Calificación</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="rectif"
                      checked={rectificarCal === "apto"}
                      onChange={() => setRectificarCal("apto")}
                      className="accent-[#7A1F2A]"
                    />
                    <span className="text-sm font-semibold text-[#2D6A4F]">APTO</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="rectif"
                      checked={rectificarCal === "no_apto"}
                      onChange={() => setRectificarCal("no_apto")}
                      className="accent-[#7A1F2A]"
                    />
                    <span className="text-sm font-semibold text-[#BA1A1A]">NO APTO</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#54585B] mb-1">Motivo / Justificación Obligatoria</label>
                <textarea
                  value={rectificarMotivo}
                  onChange={(e) => setRectificarMotivo(e.target.value)}
                  placeholder="Motivo de la rectificación de nota..."
                  rows={3}
                  className="w-full rounded border border-[#BA1A1A]/30 bg-[#FFF1F2] px-3 py-2 text-sm focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRectificarModal(null)}
                className="h-10 rounded border border-[#54585B]/30 bg-white px-4 text-sm font-bold text-[#54585B] hover:bg-[#F8F9FA] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending || !rectificarMotivo.trim()}
                onClick={handleRectificar}
                className="h-10 rounded bg-[#BA1A1A] px-4 text-sm font-bold text-white hover:bg-[#8B0000] transition"
              >
                {isPending ? "Procesando..." : "Confirmar Rectificación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
