import { describe, it, expect } from "vitest";
import {
  calculateAge,
  checkEligibility,
} from "./eligibility";
import { Grado, Practicante, Licencia, ReglaNormativa } from "../../types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

/**
 * Regla FMK para Cinturón Azul (grado objetivo al que aspira un Cinturón Verde).
 * Requisitos reales de prueba:
 *   - Edad mínima: 10 años
 *   - Permanencia mínima: 12 meses en el grado actual
 *   - Licencias consecutivas mínimas: 2
 *   - Licencias alternas mínimas: 2
 */
const REGLA_AZUL: ReglaNormativa = {
  grado: Grado.CinturonAzul,
  edadMinima: 10,
  permanenciaMinimaMeses: 12,
  licenciasConsecutivasMin: 2,
  licenciasAlternasMin: 2,
};

/** Practicante base: Verde desde hace 2 años, nacido hace 15 años */
function makePracticante(overrides: Partial<Practicante> = {}): Practicante {
  const hoy = new Date();
  const fechaGrado = new Date(hoy.getFullYear() - 2, hoy.getMonth(), 1);
  const fechaNac = new Date(hoy.getFullYear() - 15, hoy.getMonth(), 1);
  return {
    id: "p1",
    nombre: "Taro",
    apellidos: "Yamashita",
    dni: "12345678A",
    fechaNacimiento: fechaNac,
    clubNombre: "Club FMK",
    estiloNombre: "Shotokan",
    gradoActual: Grado.CinturonVerde,
    fechaGradoActual: fechaGrado,
    rol: "aspirante" as any,
    estado: "aspirante",
    ...overrides,
  };
}

/** Crea una licencia activa para el año indicado */
function makeLicencia(anio: number): Licencia {
  return { id: `lic-${anio}`, practicanteId: "p1", anio, tipo: "consecutiva", estado: "activa" };
}

const REGLAS = [REGLA_AZUL];
const TARGET = Grado.CinturonAzul;

// ─── calculateAge ─────────────────────────────────────────────────────────────

describe("calculateAge", () => {
  it("calcula la edad correctamente para una fecha de nacimiento estándar", () => {
    const hoy = new Date(2025, 5, 15); // 15 jun 2025
    const nacimiento = new Date(2010, 5, 15); // 15 jun 2010
    expect(calculateAge(nacimiento, hoy)).toBe(15);
  });

  it("cumpleaños hoy: devuelve la edad exacta (ya cumplió)", () => {
    const hoy = new Date(2025, 3, 20);
    const nacimiento = new Date(2015, 3, 20);
    expect(calculateAge(nacimiento, hoy)).toBe(10);
  });

  it("cumpleaños mañana: todavía no cumplió, devuelve edad - 1", () => {
    const hoy = new Date(2025, 3, 19);         // 19 abril 2025
    const nacimiento = new Date(2015, 3, 20);  // 20 abril 2015
    expect(calculateAge(nacimiento, hoy)).toBe(9);
  });

  it("nacimiento en diciembre, consulta en enero: edad correcta", () => {
    const hoy = new Date(2025, 0, 5);           // 5 enero 2025
    const nacimiento = new Date(2000, 11, 31);  // 31 dic 2000
    expect(calculateAge(nacimiento, hoy)).toBe(24);
  });
});

// ─── checkEligibility — CONSECUTIVAS ──────────────────────────────────────────

describe("checkEligibility — criterio CONSECUTIVAS", () => {
  const hoy = new Date();
  const anioActual = hoy.getFullYear();

  it("practicante con licencias en todos los años requeridos → cumple", () => {
    // Licencias en anioActual-1 y anioActual (2 consecutivos requeridos)
    const licencias = [makeLicencia(anioActual - 1), makeLicencia(anioActual)];
    const resultado = checkEligibility(makePracticante(), TARGET, licencias, REGLAS);
    expect(resultado.cumpleLicencias).toBe(true);
  });

  it("practicante con un año sin licencia en el período → no cumple consecutivas", () => {
    // Tiene año actual pero falta el anterior → no cumple consecutivas
    // Y solo 1 licencia (un bloque de 2 no cubierto) → no cumple alternas
    const licencias = [makeLicencia(anioActual)];
    const resultado = checkEligibility(makePracticante(), TARGET, licencias, REGLAS);
    expect(resultado.cumpleLicencias).toBe(false);
  });

  it("practicante con exactamente 2 años consecutivos al final → cumple", () => {
    // Solo los últimos 2 años: eso es exactamente licenciasConsecutivasMin
    const licencias = [makeLicencia(anioActual - 1), makeLicencia(anioActual)];
    const resultado = checkEligibility(makePracticante(), TARGET, licencias, REGLAS);
    expect(resultado.cumpleLicencias).toBe(true);
    expect(resultado.esElegible).toBe(true);
  });

  it("practicante con más del mínimo de licencias consecutivas → cumple", () => {
    const licencias = [
      makeLicencia(anioActual - 2),
      makeLicencia(anioActual - 1),
      makeLicencia(anioActual),
    ];
    const resultado = checkEligibility(makePracticante(), TARGET, licencias, REGLAS);
    expect(resultado.cumpleLicencias).toBe(true);
  });
});

// ─── checkEligibility — ALTERNAS ──────────────────────────────────────────────

describe("checkEligibility — criterio ALTERNAS", () => {
  const hoy = new Date();
  const anioActual = hoy.getFullYear();

  it("practicante con licencias en años pares de cada bloque → cumple alternas", () => {
    // Grado obtenido hace 2 años → 3 años en periodo (anio-2, anio-1, anio)
    // Bloques: [anio-2, anio-1] y [anio, anio+1]
    // Licencias en anio-2 y anio → ambos bloques cubiertos
    const fechaGrado = new Date(anioActual - 2, 0, 1);
    const pract = makePracticante({ fechaGradoActual: fechaGrado });
    const licencias = [makeLicencia(anioActual - 2), makeLicencia(anioActual)];
    const resultado = checkEligibility(pract, TARGET, licencias, REGLAS);
    expect(resultado.cumpleLicencias).toBe(true);
  });

  it("practicante con un bloque de 2 años sin ninguna licencia → no cumple alternas", () => {
    // Grado hace 4 años → bloques [a-4, a-3], [a-2, a-1], [a, a+1]
    // Solo licencias en a-4 y a → falta bloque [a-2, a-1]
    const fechaGrado = new Date(anioActual - 4, 0, 1);
    const pract = makePracticante({ fechaGradoActual: fechaGrado });
    const licencias = [makeLicencia(anioActual - 4), makeLicencia(anioActual)];
    const resultado = checkEligibility(pract, TARGET, licencias, REGLAS);
    // No cumple alternas (bloque [a-2, a-1] vacío) y tampoco consecutivas
    expect(resultado.cumpleLicencias).toBe(false);
  });

  it("practicante que cumple alternas pero no consecutivas → esElegible true", () => {
    // Grado hace 2 años. Bloques: [a-2, a-1] y [a, a+1]
    // Licencias: a-2 y a → cada bloque tiene al menos una. Pero a-1 falta → no consecutivas
    const fechaGrado = new Date(anioActual - 2, 0, 1);
    const pract = makePracticante({ fechaGradoActual: fechaGrado });
    const licencias = [makeLicencia(anioActual - 2), makeLicencia(anioActual)];
    const resultado = checkEligibility(pract, TARGET, licencias, REGLAS);
    // Cumple alternas (ambos bloques cubiertos) → esElegible true
    expect(resultado.cumpleLicencias).toBe(true);
    expect(resultado.esElegible).toBe(true);
  });
});

// ─── checkEligibility — ELEGIBILIDAD GENERAL ──────────────────────────────────

describe("checkEligibility — elegibilidad general", () => {
  const hoy = new Date();
  const anioActual = hoy.getFullYear();

  /** Licencias que cumplen el criterio consecutivo */
  const licenciasOK = [makeLicencia(anioActual - 1), makeLicencia(anioActual)];

  it("no cumple edad → esElegible false aunque cumpla el resto", () => {
    // Nacido hace 9 años (edad mínima es 10)
    const fechaNac = new Date(hoy.getFullYear() - 9, hoy.getMonth(), 1);
    const pract = makePracticante({ fechaNacimiento: fechaNac });
    const resultado = checkEligibility(pract, TARGET, licenciasOK, REGLAS);
    expect(resultado.cumpleEdad).toBe(false);
    expect(resultado.esElegible).toBe(false);
  });

  it("no cumple permanencia → esElegible false aunque cumpla el resto", () => {
    // Grado obtenido hace solo 6 meses (necesita 12)
    const fechaGrado = new Date(hoy.getFullYear(), hoy.getMonth() - 6, 1);
    const pract = makePracticante({ fechaGradoActual: fechaGrado });
    const resultado = checkEligibility(pract, TARGET, licenciasOK, REGLAS);
    expect(resultado.cumplePermanencia).toBe(false);
    expect(resultado.esElegible).toBe(false);
  });

  it("cumple todo → esElegible true", () => {
    // Practicante base: 15 años, grado hace 2 años, licencias OK
    const resultado = checkEligibility(makePracticante(), TARGET, licenciasOK, REGLAS);
    expect(resultado.cumpleEdad).toBe(true);
    expect(resultado.cumplePermanencia).toBe(true);
    expect(resultado.cumpleLicencias).toBe(true);
    expect(resultado.esElegible).toBe(true);
  });

  it("devuelve porcentajeProgreso 100 cuando cumple permanencia", () => {
    const resultado = checkEligibility(makePracticante(), TARGET, licenciasOK, REGLAS);
    expect(resultado.porcentajeProgreso).toBe(100);
  });

  it("devuelve fechaEstimadaElegibilidad cuando no cumple permanencia", () => {
    const fechaGrado = new Date(hoy.getFullYear(), hoy.getMonth() - 6, 1);
    const pract = makePracticante({ fechaGradoActual: fechaGrado });
    const resultado = checkEligibility(pract, TARGET, licenciasOK, REGLAS);
    expect(resultado.fechaEstimadaElegibilidad).toBeInstanceOf(Date);
    // Debe ser 12 meses después de la fecha del grado
    const esperada = new Date(fechaGrado);
    esperada.setMonth(esperada.getMonth() + 12);
    expect(resultado.fechaEstimadaElegibilidad!.getFullYear()).toBe(esperada.getFullYear());
    expect(resultado.fechaEstimadaElegibilidad!.getMonth()).toBe(esperada.getMonth());
  });

  it("lanza error si no existe regla para el grado objetivo", () => {
    expect(() =>
      checkEligibility(makePracticante(), Grado.Dan10, licenciasOK, REGLAS)
    ).toThrow();
  });

  it("licenciasAcumuladas refleja solo licencias activas desde el grado actual", () => {
    const caducada: Licencia = { ...makeLicencia(anioActual - 1), estado: "caducada" };
    const resultado = checkEligibility(
      makePracticante(),
      TARGET,
      [makeLicencia(anioActual), caducada],
      REGLAS
    );
    expect(resultado.licenciasAcumuladas).toBe(1); // Solo la activa
  });
});
