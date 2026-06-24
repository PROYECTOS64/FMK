"use client";

import { useState, useTransition } from "react";
import { subirLicencia, reemplazarLicencia } from "./actions";

const ESTADO_BADGE: Record<string, { label: string; color: string }> = {
  pendiente:  { label: "Pendiente",  color: "bg-yellow-100 text-yellow-800" },
  activa:     { label: "Activa",     color: "bg-green-100  text-green-800"  },
  rechazada:  { label: "Rechazada",  color: "bg-red-100    text-red-800"    },
};

export function LicenciasClient({ licenciasIniciales }: { licenciasIniciales: any[] }) {
  const [licencias, setLicencias]       = useState(licenciasIniciales);
  const [mostrarForm, setMostrarForm]   = useState(false);
  const [reemplazarId, setReemplazarId] = useState<string | null>(null);
  const [error, setError]               = useState("");
  const [exito, setExito]               = useState("");
  const [isPending, startTransition]    = useTransition();

  const anioActual = new Date().getFullYear();

  async function handleSubir(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setExito("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await subirLicencia(fd);
      if (res?.error) { setError(res.error); return; }
      setExito("Licencia subida correctamente. El Director FMK la revisará pronto.");
      setMostrarForm(false);
      window.location.reload();
    });
  }

  async function handleReemplazar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setExito("");
    const fd = new FormData(e.currentTarget);
    fd.append("licenciaId", reemplazarId!);
    startTransition(async () => {
      const res = await reemplazarLicencia(fd);
      if (res?.error) { setError(res.error); return; }
      setExito("Documento reemplazado. El Director FMK lo revisará pronto.");
      setReemplazarId(null);
      window.location.reload();
    });
  }

  return (
    <div className="space-y-6">
      {/* Mensajes */}
      {error  && <div className="rounded-lg bg-red-50   border border-red-200   p-4 text-sm text-red-700">{error}</div>}
      {exito  && <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700">{exito}</div>}

      {/* Cabecera con botón */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#54585B]">
          {licencias.length} / 15 licencias registradas
        </p>
        {licencias.length < 15 && !mostrarForm && (
          <button
            onClick={() => { setMostrarForm(true); setError(""); setExito(""); }}
            className="flex items-center gap-2 rounded-lg bg-[#7A1F2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a1620] transition"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nueva licencia
          </button>
        )}
      </div>

      {/* Formulario nueva licencia */}
      {mostrarForm && (
        <form onSubmit={handleSubir}
          className="rounded-xl border border-[#7A1F2A]/30 bg-[#FFF8F8] p-6 space-y-4">
          <h2 className="font-bold text-[#191C1D]">Subir nueva licencia</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#54585B] mb-1">AÑO *</label>
              <input
                name="anio" type="number"
                min={2000} max={anioActual} required
                placeholder={String(anioActual)}
                className="w-full rounded-lg border border-[#54585B]/30 px-3 py-2 text-sm focus:border-[#7A1F2A] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#54585B] mb-1">TIPO *</label>
              <select name="tipo" required
                className="w-full rounded-lg border border-[#54585B]/30 px-3 py-2 text-sm focus:border-[#7A1F2A] focus:outline-none">
                <option value="consecutiva">Consecutiva</option>
                <option value="alterna">Alterna</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#54585B] mb-1">CLUB ESE AÑO (opcional)</label>
            <input
              name="club" type="text"
              placeholder="Nombre del club"
              className="w-full rounded-lg border border-[#54585B]/30 px-3 py-2 text-sm focus:border-[#7A1F2A] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#54585B] mb-1">DOCUMENTO *</label>
            <input
              name="documento" type="file"
              accept=".pdf,.jpg,.jpeg,.png" required
              className="w-full rounded-lg border border-[#54585B]/30 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-[#7A1F2A] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white"
            />
            <p className="mt-1 text-xs text-[#54585B]">PDF, JPG o PNG · Mín. 50 KB · Máx. 10 MB</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isPending}
              className="rounded-lg bg-[#7A1F2A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5a1620] disabled:opacity-50 transition">
              {isPending ? "Subiendo..." : "Guardar licencia"}
            </button>
            <button type="button" onClick={() => setMostrarForm(false)}
              className="rounded-lg border border-[#54585B]/30 px-5 py-2 text-sm font-semibold text-[#54585B] hover:bg-gray-100 transition">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Formulario reemplazar documento */}
      {reemplazarId && (
        <form onSubmit={handleReemplazar}
          className="rounded-xl border border-orange-300 bg-orange-50 p-6 space-y-4">
          <h2 className="font-bold text-orange-800">Reemplazar documento rechazado</h2>
          <div>
            <label className="block text-xs font-bold text-[#54585B] mb-1">NUEVO DOCUMENTO *</label>
            <input
              name="documento" type="file"
              accept=".pdf,.jpg,.jpeg,.png" required
              className="w-full rounded-lg border border-orange-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-orange-600 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white"
            />
            <p className="mt-1 text-xs text-[#54585B]">PDF, JPG o PNG · Mín. 50 KB · Máx. 10 MB</p>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={isPending}
              className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50 transition">
              {isPending ? "Subiendo..." : "Reemplazar documento"}
            </button>
            <button type="button" onClick={() => setReemplazarId(null)}
              className="rounded-lg border border-[#54585B]/30 px-5 py-2 text-sm font-semibold text-[#54585B] hover:bg-gray-100 transition">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de licencias */}
      {licencias.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-[#54585B]/20 p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-[#54585B]/40">badge</span>
          <p className="mt-3 text-sm font-semibold text-[#54585B]">No tienes licencias registradas</p>
          <p className="text-xs text-[#54585B]/60 mt-1">Sube tu primera licencia para comenzar el proceso.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {licencias.map((lic) => {
            const badge = ESTADO_BADGE[lic.estado] || ESTADO_BADGE.pendiente;
            return (
              <div key={lic.id}
                className="rounded-xl border border-[#54585B]/15 bg-white p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-[#F3F4F5] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px] text-[#7A1F2A]">badge</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[#191C1D]">Licencia {lic.anio}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="rounded-full bg-[#F3F4F5] px-2 py-0.5 text-xs text-[#54585B] capitalize">
                      {lic.tipo}
                    </span>
                  </div>
                  {lic.club && <p className="text-xs text-[#54585B] mt-0.5">{lic.club}</p>}
                  {lic.estado === "rechazada" && lic.motivo_rechazo && (
                    <p className="text-xs text-red-600 mt-1">
                      <span className="font-semibold">Motivo:</span> {lic.motivo_rechazo}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {lic.documento_url && (
                    <a href={lic.documento_url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 rounded-lg border border-[#54585B]/30 px-3 py-1.5 text-xs font-semibold text-[#54585B] hover:bg-gray-100 transition">
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      Ver doc.
                    </a>
                  )}
                  {lic.estado === "rechazada" && (
                    <button onClick={() => { setReemplazarId(lic.id); setError(""); setExito(""); }}
                      className="flex items-center gap-1 rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-200 transition">
                      <span className="material-symbols-outlined text-[16px]">upload_file</span>
                      Reemplazar
                    </button>
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