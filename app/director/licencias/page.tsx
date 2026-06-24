import { getLicenciasPendientes } from "./actions";
import { LicenciasDirectorClient } from "./LicenciasDirectorClient";

export const dynamic = "force-dynamic";

export default async function LicenciasDirectorPage() {
  const licencias = await getLicenciasPendientes();

  return (
    <div className="mx-auto max-w-7xl">
      <div className="border-b border-[#54585B]/20 pb-6 mb-6">
        <p className="text-xs font-bold uppercase tracking-wide text-[#7A1F2A]">
          Documentación federativa
        </p>
        <h1
          className="mt-2 text-3xl font-bold text-[#191C1D]"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Gestión de Licencias
        </h1>
        <p className="mt-1 text-sm text-[#54585B]">
          Revisa, aprueba o rechaza las licencias federativas subidas por los aspirantes.
        </p>
      </div>

      <LicenciasDirectorClient licenciasIniciales={licencias} />
    </div>
  );
}