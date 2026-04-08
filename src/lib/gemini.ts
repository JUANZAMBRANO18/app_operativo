import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const LEY_1801_SYSTEM_PROMPT = `
Actúa como un Abogado y Oficial de Policía experto de Colombia, especialista en la Ley 1801 de 2016, actualizado a ABRIL de 2026.

Tu misión es generar un RELATO DE PROCEDIMIENTO POLICIAL (NARRATIVA) que sea narrativo, técnico y extremadamente sólido jurídicamente, integrando las últimas circulares de la Dirección General y la jurisprudencia vigente.

CONOCIMIENTO BASE (FACULTADES):
- REGISTROS: Estás facultado por los artículos 158 (Registro de personas), 159 (Registro de medios de transporte), 160 (Registro de establecimientos) y 161 (Registro de bienes muebles) de la Ley 1801 de 2016.
- MEDIACIÓN POLICIAL: Artículos que permiten la mediación incluyen: 27 (Comportamientos que afectan la integridad), 33 (Tranquilidad y relaciones respetuosas), 35 (Relación con las autoridades), 92 (Comportamientos en establecimientos), 93 (Seguridad en establecimientos), 103 (Control de actividades comerciales), 111 (Limpieza y recolección de residuos), 139 (Espacio público), 140 (Comportamientos en el espacio público), 146 (Protección de bienes inmuebles).

REGLAS PARA EL RELATO (NARRACIÓN DE HECHOS):
1. NARRATIVA CONTINUA: El relato debe leerse como una oración gramatical firmada por el uniformado, compuesta por elementos bajo requisitos técnicos exigidos por la Ley.
2. PRECISIÓN TÉCNICA: Si hay elementos incautados (armas, sustancias), descríbalos en detalle (ej: "arma tipo cortopunzante y/o cortante: Navaja, cacha plástica, color negro, marca Stainless...").
3. HALLAZGO: Especifique dónde se encontró el elemento (ej: "Hallada en el bolsillo delantero derecho del pantalón que vestía").
4. JUSTIFICACIÓN CIUDADANA: Incluya explícitamente si el ciudadano demuestra o no que el elemento constituye una herramienta para su actividad lícita (ej: "El ciudadano NO demuestra que dicho elemento constituya herramienta para su actividad deportiva, oficio, profesión o estudio").
5. CONCLUSIÓN: Termine vinculando la conducta con la norma (ej: "Configurando así comportamiento contrario a la convivencia").
6. TERMINOLOGÍA: Use "Zona de Atención" en lugar de cuadrantes. Use "Dirección" exacta del lugar de los hechos.
7. FORMATO DE HORA: Use SIEMPRE el formato de hora militar (24 horas) en todos los relatos (ej: 14:30 horas en lugar de 2:30 PM).

REGLAS PARA LOS DESCARGOS (MANIFESTACIÓN CIUDADANA):
1. GARANTÍA LEGAL: Inicie siempre mencionando: "En garantía del numeral (3) del artículo (222) de la Ley 1801/2016, se escucha en descargos al ciudadano...".
2. FIDELIDAD: Resuma lo manifestado por el ciudadano de forma coherente y profesional.

REGLAS PARA LA MEDIACIÓN POLICIAL:
1. MEDIO DE POLICÍA: Si se aplica Mediación Policial, aclare que es un MEDIO DE POLICÍA según el parágrafo (2) del artículo (27) (o el que aplique) y que NO se indican medidas correctivas.
2. ACUERDOS: Mencione que se lograron acuerdos libres, espontáneos y voluntarios entre las partes.

ESTRUCTURA DEL RELATO FINAL:
- Encabezado: Datos del procedimiento (Fecha, Hora Militar, Dirección, Zona de Atención).
- Narración de Hechos: Relato técnico detallado.
- Descargos: Manifestación del ciudadano bajo el art. 222.
- Medida Correctiva / Mediación: Especifique qué se aplicó y por qué.
- Fundamento Legal: Artículos y numerales aplicados.

Tono: Altamente técnico, objetivo, sin opiniones personales, enfocado en la legalidad y el debido proceso.
`;

export async function generarRelatoIA(
  articulo: string, 
  numeral: string, 
  paragrafo: string,
  contexto: string, 
  ciudadano: { nombre: string, tipoDoc: string, numDoc: string },
  location?: string, 
  timestamp?: string,
  descargos?: string,
  mediacion?: boolean,
  zonaAtencion?: string
) {
  try {
    const prompt = `
      DATOS DEL CIUDADANO:
      Nombre: ${ciudadano.nombre}
      Documento: ${ciudadano.tipoDoc} ${ciudadano.numDoc}

      DATOS DEL PROCEDIMIENTO:
      ARTÍCULO: ${articulo}
      NUMERAL: ${numeral}
      PARÁGRAFO: ${paragrafo || "N/A"}
      HECHOS: ${contexto}
      DESCARGOS CIUDADANOS: ${descargos || "No manifestó"}
      MEDIACIÓN POLICIAL: ${mediacion ? "SÍ" : "NO"}
      UBICACIÓN: ${location || "No proporcionada"}
      ZONA DE ATENCIÓN: ${zonaAtencion || "No especificada"}
      FECHA/HORA: ${timestamp || new Date().toLocaleString('es-CO', { hour12: false })}
      
      Genere el relato siguiendo estrictamente las reglas del sistema, incluyendo la Narración de Hechos, los Descargos (art. 222) y la Medida Correctiva o Mediación Policial según corresponda. Use hora militar.
    `;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: LEY_1801_SYSTEM_PROMPT,
        temperature: 0.5,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Error generating report:", error);
    throw error;
  }
}

export async function consultarLeyIA(articulo: string, numeral: string) {
  try {
    const prompt = `
      CONSULTA DE COMPARENDO:
      Artículo: ${articulo}
      Numeral: ${numeral}
      
      Por favor, proporcione el fundamento completo según las reglas del Módulo de Comparendos, incluyendo texto literal, interpretación jurídica, interpretación policial, jurisprudencia relevante y el procedimiento táctico paso a paso. Responda en español.
    `;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: LEY_1801_SYSTEM_PROMPT,
        temperature: 0.3,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Error legal consultation:", error);
    throw error;
  }
}

export async function simularCasoIA(scenario: string, userAction: string, history: any[]) {
  try {
    const prompt = `
      ESCENARIO: ${scenario}
      ACCIÓN POLICIAL: ${userAction}
      HISTORIAL: ${JSON.stringify(history)}
      
      Evalúe la acción policial según la Ley 1801 de 2016 de forma MUY BREVE Y PRECISA.
      
      FORMATO DE RESPUESTA:
      - CONSEJO TÁCTICO: [Un consejo corto y directo]
      - EVALUACIÓN: [¿Es legal? ¿Qué artículo aplica?]
      - ACCIÓN CORRECTA: [Si el usuario se equivocó, diga cuál era la mejor opción y por qué. Si acertó, felicítelo brevemente]
      
      Sea extremadamente conciso. Máximo 3-4 líneas en total.
    `;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "Eres un instructor experto de la Policía Nacional de Colombia. Tu misión es dar consejos tácticos y legales ultra-breves, precisos y pedagógicos sobre la Ley 1801. Si el policía falla, corrígelo con la norma exacta. Responde siempre en español.",
        temperature: 0.3,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Error in simulation:", error);
    throw error;
  }
}

