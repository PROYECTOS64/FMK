"use client";

import { useState, useTransition, useEffect } from "react";
import { getMisResultados, solicitarInformeNoApto } from "@/app/aspirante/actions";

// ── Helpers ────────────────────────────────────────────────────────────────

// Convierte el estado interno de la solicitud a lo que debe VER el aspirante
function resolverResultado(sol: any): {
  etiqueta: string;
  esApto: boolean;
  esNoApto: boolean;
  esProvisional: boolean;
  esDefinitivo: boolean;
  pendiente: boolean;
} {
  const resList     = sol.resultados ?? [];
  const bloqueComun = resList.find((r: any) => r.bloque === "comun");
  const bloqueEsp   = resList.find((r: any) => r.bloque === "especifico");

  // PRIMERO: si hay bloques calificados, el resultado viene de los bloques
  // independientemente del estado de la solicitud
  if (bloqueComun?.calificacion) {
    const aptoBloques =
      bloqueComun.calificacion === "apto" &&
      (bloqueEsp?.calificacion === "apto" || !bloqueEsp);

    const esDefinitivo =
      ["finalizada", "rechazada"].includes(sol.estado) ||
      resList.some((r: any) => r.estado_definitivo === true);

    return {
      etiqueta:      aptoBloques ? "APTO" : "NO APTO",
      esApto:        aptoBloques,
      esNoApto:      !aptoBloques,
      esProvisional: !esDefinitivo,
      esDefinitivo,
      pendiente:     false,
    };
  }

  // SEGUNDO: sin bloques calificados, mirar el estado
  if (["finalizada", "rechazada"].includes(sol.estado)) {
    return {
      etiqueta: "NO APTO", esApto: false, esNoApto: true,
      esProvisional: false, esDefinitivo: true, pendiente: false,
    };
  }

  // Sin resultados publicados aún
  return {
    etiqueta: "PENDIENTE", esApto: false, esNoApto: false,
    esProvisional: false, esDefinitivo: false, pendiente: true,
  };
}



// ── Página ─────────────────────────────────────────────────────────────────
export default function ResultadoAspirantePage() {
  const [solicitudes, setSolicitudes]   = useState<any[]>([]);
  const [isPending, startTransition]    = useTransition();
  const [info, setInfo]                 = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    startTransition(async () => {
      const data = await getMisResultados();
      setSolicitudes(data.solicitudes);
    });
  }, []);

  async function handleSolicitarInforme(solicitudId: string) {
    setInfo(null);
    setError(null);
    startTransition(async () => {
      const result = await solicitarInformeNoApto(solicitudId);
      if ("error" in result) {
        setError(result.error ?? "Error");
      } else {
        setInfo(result.mensaje ?? "Solicitud de informe registrada.");
      }
    });
  }

  if (isPending && solicitudes.length === 0) {
    return (
      <div className="mx-auto max-w-4xl flex items-center gap-3 py-12 text-[#54585B] text-sm">
        <span className="material-symbols-outlined animate-spin text-[#7A1F2A]">progress_activity</span>
        Cargando resultados…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6">
      <div className="border-b border-[#54585B]/20 pb-6 mb-6">
        <p className="text-xs font-bold uppercase tracking-wide text-[#7A1F2A]">Publicación Oficial</p>
        <h1 className="mt-2 text-3xl font-bold text-[#191C1D]" style={{ fontFamily: "Montserrat, sans-serif" }}>
          Mis Resultados
        </h1>
        <p className="mt-1 text-sm text-[#54585B]">Historial de resultados de examen de grado.</p>
      </div>

      {info && (
        <div className="mb-4 rounded border border-[#2D6A4F]/30 bg-[#EAF5EF] px-4 py-3 flex gap-2">
          <span className="material-symbols-outlined text-[#2D6A4F]">check_circle</span>
          <p className="text-sm text-[#2D6A4F]">{info}</p>
        </div>
      )}
      {error && (
        <div className="mb-4 rounded border border-[#BA1A1A]/30 bg-[#FFF1F2] px-4 py-3 flex gap-2">
          <span className="material-symbols-outlined text-[#BA1A1A]">error</span>
          <p className="text-sm text-[#BA1A1A]">{error}</p>
        </div>
      )}

      {solicitudes.length === 0 ? (
        <div className="rounded-lg border border-[#54585B]/20 bg-white p-10 text-center">
          <span className="material-symbols-outlined text-4xl text-[#54585B]/40 mb-3 block">emoji_events</span>
          <p className="text-sm text-[#54585B]">Todavía no tienes resultados de examen registrados.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {solicitudes.map((sol: any) => {
            const conv        = sol.convocatorias;
            const res         = resolverResultado(sol);
            const bloqueComun = sol.resultados?.find((r: any) => r.bloque === "comun");
            const bloqueEsp   = sol.resultados?.find((r: any) => r.bloque === "especifico");
            const comentarios = sol.resultados?.find((r: any) => r.comentarios)?.comentarios;

            // Colores según resultado
            const colorBg   = res.esApto   ? "bg-[#EAF5EF]"
                            : res.esNoApto ? "bg-[#FFF1F2]"
                            : "bg-[#F8F9FA]";
            const colorText = res.esApto   ? "text-[#2D6A4F]"
                            : res.esNoApto ? "text-[#BA1A1A]"
                            : "text-[#54585B]";
            const icon      = res.esApto   ? "workspace_premium"
                            : res.esNoApto ? "sentiment_dissatisfied"
                            : "hourglass_empty";

            return (
              <div key={sol.id} className="rounded-lg border border-[#54585B]/20 bg-white overflow-hidden">

                {/* Header */}
                <div className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#54585B]/10 ${colorBg}`}>
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-2xl ${colorText}`}>{icon}</span>
                    <div>
                      <p className={`font-bold text-lg ${colorText}`}>{res.etiqueta}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {/* Badge provisional / definitivo */}
                        {res.esDefinitivo ? (
                          <span className="inline-flex items-center gap-1 rounded border border-[#2D6A4F]/30 bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-[#2D6A4F]">
                            <span className="material-symbols-outlined text-[11px]">verified</span>
                            Resultado Definitivo
                          </span>
                        ) : res.esProvisional ? (
                          <span className="inline-flex items-center gap-1 rounded border border-[#7A1F2A]/30 bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-[#7A1F2A]">
                            <span className="material-symbols-outlined text-[11px]">schedule</span>
                            Resultado Provisional
                          </span>
                        ) : res.pendiente ? (
                          <span className="inline-flex items-center gap-1 rounded border border-[#54585B]/30 bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-[#54585B]">
                            <span className="material-symbols-outlined text-[11px]">hourglass_empty</span>
                            Pendiente de publicación
                          </span>
                        ) : null}
                        {conv && (
                          <span className="text-xs text-[#54585B]">
                            · {new Date(conv.fecha_examen).toLocaleDateString("es-ES")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#191C1D]">{sol.grado_solicitado}</p>
                    <p className="text-xs text-[#54585B]">{conv?.sede}</p>
                  </div>
                </div>

                {/* Desglose */}
                <div className="px-4 sm:px-6 py-4 grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-bold text-[#191C1D] uppercase text-xs tracking-wide mb-3">
                      Desglose de Calificación
                    </h3>

                    {!bloqueComun && !bloqueEsp ? (
                      <p className="text-sm text-[#54585B] italic">
                        Los resultados aún no han sido publicados por el Departamento de Grados.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {bloqueComun && (
                          <div className="flex justify-between items-center border-b border-[#54585B]/10 pb-2">
                            <span className="text-sm text-[#54585B]">Bloque Común</span>
                            <span className={`text-sm font-bold uppercase ${
                              bloqueComun.calificacion === "apto" ? "text-[#2D6A4F]" : "text-[#BA1A1A]"
                            }`}>
                              {bloqueComun.calificacion?.replace("_", " ")}
                            </span>
                          </div>
                        )}
                        {bloqueEsp && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-[#54585B]">
                              Bloque Específico ({sol.via_elegida ?? "—"})
                            </span>
                            <span className={`text-sm font-bold uppercase ${
                              bloqueEsp.calificacion === "apto" ? "text-[#2D6A4F]" : "text-[#BA1A1A]"
                            }`}>
                              {bloqueEsp.calificacion?.replace("_", " ")}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {comentarios && (
                      <div className="mt-4 rounded border border-[#54585B]/15 bg-[#F8F9FA] p-3">
                        <p className="text-xs font-bold uppercase text-[#54585B] mb-1">
                          Comentarios del Tribunal
                        </p>
                        <p className="text-sm text-[#191C1D] italic">"{comentarios}"</p>
                      </div>
                    )}

                    {/* Aviso provisional */}
                    {res.esProvisional && (
                      <div className="mt-4 rounded border border-[#7A1F2A]/20 bg-[#FFF8F8] p-3 flex gap-2">
                        <span className="material-symbols-outlined text-[16px] text-[#7A1F2A] shrink-0 mt-0.5">info</span>
                        <p className="text-xs text-[#7A1F2A] leading-relaxed">
                          Este resultado es <strong>provisional</strong>. No será definitivo hasta que el Departamento de Grados firme el Acta Oficial.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Panel derecho: Siguientes pasos NO APTO */}
                  {res.esNoApto && (
                    <div className="rounded-lg border border-[#7A1F2A]/30 bg-[#F8E9EB] p-4 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-[#7A1F2A] uppercase text-xs tracking-wide mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">info</span>
                          Siguientes pasos
                        </h3>
                        {bloqueComun?.calificacion === "apto" && (
                          <p className="text-sm text-[#191C1D] mb-3 leading-relaxed">
                            El <strong>Bloque Común está aprobado</strong> y se guarda durante 1 año. Puedes presentarte solo al Bloque Específico en repesca.
                          </p>
                        )}
                        <p className="text-sm text-[#191C1D] leading-relaxed">
                          Puedes solicitar un informe explicativo detallado de las causas del No Apto a través de la Federación.
                        </p>
                      </div>
                      <button
                        onClick={() => handleSolicitarInforme(sol.id)}
                        disabled={isPending}
                        className="mt-4 w-full h-10 rounded border border-[#7A1F2A] bg-white text-[#7A1F2A] text-sm font-bold hover:bg-[#7A1F2A] hover:text-white transition disabled:opacity-50"
                      >
                        Solicitar Informe Explicativo
                      </button>
                    </div>
                  )}

                  {/* Panel derecho: Nuevo grado APTO definitivo */}
                  {res.esApto && res.esDefinitivo && (
                    <div className="rounded-lg border border-[#2D6A4F]/30 bg-[#EAF5EF] p-4">
                      <h3 className="font-bold text-[#2D6A4F] uppercase text-xs tracking-wide mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
                        Nuevo Grado Obtenido
                      </h3>
                      <p className="text-2xl font-bold text-[#2D6A4F]">{sol.grado_solicitado}</p>
                      <p className="text-xs text-[#2D6A4F]/80 mt-2 leading-relaxed">
                        Tu perfil ha sido actualizado automáticamente con el nuevo grado y fecha de obtención.
                      </p>
                    </div>
                  )}

                  {/* Panel derecho: APTO provisional — esperar acta */}
                  {res.esApto && res.esProvisional && (
                    <div className="rounded-lg border border-[#54585B]/20 bg-[#F8F9FA] p-4">
                      <h3 className="font-bold text-[#54585B] uppercase text-xs tracking-wide mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        Pendiente de acta oficial
                      </h3>
                      <p className="text-sm text-[#54585B] leading-relaxed">
                        Has obtenido una calificación favorable en el examen. Tu grado será actualizado cuando el Departamento de Grados firme el Acta Oficial.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}