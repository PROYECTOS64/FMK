// app/admin/usuarios/[id]/page.tsx
import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import EditarUsuarioClient from "./EditarUsuarioClient";

export const dynamic = 'force-dynamic';

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = createAdminClient();
  const { id: userId } = await params;

  const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId);
  if (authError || !authData.user) return notFound();

  const { data: profile, error: profileError } = await admin
    .from("perfiles_usuario")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (profileError || !profile) return notFound();

  // Buscar fecha_nacimiento en practicantes si es aspirante
  let fecha_nacimiento: string | null = null;
  if (profile.rol === "aspirante") {
    const { data: pract } = await admin
      .from("practicantes")
      .select("fecha_nacimiento")
      .eq("user_id", userId)
      .single();
    fecha_nacimiento = pract?.fecha_nacimiento ?? null;
  }

  const user = {
    id: userId,
    name: profile.nombre_visible,
    email: authData.user.email || "",
    role: profile.rol === "director_fmk" ? "Director FMK" : profile.rol === "aspirante" ? "Aspirante" : profile.rol,
    fecha_nacimiento,
  };

  return <EditarUsuarioClient user={user} />;
}