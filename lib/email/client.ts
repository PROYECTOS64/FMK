import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  console.warn("[email] RESEND_API_KEY no configurada — los emails no se enviarán.");
}

export const resend = new Resend(process.env.RESEND_API_KEY ?? "");
