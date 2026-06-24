export enum Grado {
  CinturonBlanco = "Cinturón Blanco",
  CinturonAmarillo = "Cinturón Amarillo",
  CinturonNaranja = "Cinturón Naranja",
  CinturonVerde = "Cinturón Verde",
  CinturonAzul = "Cinturón Azul",
  CinturonMarron = "Cinturón Marrón",
  CinturonNegro = "Cinturón Negro",
  Dan1 = "1º Dan",
  Dan2 = "2º Dan",
  Dan3 = "3º Dan",
  Dan4 = "4º Dan",
  Dan5 = "5º Dan",
  Dan6 = "6º Dan",
  Dan7 = "7º Dan",
  Dan8 = "8º Dan",
  Dan9 = "9º Dan",
  Dan10 = "10º Dan",
}

export enum Rol {
  Admin = "admin",
  DirectorFMK = "director_fmk",
  Aspirante = "aspirante",
}

export enum EstadoSolicitud {
  Borrador = "borrador",
  Enviada = "enviada",
  EnRevision = "en_revision",
  DocumentacionIncompleta = "documentacion_incompleta",
  Validada = "validada",
  Rechazada = "rechazada",
  Programada = "programada",
  Finalizada = "finalizada",
}

export enum EstadoDocumento {
  Pendiente = "pendiente",
  Cargado = "cargado",
  EnRevision = "en_revision",
  Validado = "validado",
  Rechazado = "rechazado",
}

export enum ViaBloque {
  Kumite = "kumite",
  Campeonatos = "campeonatos",
  Tecnica = "tecnica",
}

export interface Practicante {
  id: string;
  nombre: string;
  apellidos: string;
  dni: string;
  fechaNacimiento: Date;
  clubNombre: string;
  estiloNombre: string;
  gradoActual: Grado;
  fechaGradoActual: Date;
  rol: Rol;
  estado: "estudiante" | "aspirante";
}

export interface Licencia {
  id: string;
  practicanteId: string;
  anio: number;
  tipo: "consecutiva" | "alterna";
  estado: "activa" | "caducada";
}

export interface Convocatoria {
  id: string;
  grados: Grado[];
  fechaExamen: Date;
  sede: string;
  fechaLimiteInscripcion: Date;
  cuota: number;
  viasHabilitadas: ViaBloque[];
  estado: "borrador" | "abierta" | "cerrada" | "en_curso" | "finalizada";
}

export interface Documento {
  id: string;
  tipo: string;
  bucket_path: string;
  estadoValidacion: EstadoDocumento;
  fechaCarga?: Date;
}

export interface Solicitud {
  id: string;
  aspirante: Practicante;
  convocatoria: Convocatoria;
  viaElegida?: ViaBloque;
  situacionEspecial?: string;
  estadoPago: "pendiente" | "pagado" | "exento";
  estado: EstadoSolicitud;
  documentos: Documento[];
  fechaCreacion: Date;
}

export interface ReglaNormativa {
  grado: Grado;
  edadMinima: number;
  permanenciaMinimaMeses: number;
  licenciasConsecutivasMin: number;
  licenciasAlternasMin: number;
}

export interface ResultadoElegibilidad {
  esElegible: boolean;
  cumpleEdad: boolean;
  cumplePermanencia: boolean;
  cumpleLicencias: boolean;
  edadActual: number;
  edadMinima: number;
  mesesTranscurridos: number;
  mesesMinimos: number;
  licenciasAcumuladas: number;
  licenciasMinimas: number;
  porcentajeProgreso: number;
  fechaEstimadaElegibilidad?: Date;
}

export interface ResultadoValidacionDocumental {
  completo: boolean;
  faltantes: string[];
  advertencias: string[];
}

export interface CuotaResult {
  cuotaBase: number;
  reduccion: number;
  porcentajeReduccion: number;
  exenta: boolean;
  importeFinal: number;
  motivo: string;
}
