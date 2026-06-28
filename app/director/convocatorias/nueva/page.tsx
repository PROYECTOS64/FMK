"use client";

import Link from "next/link";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createConvocatoria, getGradosDisponibles } from "../actions";

const GRADOS_FALLBACK = [
  "Cinturón Amarillo", "Cinturón Naranja", "Cinturón Verde",
  "Cinturón Azul", "Cinturón Marrón", "Cinturón Negro",
  "1º Dan", "2º Dan", "3º Dan", "4º Dan", "5º Dan",
  "6º Dan", "7º Dan", "8º Dan", "9º Dan", "10º Dan",
];

export default function NuevaConvocatoriaPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [gradosDisponibles, setGradosDisponibles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    grados:       [] as string[],
    fechaExamen:  "",
    sede:         "",
    fechaLimite:  "",
    cuota:        45,
    observaciones: "",
    estado:       "abierta" as "borrador" | "abierta",
    vias: { kumite: true, campeonatos: true, tecnica: true },
  });

  useEffect(() => {
    getGradosDisponibles()
      .then((g) => setGradosDisponibles(g.length > 0 ? g : GRADOS_FALLBACK))
      .catch(() => setGradosDisponibles(GRADOS_FALLBACK));
  }, []);

  function toggleGrado(g: string) {
    setForm((prev) => ({
      ...prev,
      grados: prev.grados.includes(g)
        ? prev.grados.filter((x) => x !== g)
        : [...prev.grados, g],
    }));
  }

  function handleSubmit() {
    setError(null);
    if (!form.fechaExamen || !form.sede || !form.fechaLimite || form.grados.length === 0) {
      setError("Completa todos los campos obligatorios y selecciona al menos un grado.");
      return;
    }
    startTransition(async () => {
      try {
        await createConvocatoria({
          grados:        form.grados,
          fechaExamen:   form.fechaExamen,
          sede:          form.sede,
          fechaLimite:   form.fechaLimite,
          cuota:         form.cuota,
          vias:          form.vias,
          observaciones: form.observaciones,
          estado:        form.estado,
        });
        router.push("/director/convocatorias");
      } catch (err: any) {
        setError(err.message ?? "Error al crear la convocatoria.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-[#54585B]/20 pb-6 mb-8">
        <Link href="/director/convocatorias"
          className="flex items-center gap-1 text-sm font-semibold text-[#54585B] hover:text-[#191C1D]">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Volver
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#7A1F2A]">Departamento de Grados</p>
          <h1 className="mt-1 text-2xl font-bold text-[#191C1D]" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Nueva Convocatoria
          </h1>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded border border-[#BA1A1A]/30 bg-[#FFF1F2] px-4 py-3 flex gap-2">
          <span className="material-symbols-outlined text-[#BA1A1A] text-[18px] shrink-0 mt-0.5">error</span>
          <p className="text-sm text-[#BA1A1A]">{error}</p>
        </div>
      )}

      <div className="space-y-6">

        {/* Fechas y sede */}
        <div className="rounded-lg border border-[#54585B]/20 bg-white p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#54585B] mb-4">
            Fechas y Sede <span className="text-[#BA1A1A]">*</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-[#191C1D] mb-1.5">
                Fecha del examen <span className="text-[#BA1A1A]">*</span>
              </label>
              <input type="date" value={form.fechaExamen}
                onChange={(e) => setForm({ ...form, fechaExamen: e.target.value })}
                className="w-full h-10 rounded border border-[#54585B]/30 px-3 text-sm text-[#191C1D] focus:outline-none focus:ring-2 focus:ring-[#7A1F2A]/30" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#191C1D] mb-1.5">
                Fecha límite inscripción <span className="text-[#BA1A1A]">*</span>
              </label>
              <input type="date" value={form.fechaLimite}
                onChange={(e) => setForm({ ...form, fechaLimite: e.target.value })}
                className="w-full h-10 rounded border border-[#54585B]/30 px-3 text-sm text-[#191C1D] focus:outline-none focus:ring-2 focus:ring-[#7A1F2A]/30" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-[#191C1D] mb-1.5">
                Sede <span className="text-[#BA1A1A]">*</span>
              </label>
              <input type="text" value={form.sede}
                onChange={(e) => setForm({ ...form, sede: e.target.value })}
                placeholder="Ej. Polideportivo Municipal de Leganés"
                className="w-full h-10 rounded border border-[#54585B]/30 px-3 text-sm text-[#191C1D] focus:outline-none focus:ring-2 focus:ring-[#7A1F2A]/30" />
            </div>
          </div>
        </div>

        {/* Grados */}
        <div className="rounded-lg border border-[#54585B]/20 bg-white p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#54585B] mb-1">
            Grados examinables <span className="text-[#BA1A1A]">*</span>
          </h2>
          <p className="text-xs text-[#54585B] mb-4">Selecciona los grados a los que pueden optar los aspirantes.</p>
          {gradosDisponibles.length === 0 ? (
            <p className="text-sm text-[#54585B] flex items-center gap-2">
              <span className="material-symbols-outlined animate-spin text-[#7A1F2A]">progress_activity</span>
              Cargando grados…
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {gradosDisponibles.map((g) => {
                const selected = form.grados.includes(g);
                return (
                  <button key={g} type="button" onClick={() => toggleGrado(g)}
                    className={`flex items-center gap-2 rounded border px-3 py-2.5 text-sm font-semibold text-left transition ${
                      selected ? "border-[#7A1F2A] bg-[#F8E9EB] text-[#7A1F2A]"
                               : "border-[#54585B]/20 bg-white text-[#54585B] hover:border-[#7A1F2A]/40 hover:text-[#191C1D]"
                    }`}>
                    <span className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center ${
                      selected ? "border-[#7A1F2A] bg-[#7A1F2A]" : "border-[#54585B]/40"
                    }`}>
                      {selected && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
                    </span>
                    {g}
                  </button>
                );
              })}
            </div>
          )}
          {form.grados.length > 0 && (
            <p className="mt-3 text-xs font-semibold text-[#7A1F2A]">
              {form.grados.length} grado{form.grados.length !== 1 ? "s" : ""} seleccionado{form.grados.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Vías y cuota */}
        <div className="rounded-lg border border-[#54585B]/20 bg-white p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#54585B] mb-4">Vías y Cuota</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-[#191C1D] mb-2">Vías disponibles</label>
              <div className="space-y-2">
                {(["kumite", "campeonatos", "tecnica"] as const).map((via) => (
                  <label key={via} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.vias[via]}
                      onChange={(e) => setForm({ ...form, vias: { ...form.vias, [via]: e.target.checked } })}
                      className="accent-[#7A1F2A]" />
                    <span className="text-sm text-[#191C1D] capitalize">
                      Vía {via === "tecnica" ? "Técnica" : via === "campeonatos" ? "Campeonatos" : "Kumite"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#191C1D] mb-1.5">Cuota de examen (€)</label>
              <input type="number" min={0} value={form.cuota}
                onChange={(e) => setForm({ ...form, cuota: Number(e.target.value) })}
                className="w-full h-10 rounded border border-[#54585B]/30 px-3 text-sm text-[#191C1D] focus:outline-none focus:ring-2 focus:ring-[#7A1F2A]/30" />
            </div>
          </div>
        </div>

        {/* Estado y observaciones */}
        <div className="rounded-lg border border-[#54585B]/20 bg-white p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#54585B] mb-4">Estado y Observaciones</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-[#191C1D] mb-1.5">Estado inicial</label>
              <select value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as "borrador" | "abierta" })}
                className="w-full h-10 rounded border border-[#54585B]/30 px-3 text-sm text-[#191C1D] focus:outline-none focus:ring-2 focus:ring-[#7A1F2A]/30">
                <option value="abierta">Abierta (visible para aspirantes)</option>
                <option value="borrador">Borrador (no visible)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#191C1D] mb-1.5">Observaciones</label>
              <textarea value={form.observaciones}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                placeholder="Instrucciones adicionales para los aspirantes..."
                rows={3}
                className="w-full rounded border border-[#54585B]/30 px-3 py-2 text-sm text-[#191C1D] resize-none focus:outline-none focus:ring-2 focus:ring-[#7A1F2A]/30" />
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pb-8">
          <Link href="/director/convocatorias"
            className="h-11 rounded border border-[#54585B]/30 px-6 text-sm font-bold text-[#54585B] hover:bg-[#F3F4F5] flex items-center transition">
            Cancelar
          </Link>
          <button type="button" onClick={handleSubmit} disabled={isPending}
            className="h-11 rounded bg-[#7A1F2A] px-6 text-sm font-bold text-white hover:bg-[#5B0616] flex items-center gap-2 transition disabled:opacity-60">
            {isPending ? (
              <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Creando…</>
            ) : (
              <><span className="material-symbols-outlined text-[18px]">add</span>Crear convocatoria</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}