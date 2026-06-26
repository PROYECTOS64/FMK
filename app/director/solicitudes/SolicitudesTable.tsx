// app/director/solicitudes/SolicitudesTable.tsx
"use client";

import Link from "next/link";

function StatusBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    borrador: "border-[#54585B]/30 bg-[#EEF0F1] text-[#54585B]",
    enviada: "border-[#54585B]/30 bg-[#EEF0F1] text-[#54585B]",
    en_revision: "border-[#7A1F2A]/30 bg-[#F8E9EB] text-[#7A1F2A]",
    documentacion_incompleta: "border-[#BA1A1A]/30 bg-[#FFF1F2] text-[#BA1A1A]",
    validada: "border-[#2D6A4F]/30 bg-[#EAF5EF] text-[#2D6A4F]",
    rechazada: "border-[#BA1A1A]/30 bg-[#FFF1F2] text-[#BA1A1A]",
    programada: "border-[#2D6A4F]/30 bg-[#EAF5EF] text-[#2D6A4F]",
    finalizada: "border-[#54585B]/30 bg-[#EEF0F1] text-[#54585B]",
  };
  const labels: Record<string, string> = {
    borrador: "Borrador",
    enviada: "Enviada",
    en_revision: "En revisión",
    documentacion_incompleta: "Incompleta",
    validada: "Validada",
    rechazada: "Rechazada",
    programada: "Programada",
    finalizada: "Finalizada",
  };
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded border px-2.5 text-[11px] font-bold uppercase tracking-wide ${map[estado] || map.borrador}`}
    >
      {labels[estado] || estado}
    </span>
  );
}

interface Solicitud {
  id: string;
  estado: string;
  grado_solicitado: string;
  via_elegida: string | null;
  created_at: string;
  practicantes: {
    nombre: string;
    apellidos: string;
    grado_actual: string;
    clubes: { nombre: string } | null;
  } | null;
}

export default function SolicitudesTable({ items }: { items: Solicitud[] }) {
  return (
    <div className="rounded-lg border border-[#54585B]/20 bg-white overflow-hidden">
      {/* Desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F3F4F5] text-xs uppercase tracking-wide text-[#54585B]">
            <tr>
              <th className="px-4 py-3">Aspirante</th>
              <th className="px-4 py-3">Grado actual</th>
              <th className="px-4 py-3">Solicita</th>
              <th className="px-4 py-3">Vía</th>
              <th className="px-4 py-3">Club</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#54585B]/10">
            {items.map((s) => {
              const pract = s.practicantes;
              const nombre = pract ? `${pract.nombre} ${pract.apellidos}` : "—";
              const club = pract?.clubes?.nombre ?? "—";
              const gradoActual = pract?.grado_actual ?? "—";
              const fecha = s.created_at
                ? new Date(s.created_at).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : "—";
              return (
                <tr
                  key={s.id}
                  className="hover:bg-[#F8F9FA] transition cursor-pointer"
                  onClick={() =>
                    (window.location.href = `/director/solicitudes/${s.id}`)
                  }
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/director/solicitudes/${s.id}`}
                      className="font-bold text-[#191C1D] hover:text-[#7A1F2A] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#54585B]">{gradoActual}</td>
                  <td className="px-4 py-3 font-semibold">{s.grado_solicitado}</td>
                  <td className="px-4 py-3 text-[#54585B] capitalize">
                    {s.via_elegida ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[#54585B]">{club}</td>
                  <td className="px-4 py-3">
                    <StatusBadge estado={s.estado} />
                  </td>
                  <td className="px-4 py-3 text-[#54585B]">{fecha}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="lg:hidden divide-y divide-[#54585B]/10">
        {items.map((s) => {
          const pract = s.practicantes;
          const nombre = pract ? `${pract.nombre} ${pract.apellidos}` : "—";
          const club = pract?.clubes?.nombre ?? "—";
          const gradoActual = pract?.grado_actual ?? "—";
          return (
            <Link
              key={s.id}
              href={`/director/solicitudes/${s.id}`}
              className="block p-4 hover:bg-[#F8F9FA]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[#191C1D]">{nombre}</p>
                  <p className="text-sm text-[#54585B]">{club}</p>
                </div>
                <StatusBadge estado={s.estado} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="font-bold uppercase text-[#54585B]">Actual</p>
                  <p className="font-semibold text-[#191C1D] mt-0.5">{gradoActual}</p>
                </div>
                <div>
                  <p className="font-bold uppercase text-[#54585B]">Solicita</p>
                  <p className="font-semibold text-[#191C1D] mt-0.5">{s.grado_solicitado}</p>
                </div>
                <div>
                  <p className="font-bold uppercase text-[#54585B]">Vía</p>
                  <p className="font-semibold text-[#191C1D] mt-0.5 capitalize">
                    {s.via_elegida ?? "—"}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}