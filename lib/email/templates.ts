export function emailSolicitudRecibida(nombre: string, gradoSolicitado: string, fechaExamen: Date): string {
  const fechaStr = fechaExamen.toLocaleDateString('es-ES');
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #7A1F2A; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Solicitud Recibida</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee;">
        <p>Hola ${nombre},</p>
        <p>Hemos recibido correctamente tu solicitud de examen para el grado de <strong>${gradoSolicitado}</strong>.</p>
        <p>La fecha prevista para el examen es el <strong>${fechaStr}</strong>.</p>
        <p>En los próximos días, el Departamento de Grados revisará tu documentación. Te notificaremos si todo es correcto o si necesitamos que subsanes algún documento.</p>
        <br/>
        <p>Un saludo,</p>
        <p>Federación Madrileña de Karate</p>
      </div>
    </div>
  `;
}

export function emailDocumentacionIncompleta(nombre: string, documentosRechazados: string[], motivos: string[]): string {
  const listHtml = documentosRechazados.map((doc, i) => `<li><strong>${doc}</strong>: ${motivos[i]}</li>`).join('');
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #7A1F2A; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Documentación Incompleta</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee;">
        <p>Hola ${nombre},</p>
        <p>El Departamento de Grados ha revisado tu solicitud y ha encontrado problemas en algunos documentos:</p>
        <ul>
          ${listHtml}
        </ul>
        <p>Por favor, accede a la plataforma y sube los documentos corregidos para poder continuar con el trámite.</p>
        <br/>
        <p>Un saludo,</p>
        <p>Federación Madrileña de Karate</p>
      </div>
    </div>
  `;
}

export function emailSolicitudValidada(nombre: string, gradoSolicitado: string, sede: string, fechaExamen: Date): string {
  const fechaStr = fechaExamen.toLocaleDateString('es-ES');
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #7A1F2A; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Solicitud Validada</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee;">
        <p>Hola ${nombre},</p>
        <p>Tu documentación ha sido revisada y <strong>aprobada</strong>.</p>
        <p>Quedas formalmente convocado para el examen de <strong>${gradoSolicitado}</strong>.</p>
        <ul>
          <li><strong>Fecha:</strong> ${fechaStr}</li>
          <li><strong>Sede:</strong> ${sede}</li>
        </ul>
        <p>¡Mucho éxito en tu preparación!</p>
        <br/>
        <p>Un saludo,</p>
        <p>Federación Madrileña de Karate</p>
      </div>
    </div>
  `;
}

export function emailResultadoFinal(nombre: string, gradoSolicitado: string, aprobado: boolean): string {
  const resultadoText = aprobado ? "APTO" : "NO APTO";
  const mensaje = aprobado 
    ? "¡Enhorabuena! Has superado con éxito las pruebas y obtenido tu nuevo grado."
    : "Lo sentimos, en esta ocasión no has superado las pruebas. Te animamos a seguir trabajando y preparándote para la próxima convocatoria.";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #7A1F2A; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Resultado de Examen</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee;">
        <p>Hola ${nombre},</p>
        <p>Se ha emitido el Acta Oficial correspondiente a tu examen para <strong>${gradoSolicitado}</strong>.</p>
        <p>Tu resultado es: <strong>${resultadoText}</strong></p>
        <p>${mensaje}</p>
        <br/>
        <p>Un saludo,</p>
        <p>Federación Madrileña de Karate</p>
      </div>
    </div>
  `;
}
