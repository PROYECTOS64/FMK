import { resend } from "./client";

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const from = process.env.EMAIL_FROM || "noreply@fmk.es";
  
  if (!process.env.RESEND_API_KEY) {
    console.log(`[Mock Email] To: ${to} | Subject: ${subject}`);
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Error enviando email con Resend:", error);
    }
  } catch (err) {
    console.error("Excepción enviando email:", err);
  }
}
