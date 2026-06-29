import {
  Grado,
  Practicante,
  Licencia,
  ReglaNormativa,
  ResultadoElegibilidad,
} from "../../types";

/**
 * Calcula la edad en años basándose en una fecha de nacimiento y una fecha objetivo (por defecto hoy).
 */
export function calculateAge(birthDate: Date, targetDate: Date = new Date()): number {
  let age = targetDate.getFullYear() - birthDate.getFullYear();
  const m = targetDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && targetDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Calcula la diferencia en meses entre dos fechas.
 */
export function calculateMonthsBetween(startDate: Date, endDate: Date = new Date()): number {
  return (
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth())
  );
}

/**
 * Verifica si un practicante es elegible para presentarse a un grado específico.
 */
export function checkEligibility(
  practicante: Practicante,
  targetGrade: Grado,
  licencias: Licencia[],
  reglas: ReglaNormativa[]
): ResultadoElegibilidad {
  const regla = reglas.find((r) => r.grado === targetGrade);

  if (!regla) {
    throw new Error(`No se encontraron reglas para el grado ${targetGrade}`);
  }

  const edadActual = calculateAge(practicante.fechaNacimiento);
  const mesesTranscurridos = calculateMonthsBetween(practicante.fechaGradoActual);

  const anioGradoActual = practicante.fechaGradoActual.getFullYear();
  const anioActual = new Date().getFullYear();

  // Conjunto de años con licencia activa desde el grado actual
  const aniosConLicencia = new Set(
    licencias
      .filter((l) => l.anio >= anioGradoActual && l.estado === 'activa')
      .map((l) => l.anio)
  );
  const licenciasAcumuladas = aniosConLicencia.size;

  // --- Criterio 1: LICENCIAS CONSECUTIVAS ---
  // El practicante debe tener licencia en cada año desde anioGradoActual hasta anioActual.
  let cumpleLicenciasConsecutivas = false;
  if (regla.licenciasConsecutivasMin > 0) {
    const totalAnios = anioActual - anioGradoActual + 1;
    // Debe cubrir al menos licenciasConsecutivasMin años consecutivos al final del período
    // i.e., los últimos N años hasta hoy no pueden tener ningún hueco.
    if (totalAnios >= regla.licenciasConsecutivasMin) {
      const primerAnioRequerido = anioActual - regla.licenciasConsecutivasMin + 1;
      let todasPresentes = true;
      for (let anio = primerAnioRequerido; anio <= anioActual; anio++) {
        if (!aniosConLicencia.has(anio)) {
          todasPresentes = false;
          break;
        }
      }
      cumpleLicenciasConsecutivas = todasPresentes;
    }
  }

  // --- Criterio 2: LICENCIAS ALTERNAS ---
  // El practicante debe tener licencia en al menos uno de cada dos años
  // desde anioGradoActual hasta anioActual.
  // Se agrupa el período en bloques de 2 años: [año0, año1], [año2, año3], ...
  // Cada bloque debe tener al menos una licencia.
  let cumpleLicenciasAlternas = false;
  if (regla.licenciasAlternasMin > 0) {
    const totalAnios = anioActual - anioGradoActual + 1;
    const totalBloques = Math.ceil(totalAnios / 2);

    if (licenciasAcumuladas >= regla.licenciasAlternasMin) {
      let bloquesConLicencia = 0;
      for (let bloque = 0; bloque < totalBloques; bloque++) {
        const anioA = anioGradoActual + bloque * 2;
        const anioB = anioA + 1;
        if (aniosConLicencia.has(anioA) || aniosConLicencia.has(anioB)) {
          bloquesConLicencia++;
        }
      }
      // Cumple si todos los bloques tienen al menos una licencia
      cumpleLicenciasAlternas = bloquesConLicencia === totalBloques;
    }
  }

  // El practicante cumple el criterio de licencias si satisface CUALQUIERA de los dos
  const cumpleLicencias = cumpleLicenciasConsecutivas || cumpleLicenciasAlternas;

  const cumpleEdad = edadActual >= regla.edadMinima;
  const cumplePermanencia = mesesTranscurridos >= regla.permanenciaMinimaMeses;

  let porcentajeProgreso = 0;
  if (mesesTranscurridos >= regla.permanenciaMinimaMeses) {
    porcentajeProgreso = 100;
  } else {
    porcentajeProgreso = (mesesTranscurridos / regla.permanenciaMinimaMeses) * 100;
  }

  let fechaEstimadaElegibilidad: Date | undefined;
  if (!cumplePermanencia) {
    fechaEstimadaElegibilidad = new Date(practicante.fechaGradoActual);
    fechaEstimadaElegibilidad.setMonth(
      fechaEstimadaElegibilidad.getMonth() + regla.permanenciaMinimaMeses
    );
  }

  return {
    esElegible: cumpleEdad && cumplePermanencia && cumpleLicencias,
    cumpleEdad,
    cumplePermanencia,
    cumpleLicencias,
    edadActual,
    edadMinima: regla.edadMinima,
    mesesTranscurridos,
    mesesMinimos: regla.permanenciaMinimaMeses,
    licenciasAcumuladas,
    licenciasMinimas: Math.min(regla.licenciasConsecutivasMin, regla.licenciasAlternasMin),
    porcentajeProgreso,
    fechaEstimadaElegibilidad,
  };
}
