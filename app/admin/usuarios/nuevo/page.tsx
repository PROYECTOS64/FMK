// app/admin/usuarios/nuevo/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUsuario } from "../actions";

function SectionTitle({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <div>
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-wide text-[#54585B]">{eyebrow}</p>
      )}
      <h2 className="mt-1 text-xl font-bold text-[#191C1D]" style={{ fontFamily: "Montserrat, sans-serif" }}>
        {title}
      </h2>
    </div>
  );
}

export default function NuevoUsuarioPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [role, setRole] = useState("Aspirante");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);
    const res = await createUsuario(formData);
    if (res?.error) {
      setErrorMsg(res.error);
      setIsSubmitting(false);
    } else {
      router.push("/admin/usuarios");
    }
  };

  // Fecha máxima = hoy (no puede nacer en el futuro)
  const hoy = new Date().toISOString().split("T")[0];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/usuarios" className="text-sm font-bold text-[#7A1F2A] hover:underline flex items-center gap-1 mb-4">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Volver al listado
        </Link>
        <p className="text-xs font-bold uppercase tracking-wide text-[#7A1F2A]">Administración</p>
        <h1 className="mt-2 text-3xl font-bold text-[#191C1D]" style={{ fontFamily: "Montserrat, sans-serif" }}>
          Crear nueva cuenta de usuario
        </h1>
      </div>

      <div className="rounded-lg border border-[#54585B]/20 bg-white p-6 shadow-sm">
        <SectionTitle eyebrow="Datos del perfil" title="Información básica" />

        {errorMsg && (
          <div className="mt-4 p-3 bg-[#FFF1F2] border border-[#BA1A1A]/30 text-[#BA1A1A] rounded text-sm font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-bold text-[#191C1D] mb-1">
              Nombre completo *
            </label>
            <input
              type="text" id="name" name="name" required
              className="w-full h-11 rounded border border-[#54585B]/30 bg-white px-3 text-sm text-[#191C1D] focus:border-[#7A1F2A] focus:outline-none focus:ring-1 focus:ring-[#7A1F2A]"
              placeholder="Ej. Juan Pérez"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-bold text-[#191C1D] mb-1">
              Correo electrónico *
            </label>
            <input
              type="email" id="email" name="email" required
              className="w-full h-11 rounded border border-[#54585B]/30 bg-white px-3 text-sm text-[#191C1D] focus:border-[#7A1F2A] focus:outline-none focus:ring-1 focus:ring-[#7A1F2A]"
              placeholder="Ej. juan.perez@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold text-[#191C1D] mb-1">
              Contraseña temporal *
            </label>
            <input
              type="password" id="password" name="password" required minLength={6}
              className="w-full h-11 rounded border border-[#54585B]/30 bg-white px-3 text-sm text-[#191C1D] focus:border-[#7A1F2A] focus:outline-none focus:ring-1 focus:ring-[#7A1F2A]"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-bold text-[#191C1D] mb-1">
              Rol en el sistema *
            </label>
            <select
              id="role" name="role" required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-11 rounded border border-[#54585B]/30 bg-white px-3 text-sm text-[#191C1D] focus:border-[#7A1F2A] focus:outline-none focus:ring-1 focus:ring-[#7A1F2A]"
            >
              <option value="Aspirante">Aspirante</option>
              <option value="Director FMK">Director FMK</option>
            </select>
          </div>

          {/* Fecha de nacimiento — solo para Aspirantes */}
          {role === "Aspirante" && (
            <div>
              <label htmlFor="fecha_nacimiento" className="block text-sm font-bold text-[#191C1D] mb-1">
                Fecha de nacimiento
              </label>
              <input
                type="date" id="fecha_nacimiento" name="fecha_nacimiento"
                max={hoy}
                className="w-full h-11 rounded border border-[#54585B]/30 bg-white px-3 text-sm text-[#191C1D] focus:border-[#7A1F2A] focus:outline-none focus:ring-1 focus:ring-[#7A1F2A]"
              />
              <p className="mt-1 text-xs text-[#54585B]">
                Necesaria para verificar la edad mínima según la normativa FMK.
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-[#54585B]/15 flex justify-end gap-3 mt-8">
            <Link
              href="/admin/usuarios"
              className="h-11 rounded border border-[#54585B]/35 bg-white px-4 text-sm font-bold text-[#54585B] transition hover:bg-[#F3F4F5] flex items-center justify-center"
            >
              Cancelar
            </Link>
            <button
              type="submit" disabled={isSubmitting}
              className="h-11 flex items-center justify-center rounded bg-[#7A1F2A] px-6 text-sm font-bold text-white transition hover:bg-[#5B0616] disabled:opacity-70"
            >
              {isSubmitting ? "Guardando..." : "Guardar usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}