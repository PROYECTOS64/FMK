import { getMisLicencias } from "./actions";
import { LicenciasClient } from "./LicenciasClient";

export const dynamic = "force-dynamic";

export default async function LicenciasPage() {
  const licencias = await getMisLicencias();
  return (
    <div className="mx-auto max-w-4xl">
      <div className="border-b border-[#54585B]/20 pb-6 mb-6">
        <p className="text-xs font-bold uppercase tracking-wide text-[#7A1F2A]">
          Documentación federativa
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#191C1D]"
          style={{ fontFamily: "Montserrat, sans-serif" }}>
          Mis Licencias
        </h1>
        <p className="mt-1 text-sm text-[#54585B]">
          Sube tus licencias anuales para acreditar tu práctica federada.
          Máximo 15 licencias. Formatos aceptados: PDF, JPG, PNG (máx. 10 MB).
        </p>
      </div>
      <LicenciasClient licenciasIniciales={licencias} />
    </div>
  );
}