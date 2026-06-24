import { getDashboardData } from "@/app/aspirante/actions";
import Link from "next/link";

const ESTADO_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  borrador: { label: "Borrador", color: "text-[#54585B] bg-[#F8F9FA] border-[#54585B]/30", icon: "edit_note" },
  enviada: { label: "Enviada", color: "text-[#7A1F2A] bg-[#F8E9EB] border-[#7A1F2A]/30", icon: "pending_actions" },
  en_revision: { label: "En revisión", color: "text-[#7A1F2A] bg-[#F8E9EB] border-[#7A1F2A]/30", icon: "pending_actions" },
  documentacion_incompleta: { label: "Documentación incompleta", color: "text-[#BA1A1A] bg-[#FFF1F2] border-[#BA1A1A]/30", icon: "warning" },
  validada: { label: "Validada", color: "text-[#2D6A4F] bg-[#EAF5EF] border-[#2D6A4F]/30", icon: "verified" },
  programada: { label: "Programada", color: "text-[#2D6A4F] bg-[#EAF5EF] border-[#2D6A4F]/30", icon: "event_available" },
};

const DOC_ESTADO: Record<string, { label: string; color: string }> = {
  pendiente: { label: "Pendiente", color: "text-[#54585B]" },
  cargado: { label: "Cargado", color: "text-[#2D6A4F]" },
  en_revision: { label: "En revisión", color: "text-[#54585B]" },
  validado: { label: "Validado ✓", color: "text-[#2D6A4F] font-bold" },
  rechazado: { label: "Rechazado", color: "text-[#BA1A1A] font-bold" },
};

export default async function PanelAspirantePage() {
  const { practicante, historial, licencias, solicitudActiva, documentos } = await getDashboardData();

  const estadoInfo = solicitudActiva ? ESTADO_LABELS[solicitudActiva.estado] ?? ESTADO_LABELS.borrador : null;
  const convocatoria = (solicitudActiva as any)?.convocatorias;

  const pasos = [
    { label: "Borrador creado", done: !!solicitudActiva },
    { label: "Solicitud enviada", done: solicitudActiva ? ["enviada", "en_revision", "documentacion_incompleta", "validada", "programada"].includes(solicitudActiva.estado) : false },
    { label: "En revisión", done: solicitudActiva ? ["en_revision", "documentacion_incompleta", "validada", "programada"].includes(solicitudActiva.estado) : false, current: solicitudActiva?.estado === "en_revision" || solicitudActiva?.estado === "documentacion_incompleta" },
    { label: "Validada / Programada", done: solicitudActiva ? ["validada", "programada"].includes(solicitudActiva.estado) : false },
  ];

  const nombreCompleto = `${practicante.nombre} ${practicante.apellidos}`;
  const iniciales = `${practicante.nombre?.[0] ?? ""}${practicante.apellidos?.[0] ?? ""}`.toUpperCase();

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6">
      {/* Header */}
      <div className="border-b border-[#54585B]/20 pb-6 mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#7A1F2A]">
            {solicitudActiva ? "Solicitud Activa" : "Sin Solicitud Activa"}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#191C1D]" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Panel Principal
          </h1>
          <p className="mt-1 text-sm text-[#54585B]">
            Hola, <strong>{practicante.nombre}</strong>. Grado actual: <strong>{practicante.grado_actual}</strong>.
          </p>
        </div>
        <Link
          href="/aspirante/solicitud"
          id="btn-nueva-solicitud"
          className="h-11 rounded border border-[#7A1F2A] bg-white px-3 sm:px-4 text-sm font-bold text-[#7A1F2A] hover:bg-[#F8E9EB] transition flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
          {solicitudActiva ? "Ver solicitud" : "Nueva solicitud"}
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)]">
        <div className="space-y-6">
          {/* Status Alert */}
          {solicitudActiva && estadoInfo ? (
            <section className={`rounded-lg border p-5 flex gap-4 items-start ${estadoInfo.color}`}>
              <span className="material-symbols-outlined text-2xl mt-0.5">{estadoInfo.icon}</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-1">Estado: {estadoInfo.label}</p>
                <h2 className="text-lg font-bold text-[#191C1D]" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  {solicitudActiva.estado === "documentacion_incompleta"
                    ? "Debes subsanar la documentación"
                    : solicitudActiva.estado === "validada" || solicitudActiva.estado === "programada"
                    ? "¡Documentación aprobada! Examen programado"
                    : "Tu solicitud está en proceso"}
                </h2>
                {convocatoria && (
                  <p className="text-sm text-[#54585B] mt-1">
                    Convocatoria: <strong>{convocatoria.nombre}</strong> ·{" "}
                    {new Date(convocatoria.fecha_examen).toLocaleDateString("es-ES")} · {convocatoria.sede}
                  </p>
                )}
              </div>
            </section>
          ) : (
            <section className="rounded-lg border border-[#54585B]/20 bg-white p-5 flex gap-4 items-start">
              <span className="material-symbols-outlined text-2xl mt-0.5 text-[#54585B]">info</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-1 text-[#54585B]">Sin solicitud activa</p>
                <h2 className="text-lg font-bold text-[#191C1D]" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  Aún no tienes ninguna solicitud en curso
                </h2>
                <p className="text-sm text-[#54585B] mt-1">
                  Pulsa «Nueva solicitud» para inscribirte en una convocatoria de examen de grado.
                </p>
              </div>
            </section>
          )}

          {/* Timeline */}
          {solicitudActiva && (
            <section className="rounded-lg border border-[#54585B]/20 bg-white p-6">
              <h3 className="font-bold text-[#191C1D] text-lg mb-6" style={{ fontFamily: "Montserrat, sans-serif" }}>Progreso de la Solicitud</h3>
              <div className="relative border-l-2 border-[#EAF5EF] ml-3 space-y-8 pb-4">
                {pasos.map((paso, i) => (
                  <div key={i} className="relative pl-6">
                    <div className={`absolute -left-[11px] top-0 h-5 w-5 rounded-full border-2 border-white flex items-center justify-center ${
                      paso.done ? "bg-[#2D6A4F]" : paso.current ? "bg-[#7A1F2A] animate-pulse" : "bg-[#DDE0E3]"
                    }`}>
                      {paso.done && <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>}
                    </div>
                    <p className={`font-bold ${paso.done ? "text-[#191C1D]" : paso.current ? "text-[#7A1F2A]" : "text-[#54585B] opacity-60"}`}>
                      {paso.label}
                    </p>
                    {i === 0 && paso.done && (
                      <p className="text-sm text-[#54585B] mt-1">
                        {new Date(solicitudActiva.created_at).toLocaleDateString("es-ES")}
                      </p>
                    )}
                    {i === 1 && paso.done && (
                      <p className="text-sm text-[#54585B] mt-1">Vía: {solicitudActiva.via_elegida ?? "—"}</p>
                    )}
                    {i === 2 && paso.current && (
                      <p className="text-sm text-[#54585B] mt-1">La FMK está validando tu documentación.</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Historial de grados (ASP-04) */}
          <section className="rounded-lg border border-[#54585B]/20 bg-white p-6">
            <h3 className="font-bold text-[#191C1D] text-lg mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>Historial de Grados</h3>
            {historial.length === 0 ? (
              <p className="text-sm text-[#54585B]">No hay grados registrados en el historial.</p>
            ) : (
              <div className="space-y-3">
                {historial.map((h: any, i: number) => (
                  <div key={i} className="flex justify-between items-center border-b border-[#54585B]/10 pb-2 last:border-0">
                    <span className="font-semibold text-[#191C1D]">{h.grado}</span>
                    <span className="text-xs text-[#54585B]">{new Date(h.fecha_obtencion).toLocaleDateString("es-ES")}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Ficha del aspirante */}
          <section className="rounded-lg border border-[#54585B]/20 bg-white p-5">
            <h3 className="font-bold text-[#191C1D] text-sm uppercase tracking-wide mb-4">Ficha de Examen</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-[#54585B] text-xs font-bold uppercase mb-1">Aspirante</p>
                <p className="font-semibold text-[#191C1D]">{nombreCompleto}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[#54585B] text-xs font-bold uppercase mb-1">Grado Actual</p>
                  <p className="font-semibold text-[#191C1D]">{practicante.grado_actual}</p>
                </div>
                {solicitudActiva && (
                  <div>
                    <p className="text-[#54585B] text-xs font-bold uppercase mb-1">Solicita</p>
                    <p className="font-semibold text-[#7A1F2A]">{solicitudActiva.grado_solicitado}</p>
                  </div>
                )}
              </div>
              {solicitudActiva?.via_elegida && (
                <div>
                  <p className="text-[#54585B] text-xs font-bold uppercase mb-1">Vía Elegida</p>
                  <p className="font-semibold text-[#191C1D] capitalize">{solicitudActiva.via_elegida}</p>
                </div>
              )}
              {convocatoria && (
                <div>
                  <p className="text-[#54585B] text-xs font-bold uppercase mb-1">Convocatoria</p>
                  <p className="font-semibold text-[#191C1D]">
                    {new Date(convocatoria.fecha_examen).toLocaleDateString("es-ES")}
                  </p>
                  <p className="text-xs text-[#54585B]">{convocatoria.sede}</p>
                </div>
              )}
            </div>
          </section>

          {/* Documentación (ASP-27) */}
          {solicitudActiva && (
            <section className="rounded-lg border border-[#54585B]/20 bg-white p-5">
              <h3 className="font-bold text-[#191C1D] text-sm uppercase tracking-wide mb-4">Documentación</h3>
              {documentos.length === 0 ? (
                <p className="text-sm text-[#54585B]">Ningún documento cargado todavía.</p>
              ) : (
                <div className="space-y-3">
                  {documentos.map((doc: any) => {
                    const est = DOC_ESTADO[doc.estado_validacion] ?? { label: doc.estado_validacion, color: "text-[#54585B]" };
                    return (
                      <div key={doc.id} className="flex justify-between items-start border-b border-[#54585B]/10 pb-2 last:border-0 last:pb-0">
                        <div>
                          <span className="text-sm text-[#191C1D]">{doc.tipo}</span>
                          {doc.comentarios_revision && (
                            <p className="text-xs text-[#BA1A1A] mt-0.5">{doc.comentarios_revision}</p>
                          )}
                        </div>
                        <span className={`text-xs font-bold uppercase ${est.color} shrink-0 ml-2`}>{est.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Licencias (ASP-05) */}
          <section className="rounded-lg border border-[#54585B]/20 bg-white p-5">
            <h3 className="font-bold text-[#191C1D] text-sm uppercase tracking-wide mb-4">Licencias Federativas</h3>
            {licencias.length === 0 ? (
              <p className="text-sm text-[#54585B]">Sin licencias registradas.</p>
            ) : (
              <div className="space-y-2">
                {licencias.slice(0, 5).map((lic: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-sm border-b border-[#54585B]/10 pb-1 last:border-0">
                    <span className="text-[#191C1D] font-medium">{lic.anio}</span>
                    <span className="text-xs text-[#54585B] capitalize">{lic.tipo} · {lic.estado}</span>
                  </div>
                ))}
                {licencias.length > 5 && (
                  <p className="text-xs text-[#7A1F2A] font-bold mt-1">+{licencias.length - 5} más</p>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
