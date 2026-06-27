import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ActaPage({
  params,
}: {
  params: { convocatoriaId: string };
}) {
  const { convocatoriaId } = await params;
  const admin = createAdminClient();

  const { data: conv, error: convError } = await admin
    .from("convocatorias")
    .select("id, nombre, fecha_examen, sede, estado")
    .eq("id", convocatoriaId)
    .single();

  if (convError || !conv) notFound();

  const { data: tribunalRow } = await admin
    .from("tribunales")
    .select("id")
    .eq("convocatoria_id", convocatoriaId)
    .maybeSingle();

  let jueces: any[] = [];
  if (tribunalRow) {
    const { data: tj } = await admin
      .from("tribunal_jueces")
      .select("rol, jueces(nombre, apellidos, diploma)")
      .eq("tribunal_id", tribunalRow.id);
    jueces = tj || [];
  }

  const { data: solicitudes } = await admin
    .from("solicitudes")
    .select(`
      id,
      grado_solicitado,
      via_elegida,
      estado,
      practicantes (
        nombre,
        apellidos,
        dni,
        fecha_nacimiento,
        grado_actual,
        clubes ( nombre )
      )
    `)
    .eq("convocatoria_id", convocatoriaId)
    .in("estado", ["finalizada", "rechazada", "validada", "programada"]);

  const aspirantes = await Promise.all(
    (solicitudes || []).map(async (sol: any) => {
      const { data: res } = await admin
        .from("resultados")
        .select("bloque, calificacion, comentarios")
        .eq("solicitud_id", sol.id);

      const resList = res || [];
      const comun   = resList.find((r: any) => r.bloque === "comun");
      const especif = resList.find((r: any) => r.bloque === "especifico");
      const esApto  = comun?.calificacion === "apto" && (especif?.calificacion === "apto" || !especif);
      const pract   = sol.practicantes as any;
      const edad    = pract?.fecha_nacimiento
        ? Math.floor((Date.now() - new Date(pract.fecha_nacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null;

      return {
        id:              sol.id,
        nombre:          pract ? `${pract.nombre} ${pract.apellidos}` : "—",
        dni:             pract?.dni ?? "—",
        edad,
        club:            pract?.clubes?.nombre ?? "—",
        gradoActual:     pract?.grado_actual ?? "—",
        gradoSolicitado: sol.grado_solicitado,
        via:             sol.via_elegida ?? "—",
        bloqueComun:     comun?.calificacion ?? null,
        bloqueEspecif:   especif?.calificacion ?? null,
        resultado:       esApto ? "APTO" : "NO APTO",
      };
    })
  );

  const aptos   = aspirantes.filter((a) => a.resultado === "APTO");
  const noAptos = aspirantes.filter((a) => a.resultado === "NO APTO");

  const fecha  = conv.fecha_examen
    ? new Date(conv.fecha_examen + "T00:00:00").toLocaleDateString("es-ES", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "—";
  const hoyStr = new Date().toLocaleDateString("es-ES", {
    day: "numeric", month: "long", year: "numeric",
  });
  const isFinalizada = conv.estado === "finalizada";

  return (
    <div className="mx-auto max-w-5xl">
      {/* Barra acciones — no se imprime */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link
          href="/director/resultados"
          className="flex items-center gap-1 text-sm font-semibold text-[#54585B] hover:text-[#191C1D]"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Volver a resultados
        </Link>
        <button
          onClick={() => window.print()}
          className="h-10 rounded bg-[#7A1F2A] px-4 text-sm font-bold text-white hover:bg-[#5B0616] flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">print</span>
          Imprimir / Guardar PDF
        </button>
      </div>

      {/* ACTA */}
      <div className="bg-white rounded-lg border border-[#54585B]/20 p-8 print:border-0 print:p-0">

        {/* Cabecera */}
        <div className="text-center border-b-2 border-[#7A1F2A] pb-6 mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[#7A1F2A] mb-1">
            Federación Madrileña de Karate
          </p>
          <h1
            className="text-2xl font-bold text-[#191C1D] mb-1"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            ACTA OFICIAL DE EXAMEN DE GRADO
          </h1>
          <p className="text-sm text-[#54585B]">
            Departamento de Grados — Normativa 2017
          </p>
        </div>

        {/* Datos de la convocatoria */}
        <section className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#54585B] mb-1">Convocatoria</p>
            <p className="font-bold text-[#191C1D]">{conv.nombre}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#54585B] mb-1">Fecha de examen</p>
            <p className="font-bold text-[#191C1D]">{fecha}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#54585B] mb-1">Sede</p>
            <p className="font-bold text-[#191C1D]">{conv.sede ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#54585B] mb-1">Estado del acta</p>
            <span
              className={`inline-flex items-center rounded border px-2.5 py-0.5 text-xs font-bold uppercase ${
                isFinalizada
                  ? "border-[#2D6A4F]/30 bg-[#EAF5EF] text-[#2D6A4F]"
                  : "border-[#7A1F2A]/30 bg-[#F8E9EB] text-[#7A1F2A]"
              }`}
            >
              {isFinalizada ? "Firmada y cerrada" : "Provisional"}
            </span>
          </div>
        </section>

        {/* Tribunal */}
        {jueces.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#54585B] mb-3 border-b border-[#54585B]/15 pb-1">
              Composición del Tribunal
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {jueces.map((tj: any, i: number) => (
                <div key={i} className="rounded border border-[#54585B]/15 bg-[#F8F9FA] px-3 py-2">
                  <p className="text-sm font-semibold text-[#191C1D]">
                    {tj.jueces?.nombre} {tj.jueces?.apellidos}
                  </p>
                  <p className="text-xs text-[#54585B] mt-0.5">
                    {tj.rol === "arbitro_shiai_kumite" ? "Árbitro Shiai Kumite" : "Juez"}
                    {tj.jueces?.diploma && ` · ${tj.jueces.diploma}`}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tabla de resultados */}
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#54585B] mb-3 border-b border-[#54585B]/15 pb-1">
            Resultados ({aspirantes.length} presentados)
          </h2>

          {aspirantes.length === 0 ? (
            <p className="text-sm text-[#54585B] py-4">
              No hay aspirantes calificados en esta convocatoria todavía.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F3F4F5] text-xs uppercase tracking-wide text-[#54585B]">
                  <tr>
                    <th className="px-3 py-2">Aspirante</th>
                    <th className="px-3 py-2">DNI</th>
                    <th className="px-3 py-2">Club</th>
                    <th className="px-3 py-2">Grado actual</th>
                    <th className="px-3 py-2">Solicita</th>
                    <th className="px-3 py-2">Vía</th>
                    <th className="px-3 py-2 text-center">B. Común</th>
                    <th className="px-3 py-2 text-center">B. Específico</th>
                    <th className="px-3 py-2 text-center">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#54585B]/10">
                  {aspirantes.map((a) => (
                    <tr key={a.id} className={a.resultado === "APTO" ? "bg-[#F8FFFA]" : ""}>
                      <td className="px-3 py-2 font-semibold text-[#191C1D] whitespace-nowrap">{a.nombre}</td>
                      <td className="px-3 py-2 text-[#54585B] text-xs">{a.dni}</td>
                      <td className="px-3 py-2 text-[#54585B]">{a.club}</td>
                      <td className="px-3 py-2 text-[#54585B]">{a.gradoActual}</td>
                      <td className="px-3 py-2 font-semibold">{a.gradoSolicitado}</td>
                      <td className="px-3 py-2 text-[#54585B] text-xs">{a.via}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs font-bold uppercase ${
                          a.bloqueComun === "apto" ? "text-[#2D6A4F]"
                          : a.bloqueComun === "no_apto" ? "text-[#BA1A1A]"
                          : "text-[#54585B]"
                        }`}>
                          {a.bloqueComun ? a.bloqueComun.replace("_", " ") : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs font-bold uppercase ${
                          a.bloqueEspecif === "apto" ? "text-[#2D6A4F]"
                          : a.bloqueEspecif === "no_apto" ? "text-[#BA1A1A]"
                          : "text-[#54585B]"
                        }`}>
                          {a.bloqueEspecif ? a.bloqueEspecif.replace("_", " ") : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-bold uppercase ${
                          a.resultado === "APTO"
                            ? "border-[#2D6A4F]/30 bg-[#EAF5EF] text-[#2D6A4F]"
                            : "border-[#BA1A1A]/30 bg-[#FFF1F2] text-[#BA1A1A]"
                        }`}>
                          {a.resultado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Resumen */}
        <section className="grid grid-cols-3 gap-4 mb-10">
          <div className="rounded-lg border border-[#54585B]/20 bg-[#F8F9FA] p-4 text-center">
            <p className="text-3xl font-bold text-[#191C1D]">{aspirantes.length}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-[#54585B] mt-1">Presentados</p>
          </div>
          <div className="rounded-lg border border-[#2D6A4F]/20 bg-[#EAF5EF] p-4 text-center">
            <p className="text-3xl font-bold text-[#2D6A4F]">{aptos.length}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-[#2D6A4F] mt-1">Aptos</p>
          </div>
          <div className="rounded-lg border border-[#BA1A1A]/20 bg-[#FFF1F2] p-4 text-center">
            <p className="text-3xl font-bold text-[#BA1A1A]">{noAptos.length}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-[#BA1A1A] mt-1">No aptos</p>
          </div>
        </section>

        {/* Firmas */}
        <section className="border-t-2 border-[#7A1F2A] pt-8 mt-8">
          <div className="grid grid-cols-2 gap-16">
            <div className="text-center">
              <div className="h-16 border-b border-[#191C1D] mb-2"></div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#54585B]">
                El Director del Departamento de Grados
              </p>
              <p className="text-xs text-[#54585B] mt-1">F.M.K.</p>
            </div>
            <div className="text-center">
              <div className="h-16 border-b border-[#191C1D] mb-2"></div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#54585B]">
                Presidente del Tribunal
              </p>
            </div>
          </div>
          <p className="text-xs text-[#54585B] text-center mt-8">
            Madrid, {hoyStr} — Acta generada por el sistema FMK-Grados
          </p>
        </section>
      </div>
    </div>
  );
}
