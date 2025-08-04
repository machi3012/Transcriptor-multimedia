import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Helper to convert a file or blob to a base64 string
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      // The result is in the format "data:mime/type;base64,the-base64-string".
      // We only need the base64 part.
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  if (!process.env.API_KEY) {
    console.error("API key for Gemini is not configured.");
    throw new Error("La clave API no está configurada. Asegúrate de que la variable de entorno API_KEY esté disponible.");
  }
  
  if (!audioBlob.type) {
    throw new Error("No se pudo determinar el tipo de archivo. Por favor, selecciona un archivo de audio o video válido.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const audioBase64 = await blobToBase64(audioBlob);
    
    // The data to be processed by the model.
    const audioPart = {
      inlineData: {
        mimeType: audioBlob.type,
        data: audioBase64,
      },
    };

    // The core instruction for the model, defining its role.
    // This is more robust than sending instructions with every chunk.
    const systemInstruction = "Tu única tarea es transcribir audio a texto en español. Debes devolver únicamente el texto transcrito, sin ningún comentario, saludo o texto adicional. El audio puede venir en trozos; procesa cada uno y devuelve solo el texto correspondiente. Si un trozo es silencio, devuelve una cadena vacía.";

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        // System instruction sets the model's behavior for the request.
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.2, // Lower temperature for more deterministic and accurate transcriptions.
        },
        // The contents now only contain the data to be processed, which is cleaner.
        contents: [{ parts: [audioPart] }],
    });
    
    const transcription = response.text;
    if (!transcription || transcription.trim() === '') {
      // This is not an error for a chunk, it could be a silent part.
      return "";
    }
    
    return transcription;

  } catch (error) {
    console.error("Error during transcription API call:", error);
    
    let userMessage = "Ocurrió un error desconocido durante la transcripción.";
    
    // The API error can be a direct object or a JSON string in the message property.
    // Let's create a unified way to inspect it.
    let apiErrorDetail: { code?: any, status?: string, message?: string } | null = null;
    
    if (error && typeof error === 'object') {
        if ('error' in error && typeof (error as any).error === 'object' && (error as any).error !== null) {
            // Case 1: The error object has a nested 'error' property. e.g. { error: { ... } }
            apiErrorDetail = (error as any).error;
        } else if ('message' in error && typeof (error as any).message === 'string') {
            // Case 2: The error's message is a JSON string. e.g. new Error('{ "error": { ... } }')
            try {
                const parsed = JSON.parse((error as any).message);
                if (parsed && parsed.error) {
                    apiErrorDetail = parsed.error;
                }
            } catch (e) {
                // Not a JSON string, will be handled by the fallback logic below.
            }
        }
    }

    if (apiErrorDetail) {
        // Specific handling for quota errors (429 / RESOURCE_EXHAUSTED)
        if (apiErrorDetail.code === 429 || apiErrorDetail.status === 'RESOURCE_EXHAUSTED') {
            const detailMessage = (apiErrorDetail.message || '').toLowerCase();
            // Provide a specific message for daily quota limits, which is a hard stop.
            if (detailMessage.includes('daily')) {
                userMessage = "Se ha alcanzado el límite de cuota diario. La API de Gemini tiene un límite de solicitudes por día. Por favor, intente de nuevo mañana o revise su plan de facturación de Google para aumentar su capacidad.";
            } else {
                // General message for other rate limits (e.g., per minute).
                userMessage = "Se ha excedido la cuota de solicitudes por minuto. Por favor, espere un momento y vuelva a intentarlo.";
            }
        } else if (apiErrorDetail.message) {
            userMessage = `Error de la API [${apiErrorDetail.status || 'Desconocido'}]: ${apiErrorDetail.message}`;
        }
    } else if (error && typeof error === 'object' && 'message' in error) {
        // Fallback for network errors or other non-API errors with a simple message string.
        const errorMessage = (error as Error).message;
        if (errorMessage.includes("500") || errorMessage.includes("INTERNAL")) {
            userMessage = "El servicio de IA encontró un error interno. Esto puede ser un problema temporal al procesar una parte del archivo. Por favor, intenta de nuevo.";
        } else if (errorMessage.includes("400") || errorMessage.includes("BAD_REQUEST")) {
            userMessage = "La solicitud fue mal formada. Esto puede ocurrir si una parte del archivo está dañada o el formato no es compatible.";
        } else if (errorMessage.includes("API key not valid")) {
            userMessage = "La clave API no es válida. Por favor, verifica la configuración."
        } else {
            // Use the raw message if no other pattern matches.
            userMessage = `Error: ${errorMessage}`;
        }
    }
    
    throw new Error(userMessage);
  }
};