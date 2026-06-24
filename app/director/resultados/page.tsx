import { createClient } from "@/lib/supabase/server";
import { ResultadosPanelClient } from "./ResultadosPanelClient";

export const dynamic = "force-dynamic";

export default async function ResultadosPage({
  searchParams,
}: {
  searchParams: Promise<{ convocatoriaId?: string }>;
}) {
  const supabase = await createClient();

  // ← await aquí, requerido en Next.js 16
  const params = await searchParams;

  const { data: dbConvs } = await supabase
    .from("convocatorias")
    .select("id, nombre, estado")
    .order("fecha_examen", { ascending: false });

  const convocatorias = dbConvs || [];

  const selectedConvId = params.convocatoriaId || convocatorias[0]?.id || "";
  const selectedConv = convocatorias.find((c) => c.id === selectedConvId);

  let aspirantesList: any[] = [];
  if (selectedConvId) {
    const { data: solicitudes } = await supabase
      .from("solicitudes")
      .select(`
        id,
        estado,
        grado_solicitado,
        via_elegida,
        practicantes (
          nombre,
          apellidos,
          fecha_nacimiento
        )
      `)
      .eq("convocatoria_id", selectedConvId)
      .in("estado", ["validada", "programada", "finalizada", "rechazada"]);

    if (solicitudes) {
      for (const sol of solicitudes) {
        const { data: res } = await supabase
          .from("resultados")
          .select("bloque, calificacion")
          .eq("solicitud_id", sol.id);

        const resList = res || [];
        const comun = resList.find((r) => r.bloque === "comun")?.calificacion || null;
        const espec = resList.find((r) => r.bloque === "especifico")?.calificacion || null;

        const pract = sol.practicantes as any;
        const edad = pract?.fecha_nacimiento
          ? Math.floor(
              (Date.now() - new Date(pract.fecha_nacimiento).getTime()) /
                (365.25 * 24 * 60 * 60 * 1000)
            )
          : null;

        aspirantesList.push({
          solicitudId: sol.id,
          nombre: pract ? `${pract.nombre} ${pract.apellidos}` : "Aspirante",
          gradoSolicitado: sol.grado_solicitado,
          viaElegida: sol.via_elegida || "Técnica",
          edad,
          bloqueComun: comun,
          bloqueEspecifico: espec,
          estadoSolicitud: sol.estado,
        });
      }
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="border-b border-[#54585B]/20 pb-6 mb-6">
        <p className="text-xs font-bold uppercase tracking-wide text-[#7A1F2A]">Tribunal de examen</p>
        <h1 className="mt-2 text-3xl font-bold text-[#191C1D]" style={{ fontFamily: "Montserrat, sans-serif" }}>
          Registro y publicación de resultados
        </h1>
        <p className="mt-1 text-sm text-[#54585B]">
          Califica el Bloque Común y Específico de cada aspirante, y publica las actas oficiales.
        </p>
      </div>

      <ResultadosPanelClient
        convocatoriasDisponibles={convocatorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
        aspirantesIniciales={aspirantesList}
        convocatoriaIdInicial={selectedConvId}
        convocatoriaEstado={selectedConv?.estado || "borrador"}
      />

      <div className="mt-6 rounded-lg border border-[#7A1F2A]/20 bg-[#FFF8F8] p-4 flex gap-3">
        <span className="material-symbols-outlined text-[#7A1F2A] text-xl shrink-0 mt-0.5">info</span>
        <div>
          <p className="text-sm font-bold text-[#7A1F2A]">Regla de publicación y actas (DIR-23 a DIR-30)</p>
          <p className="text-sm text-[#54585B] mt-1 leading-6">
            Los resultados no son definitivos hasta la firma digital del acta oficial. El sistema exige un mínimo del <strong>80% de votos favorables</strong> de los jueces para registrar APTO en exámenes de <strong>5º Dan o superior</strong>. Rectificaciones posteriores se guardan auditadas con justificación obligatoria.
          </p>
        </div>
      </div>
    </div>
  );
}