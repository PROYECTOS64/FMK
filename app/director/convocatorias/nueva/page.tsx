"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createConvocatoria } from "../actions";

export default function NuevaConvocatoriaPage() {
  const [form, setForm] = useState({
    grados: [] as string[],
    fechaExamen: "",
    sede: "",
    fechaLimite: "",
    cuota: "",
    vias: { kumite: true, campeonatos: true, tecnica: true },
    observaciones: "",
  });
  const [error, setError] = useState("");

  const grados = [
  // Cinturones de color (Kyu)
  "Cinturón Amarillo",
  "Cinturón Naranja",
  "Cinturón Verde",
  "Cinturón Azul",
  "Cinturón Marrón",
  // Cinturón Negro y Dan
  "Cinturón Negro",
  "1º Dan",
  "2º Dan",
  "3º Dan",
  "4º Dan",
  "5º Dan",
  "6º Dan",
  "7º Dan",
  "8º Dan",
  "9º Dan",
  "10º Dan",
];
  function toggleGrado(g: string) {
    setForm((prev) => ({
      ...prev,
      grados: prev.grados.includes(g)
        ? prev.grados.filter((x) => x !== g)
        : [...prev.grados, g],
    }));
  }

  const router = useRouter();

  async function handleSubmit(asBorrador: boolean) {
    setError("");
    if (!form.fechaExamen || !form.sede || !form.fechaLimite || form.grados.length === 0) {
      setError("Completa los campos obligatorios (incluyendo al menos un grado).");
      return;
    }
    // Validate 35-day rule
    const examen = new Date(form.fechaExamen);
    const limite = new Date(form.fechaLimite);
    const diffDays = Math.floor((examen.getTime() - limite.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 35) {
      setError(`La fecha límite de inscripción debe ser al menos 35 días antes del examen. Actualmente: ${diffDays} días.`);
      return;
    }
    
    try {
      await createConvocatoria({
        ...form,
        cuota: Number(form.cuota) || 0,
        estado: asBorrador ? "borrador" : "abierta",
      });
      router.push("/director/convocatorias");
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-[#54585B]">
        <Link href="/director/convocatorias" className="hover:text-[#7A1F2A] hover:underline">Convocatorias</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="font-semibold text-[#191C1D]">Nueva convocatoria</span>
      </nav>

      <h1 className="text-2xl font-bold text-[#191C1D] mb-6" style={{ fontFamily: "Montserrat, sans-serif" }}>
        Crear nueva convocatoria de examen
      </h1>

      <div className="space-y-6">
        {/* Grados */}
        <section className="rounded-lg border border-[#54585B]/20 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[#54585B] mb-3">Grados convocados *</p>
          <div className="flex flex-wrap gap-2">
            {grados.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => toggleGrado(g)}
                className={`h-9 rounded border px-3 text-sm font-semibold transition ${
                  form.grados.includes(g)
                    ? "border-[#7A1F2A] bg-[#7A1F2A] text-white"
                    : "border-[#54585B]/30 bg-white text-[#54585B] hover:border-[#7A1F2A] hover:text-[#7A1F2A]"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </section>

        {/* Datos principales */}
        <section className="rounded-lg border border-[#54585B]/20 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[#54585B] mb-4">Datos de la convocatoria</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-[#54585B] mb-1.5">
                Fecha del examen *
              </label>
              <input
                type="date"
                value={form.fechaExamen}
                onChange={(e) => setForm({ ...form, fechaExamen: e.target.value })}
                className="w-full h-11 rounded border border-[#54585B]/30 bg-white px-3 text-sm text-[#191C1D] focus:border-[#7A1F2A] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-[#54585B] mb-1.5">
                Fecha límite de inscripción *
              </label>
              <input
                type="date"
                value={form.fechaLimite}
                onChange={(e) => setForm({ ...form, fechaLimite: e.target.value })}
                className="w-full h-11 rounded border border-[#54585B]/30 bg-white px-3 text-sm text-[#191C1D] focus:border-[#7A1F2A] focus:outline-none"
              />
              <p className="mt-1 text-xs text-[#54585B]">Mínimo 35 días antes del examen</p>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wide text-[#54585B] mb-1.5">
                Sede del examen *
              </label>
              <input
                type="text"
                value={form.sede}
                onChange={(e) => setForm({ ...form, sede: e.target.value })}
                placeholder="Ej: Polideportivo Magariños, Madrid"
                className="w-full h-11 rounded border border-[#54585B]/30 bg-white px-3 text-sm text-[#191C1D] placeholder:text-[#54585B]/50 focus:border-[#7A1F2A] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-[#54585B] mb-1.5">
                Cuota de examen (€)
              </label>
              <input
                type="number"
                value={form.cuota}
                onChange={(e) => setForm({ ...form, cuota: e.target.value })}
                placeholder="85"
                className="w-full h-11 rounded border border-[#54585B]/30 bg-white px-3 text-sm text-[#191C1D] placeholder:text-[#54585B]/50 focus:border-[#7A1F2A] focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Vías habilitadas */}
        <section className="rounded-lg border border-[#54585B]/20 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[#54585B] mb-3">Vías del Bloque Específico habilitadas</p>
          <div className="space-y-2">
            {[
              { key: "kumite" as const, label: "Kumite", desc: "Combate reglamentado (Shiai/Jyu)" },
              { key: "campeonatos" as const, label: "Campeonatos", desc: "Exención por puntos de competición (mín. 10)" },
              { key: "tecnica" as const, label: "Técnica", desc: "Bunkai / Oyo Waza / Jyu Embu (no disponible para Cinturón Negro)" },
            ].map((v) => (
              <label key={v.key} className="flex items-start gap-3 p-3 rounded border border-[#54585B]/15 hover:bg-[#F8F9FA] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.vias[v.key]}
                  onChange={() => setForm((prev) => ({ ...prev, vias: { ...prev.vias, [v.key]: !prev.vias[v.key] } }))}
                  className="mt-0.5 h-4 w-4 rounded border-[#54585B]/30 accent-[#7A1F2A]"
                />
                <div>
                  <p className="text-sm font-bold text-[#191C1D]">{v.label}</p>
                  <p className="text-xs text-[#54585B]">{v.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Observaciones */}
        <section className="rounded-lg border border-[#54585B]/20 bg-white p-5">
          <label className="block text-xs font-bold uppercase tracking-wide text-[#54585B] mb-1.5">
            Observaciones logísticas
          </label>
          <textarea
            value={form.observaciones}
            onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
            rows={3}
            placeholder="Examen a puerta cerrada, uniforme oficial del Tribunal..."
            className="w-full rounded border border-[#54585B]/30 bg-[#F8F9FA] px-3 py-2 text-sm text-[#191C1D] placeholder:text-[#54585B]/50 focus:border-[#7A1F2A] focus:outline-none resize-none"
          />
        </section>

        {/* Error */}
        {error && (
          <div className="rounded border border-[#BA1A1A]/30 bg-[#FFF1F2] px-4 py-3">
            <p className="text-sm text-[#BA1A1A] flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Link href="/director/convocatorias" className="h-11 rounded border border-[#54585B]/35 bg-white px-4 text-sm font-bold text-[#54585B] hover:text-[#7A1F2A] transition flex items-center justify-center">
            Cancelar
          </Link>
          <button type="button" onClick={() => handleSubmit(true)} className="h-11 rounded border border-[#7A1F2A] bg-white px-4 text-sm font-bold text-[#7A1F2A] hover:bg-[#F8E9EB] transition">
            Guardar borrador
          </button>
          <button type="button" onClick={() => handleSubmit(false)} className="h-11 rounded bg-[#7A1F2A] px-4 text-sm font-bold text-white hover:bg-[#5B0616] transition">
            Publicar convocatoria
          </button>
        </div>
      </div>
    </div>
  );
}
