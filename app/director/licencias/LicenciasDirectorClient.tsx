"use client";

import { useState, useTransition } from "react";
import { aprobarLicencia, rechazarLicencia, getLicenciasPendientes } from "./actions";

const ESTADO_BADGE: Record<string, { label: string; color: string }> = {
  pendiente: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
  activa:    { label: "Activa",    color: "bg-green-100  text-green-800"  },
  rechazada: { label: "Rechazada", color: "bg-red-100    text-red-800"    },
  caducada:  { label: "Caducada",  color: "bg-gray-100   text-gray-600"   },
};

const CATEGORIAS = [
  { value: "todos",  label: "Todas las categorías" },
  { value: "color",  label: "Cinturones de color"  },
  { value: "negro",  label: "Cinturón Negro"        },
  { value: "dan",    label: "Grados Dan"            },
];

const ESTADOS = [
  { value: "todos",     label: "Todos los estados" },
  { value: "pendiente", label: "Pendiente"         },
  { value: "activa",    label: "Activa"            },
  { value: "rechazada", label: "Rechazada"         },
];

export function LicenciasDirectorClient({ licenciasIniciales }: { licenciasIniciales: any[] }) {
  const [licencias, setLicencias]       = useState(licenciasIniciales);
  const [filtroEstado, setFiltroEstado] = useState("pendiente");
  const [filtroCateg, setFiltroCateg]  = useState("todos");
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);
  const [motivo, setMotivo]             = useState("");
  const [mensaje, setMensaje]           = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);
  const [isPending, startTransition]    = useTransition();

  async function recargar(estado: string, categ: string) {
    startTransition(async () => {
      const data = await getLicenciasPendientes(
        estado === "todos" ? undefined : estado,
        categ  === "todos" ? undefined : categ
      );
      setLicencias(data);
    });
  }

  function cambiarEstado(v: string) {
    setFiltroEstado(v);
    recargar(v, filtroCateg);
  }

  function cambiarCateg(v: string) {
    setFiltroCateg(v);
    recargar(filtroEstado, v);
  }

  async function handleAprobar(id: string) {
    setMensaje(null);
    startTransition(async () => {
      const res = await aprobarLicencia(id);
      if (res?.error) {
        setMensaje({ tipo: "err", texto: res.error });
      } else {
        setMensaje({ tipo: "ok", texto: "Licencia aprobada correctamente." });
        recargar(filtroEstado, filtroCateg);
      }
    });
  }

  async function handleRechazar(id: string) {
    if (!motivo.trim()) {
      setMensaje({ tipo: "err", texto: "Debes indicar el motivo de rechazo." });
      return;
    }
    setMensaje(null);
    startTransition(async () => {
      const res = await rechazarLicencia(id, motivo);
      if (res?.error) {
        setMensaje({ tipo: "err", texto: res.error });
      } else {
        setMensaje({ tipo: "ok", texto: "Licencia rechazada." });
        setRechazandoId(null);
        setMotivo("");
        recargar(filtroEstado, filtroCateg);
      }
    });
  }

  const pendientes = licenciasIniciales.filter((l) => l.estado === "pendiente").length;

  return (
    <div className="space-y-6">

      {/* Alerta de pendientes */}
      {pendientes > 0 && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 flex gap-3">
          <span className="material-symbols-outlined text-yellow-600 text-xl shrink-0">schedule</span>
          <p className="text-sm text-yellow-800 font-semibold">
            {pendientes} licencia{pendientes > 1 ? "s" : ""} pendiente{pendientes > 1 ? "s" : ""} de revisión.
          </p>
        </div>
      )}

      {/* Mensaje de acción */}
      {mensaje && (
        <div className={`rounded-lg p-4 text-sm font-semibold ${
          mensaje.tipo === "ok"
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-red-50   border border-red-200   text-red-700"
        }`}>
          {mensaje.texto}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filtroEstado}
          onChange={(e) => cambiarEstado(e.target.value)}
          className="rounded-lg border border-[#54585B]/30 px-3 py-2 text-sm focus:border-[#7A1F2A] focus:outline-none"
        >
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </select>

        <select
          value={filtroCateg}
          onChange={(e) => cambiarCateg(e.target.value)}
          className="rounded-lg border border-[#54585B]/30 px-3 py-2 text-sm focus:border-[#7A1F2A] focus:outline-none"
        >
          {CATEGORIAS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        <p className="ml-auto self-center text-sm text-[#54585B]">
          {licencias.length} resultado{licencias.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Lista */}
      {licencias.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-[#54585B]/20 p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-[#54585B]/40">task_alt</span>
          <p className="mt-3 text-sm font-semibold text-[#54585B]">
            No hay licencias con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {licencias.map((lic: any) => {
            const badge   = ESTADO_BADGE[lic.estado] || ESTADO_BADGE.pendiente;
            const pract   = lic.practicantes;
            const nombre  = pract ? `${pract.nombre} ${pract.apellidos}` : "Aspirante";
            const grado   = pract?.grado_actual || "—";

            return (
              <div key={lic.id}
                className="rounded-xl border border-[#54585B]/15 bg-white p-4 space-y-3">

                {/* Cabecera */}
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-[#F3F4F5] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[24px] text-[#7A1F2A]">badge</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-[#191C1D]">
                        Licencia {lic.anio} — {nombre}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-[#54585B] mt-0.5">
                      Grado: <span className="font-semibold">{grado}</span>
                      {" · "}Tipo: <span className="capitalize font-semibold">{lic.tipo}</span>
                      {lic.club && ` · Club: ${lic.club}`}
                    </p>
                    {lic.estado === "rechazada" && lic.motivo_rechazo && (
                      <p className="text-xs text-red-600 mt-1">
                        <span className="font-semibold">Motivo rechazo:</span> {lic.motivo_rechazo}
                      </p>
                    )}
                  </div>

                  {/* Botones */}
                  <div className="flex items-center gap-2 shrink-0">
                    {lic.documento_url && (
                      <a href={lic.documento_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 rounded-lg border border-[#54585B]/30 px-3 py-1.5 text-xs font-semibold text-[#54585B] hover:bg-gray-100 transition">
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        Ver doc.
                      </a>
                    )}
                    {lic.estado === "pendiente" && (
                      <>
                        <button
                          onClick={() => handleAprobar(lic.id)}
                          disabled={isPending}
                          className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition"
                        >
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          Aprobar
                        </button>
                        <button
                          onClick={() => { setRechazandoId(lic.id); setMotivo(""); setMensaje(null); }}
                          disabled={isPending}
                          className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition"
                        >
                          <span className="material-symbols-outlined text-[16px]">cancel</span>
                          Rechazar
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Formulario de rechazo inline */}
                {rechazandoId === lic.id && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
                    <p className="text-sm font-bold text-red-800">Motivo de rechazo (obligatorio)</p>
                    <textarea
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      rows={2}
                      placeholder="Ej: La imagen es ilegible. Por favor sube una foto más clara."
                      className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRechazar(lic.id)}
                        disabled={isPending || !motivo.trim()}
                        className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition"
                      >
                        {isPending ? "Enviando..." : "Confirmar rechazo"}
                      </button>
                      <button
                        onClick={() => { setRechazandoId(null); setMotivo(""); }}
                        className="rounded-lg border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}