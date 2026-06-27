"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  obtenerNotificacionesNoLeidas,
  marcarNotificacionComoLeida,
  marcarTodasComoLeidas,
} from "@/lib/notificaciones/actions";
import { createClient } from "@/lib/supabase/client";

interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  enlace?: string | null;
  leida: boolean;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "ahora mismo";
  if (mins < 60)  return `hace ${mins} min`;
  if (hours < 24) return `hace ${hours}h`;
  if (days < 7)   return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function tipoStyle(tipo: string): { icon: string; cls: string } {
  switch (tipo) {
    case "solicitud":    return { icon: "description",     cls: "text-[#7A1F2A] bg-[#F8E9EB]" };
    case "resultado":    return { icon: "emoji_events",    cls: "text-[#2D6A4F] bg-[#EAF5EF]" };
    case "convocatoria": return { icon: "event_available", cls: "text-[#1A5276] bg-[#EBF5FB]"  };
    case "documento":    return { icon: "folder_open",     cls: "text-[#6E2FBF] bg-[#F3E8FF]" };
    case "sistema":      return { icon: "info",            cls: "text-[#54585B] bg-[#EEF0F1]" };
    default:             return { icon: "notifications",   cls: "text-[#54585B] bg-[#EEF0F1]" };
  }
}

function NotifCard({ notif, onLeer }: { notif: Notificacion; onLeer: (n: Notificacion) => void }) {
  const [expandida, setExpandida] = useState(false);
  const { icon, cls } = tipoStyle(notif.tipo);

  return (
    <div className={`border-b border-[#54585B]/10 last:border-0 ${!notif.leida ? "bg-[#FFF8F8]" : "bg-white"}`}>
      <button
        onClick={() => { setExpandida((v) => !v); if (!notif.leida) onLeer(notif); }}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#F8F9FA] transition-colors"
      >
        <div className={`mt-0.5 h-8 w-8 shrink-0 flex items-center justify-center rounded-full ${cls}`}>
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm leading-snug ${!notif.leida ? "font-bold text-[#191C1D]" : "font-semibold text-[#54585B]"}`}>
              {notif.titulo}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              {!notif.leida && <span className="h-2 w-2 rounded-full bg-[#7A1F2A] mt-1" />}
              <span className="material-symbols-outlined text-[14px] text-[#54585B]/50">
                {expandida ? "expand_less" : "expand_more"}
              </span>
            </div>
          </div>
          <p className={`text-xs text-[#54585B] mt-0.5 leading-relaxed ${expandida ? "" : "line-clamp-1"}`}>
            {notif.mensaje}
          </p>
          <p className="text-[10px] text-[#54585B]/50 mt-1">{timeAgo(notif.created_at)}</p>
        </div>
      </button>
      {expandida && (
        <div className="px-4 pb-3 ml-11">
          <div className="rounded-lg border border-[#54585B]/15 bg-[#F8F9FA] p-3">
            <p className="text-sm text-[#191C1D] leading-relaxed whitespace-pre-line">{notif.mensaje}</p>
            {notif.enlace && (
              <a href={notif.enlace} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#7A1F2A] hover:underline">
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                Ver detalle
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function NotificacionesMenu() {
  const router                          = useRouter();
  const [open, setOpen]                 = useState(false);
  const [tab, setTab]                   = useState<"nuevas" | "historial">("nuevas");
  const [noLeidas, setNoLeidas]         = useState<Notificacion[]>([]);
  const [historial, setHistorial]       = useState<Notificacion[]>([]);
  const [loadingHist, setLoadingHist]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [panelPos, setPanelPos]         = useState({ top: 0, left: 0 });
  const btnRef                          = useRef<HTMLButtonElement>(null);
  const panelRef                        = useRef<HTMLDivElement>(null);

  // Calcular posición del panel al abrir
  function calcularPosicion() {
    if (!btnRef.current) return;
    const rect    = btnRef.current.getBoundingClientRect();
    const panelW  = 384; // w-96
    const panelH  = 440; // altura estimada
    const margin  = 8;

    // Intentar abrir arriba primero
    let top  = rect.top - panelH - margin;
    let left = rect.left;

    // Si se sale por arriba, abrir abajo
    if (top < margin) top = rect.bottom + margin;

    // Si se sale por la derecha, ajustar
    if (left + panelW > window.innerWidth - margin) {
      left = window.innerWidth - panelW - margin;
    }

    // Si se sale por la izquierda
    if (left < margin) left = margin;

    setPanelPos({ top, left });
  }

  // Cerrar al clic fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function cargarNoLeidas() {
    const res = await obtenerNotificacionesNoLeidas();
    if (res?.notificaciones) setNoLeidas(res.notificaciones as Notificacion[]);
  }

  async function cargarHistorial() {
    setLoadingHist(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoadingHist(false); return; }
    const { data } = await supabase
      .from("notificaciones")
      .select("*")
      .eq("user_id", user.id)
      .eq("leida", true)
      .order("created_at", { ascending: false })
      .limit(30);
    setHistorial((data ?? []) as Notificacion[]);
    setLoadingHist(false);
  }

  useEffect(() => {
    cargarNoLeidas();
    const interval = setInterval(cargarNoLeidas, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) return;
      const channel = supabase
        .channel("notif_realtime")
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "notificaciones",
          filter: `user_id=eq.${data.user.id}`,
        }, () => cargarNoLeidas())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    });
  }, []);

  function handleOpen() {
    const next = !open;
    if (next) { calcularPosicion(); cargarNoLeidas(); }
    setOpen(next);
  }

  function handleTab(t: "nuevas" | "historial") {
    setTab(t);
    if (t === "historial" && historial.length === 0) cargarHistorial();
  }

  async function handleLeer(notif: Notificacion) {
    setLoading(true);
    await marcarNotificacionComoLeida(notif.id);
    setNoLeidas((prev) => prev.filter((n) => n.id !== notif.id));
    setHistorial((prev) => [{ ...notif, leida: true }, ...prev]);
    setLoading(false);
    if (notif.enlace) { setOpen(false); router.push(notif.enlace); }
  }

  async function handleMarcarTodas() {
    setLoading(true);
    await marcarTodasComoLeidas();
    const ahora = noLeidas.map((n) => ({ ...n, leida: true }));
    setHistorial((prev) => [...ahora, ...prev]);
    setNoLeidas([]);
    setLoading(false);
  }

  const count = noLeidas.length;

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="relative h-9 w-9 flex items-center justify-center rounded-full border border-[#54585B]/20 bg-white hover:bg-[#F3F4F5] transition"
        aria-label="Notificaciones"
      >
        <span className="material-symbols-outlined text-[20px] text-[#54585B]">notifications</span>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#7A1F2A] text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{ position: "fixed", top: panelPos.top, left: panelPos.left, zIndex: 9999 }}
          className="w-80 sm:w-96 rounded-xl border border-[#54585B]/20 bg-white shadow-xl overflow-hidden"
        >
          {/* Cabecera */}
          <div className="flex items-center justify-between border-b border-[#54585B]/15 px-4 py-3 bg-[#F8F9FA]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#191C1D]">Notificaciones</span>
              {count > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#7A1F2A] px-1.5 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {count > 0 && tab === "nuevas" && (
                <button onClick={handleMarcarTodas} disabled={loading}
                  className="text-xs font-semibold text-[#7A1F2A] hover:underline disabled:opacity-50">
                  Marcar todas leídas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-[#54585B] hover:text-[#191C1D]">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>

          {/* Pestañas */}
          <div className="flex border-b border-[#54585B]/15">
            {(["nuevas", "historial"] as const).map((t) => (
              <button key={t} onClick={() => handleTab(t)}
                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide transition border-b-2 -mb-px ${
                  tab === t ? "border-[#7A1F2A] text-[#7A1F2A]" : "border-transparent text-[#54585B] hover:text-[#191C1D]"
                }`}>
                {t === "nuevas" ? `Nuevas${count > 0 ? ` (${count})` : ""}` : "Historial"}
              </button>
            ))}
          </div>

          {/* Lista */}
          <div className="max-h-72 overflow-y-auto">
            {tab === "nuevas" && (
              noLeidas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <span className="material-symbols-outlined text-4xl text-[#54585B]/30 mb-2">notifications_off</span>
                  <p className="text-sm font-semibold text-[#191C1D]">¡Todo al día!</p>
                  <p className="text-xs text-[#54585B] mt-1">No tienes notificaciones nuevas</p>
                </div>
              ) : (
                noLeidas.map((n) => <NotifCard key={n.id} notif={n} onLeer={handleLeer} />)
              )
            )}
            {tab === "historial" && (
              loadingHist ? (
                <div className="flex items-center justify-center py-8">
                  <span className="material-symbols-outlined animate-spin text-[#7A1F2A]">progress_activity</span>
                </div>
              ) : historial.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <span className="material-symbols-outlined text-4xl text-[#54585B]/30 mb-2">history</span>
                  <p className="text-sm text-[#54585B]">Sin historial todavía</p>
                </div>
              ) : (
                historial.map((n) => <NotifCard key={n.id} notif={n} onLeer={handleLeer} />)
              )
            )}
          </div>

          {/* Pie */}
          <div className="border-t border-[#54585B]/15 px-4 py-2 text-center bg-[#F8F9FA]">
            <p className="text-[11px] text-[#54585B]">
              {tab === "nuevas"
                ? `${count} sin leer`
                : `${historial.length} en historial`}
            </p>
          </div>
        </div>
      )}
    </>
  );
}