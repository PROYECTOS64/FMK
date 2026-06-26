// app/admin/usuarios/[id]/EditarUsuarioClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateUsuario } from "../../actions";

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

// Calcula la edad a partir de fecha_nacimiento
function calcularEdad(fechaNac: string): number | null {
  if (!fechaNac) return null;
  const hoy = new Date();
  const nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

export default function EditarUsuarioClient({ user }: { user: any }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fechaNac, setFechaNac] = useState<string>(user.fecha_nacimiento ?? "");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);
    const res = await updateUsuario(user.id, formData);
    if (res?.error) {
      setErrorMsg(res.error);
      setIsSubmitting(false);
    } else {
      router.push("/admin/usuarios");
    }
  };

  const hoy = new Date().toISOString().split("T")[0];
  const edad = calcularEdad(fechaNac);
  const esAspirante = user.role === "Aspirante";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/usuarios" className="text-sm font-bold text-[#7A1F2A] hover:underline flex items-center gap-1 mb-4">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Volver al listado
        </Link>
        <p className="text-xs font-bold uppercase tracking-wide text-[#7A1F2A]">Administración</p>
        <h1 className="mt-2 text-3xl font-bold text-[#191C1D]" style={{ fontFamily: "Montserrat, sans-serif" }}>
          Editar cuenta de usuario
        </h1>
      </div>

      <div className="rounded-lg border border-[#54585B]/20 bg-white p-6 shadow-sm">
        <SectionTitle eyebrow="Datos del perfil" title={`Editando: ${user.name}`} />

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
              type="text" id="name" name="name"
              defaultValue={user.name} required
              className="w-full h-11 rounded border border-[#54585B]/30 bg-white px-3 text-sm text-[#191C1D] focus:border-[#7A1F2A] focus:outline-none focus:ring-1 focus:ring-[#7A1F2A]"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-bold text-[#191C1D] mb-1">
              Correo electrónico *
            </label>
            <input
              type="email" id="email" name="email"
              defaultValue={user.email} required
              className="w-full h-11 rounded border border-[#54585B]/30 bg-white px-3 text-sm text-[#191C1D] focus:border-[#7A1F2A] focus:outline-none focus:ring-1 focus:ring-[#7A1F2A]"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#54585B] mb-1">Rol actual</label>
            <input
              type="text" disabled defaultValue={user.role}
              className="w-full h-11 rounded border border-[#54585B]/10 bg-[#F8F9FA] px-3 text-sm text-[#54585B] cursor-not-allowed"
            />
          </div>

          {/* Fecha de nacimiento — solo para Aspirantes */}
          {esAspirante && (
            <div>
              <label htmlFor="fecha_nacimiento" className="block text-sm font-bold text-[#191C1D] mb-1">
                Fecha de nacimiento
              </label>
              <input
                type="date" id="fecha_nacimiento" name="fecha_nacimiento"
                value={fechaNac}
                onChange={(e) => setFechaNac(e.target.value)}
                max={hoy}
                className="w-full h-11 rounded border border-[#54585B]/30 bg-white px-3 text-sm text-[#191C1D] focus:border-[#7A1F2A] focus:outline-none focus:ring-1 focus:ring-[#7A1F2A]"
              />
              {edad !== null && (
                <p className="mt-1 text-xs text-[#54585B]">
                  Edad actual: <span className="font-bold text-[#191C1D]">{edad} años</span>
                </p>
              )}
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
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}