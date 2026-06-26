// app/director/solicitudes/page.tsx
import { createClient } from "@/lib/supabase/server";
import SolicitudesTable from "./SolicitudesTable";

export const dynamic = "force-dynamic";

export default async function SolicitudesPage() {
  const supabase = await createClient();

  const { data: solicitudes, error } = await supabase
    .from("solicitudes")
    .select(`
      id,
      estado,
      grado_solicitado,
      via_elegida,
      created_at,
      practicante_id,
      convocatoria_id,
      practicantes (
        nombre,
        apellidos,
        grado_actual,
        clubes ( nombre )
      ),
      convocatorias (
        fecha_examen,
        fecha_limite_inscripcion,
        sede
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching solicitudes:", error);
  }

  const items = (solicitudes ?? []) as any[];

  const needAttention = items.filter(
    (s) =>
      s.estado === "en_revision" ||
      s.estado === "documentacion_incompleta" ||
      s.estado === "enviada"
  ).length;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 border-b border-[#54585B]/20 pb-6 mb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#7A1F2A]">
            Gestión documental
          </p>
          <h1
            className="mt-2 text-3xl font-bold text-[#191C1D]"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Solicitudes de examen
          </h1>
          <p className="mt-1 text-sm text-[#54585B]">
            {items.length} solicitudes registradas
            {needAttention > 0 ? ` · ${needAttention} requieren atención` : ""}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-[#54585B]/20 bg-white p-12 text-center">
          <span className="material-symbols-outlined text-[48px] text-[#54585B]/40">
            inbox
          </span>
          <p className="mt-3 text-lg font-bold text-[#191C1D]">Sin solicitudes</p>
          <p className="mt-1 text-sm text-[#54585B]">
            No hay solicitudes de examen registradas en el sistema.
          </p>
        </div>
      ) : (
        <SolicitudesTable items={items} />
      )}
    </div>
  );
}