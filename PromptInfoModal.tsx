import React from 'react';

interface PromptInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PromptInfoModal: React.FC<PromptInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div
        className="bg-slate-800 text-slate-300 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Cerrar modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-white mb-4">¿Cómo funciona esta app?</h2>
        <div className="space-y-4 text-slate-400">
          <p>
            Esta aplicación te ofrece dos herramientas poderosas para trabajar con tus archivos de audio y video, usando la IA de Google Gemini.
          </p>

          <div className="p-4 bg-slate-700/50 rounded-lg">
              <h3 className="font-bold text-lg text-purple-300 mb-2">1. Divisor de Audio</h3>
              <p>
                  Esta es la herramienta recomendada para archivos largos (más de 3-4 minutos).
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4 mt-2">
                  <li>
                    <strong>Sube tu archivo:</strong> Soporta la mayoría de formatos de audio y video.
                  </li>
                  <li>
                    <strong>Convierte y Divide:</strong> La app decodifica tu archivo y lo divide en trozos de duración configurable. Cada trozo se convierte al formato <strong>WAV</strong>, que es universalmente compatible y garantiza que la IA pueda procesarlo sin errores.
                  </li>
                  <li>
                    <strong>Descarga los Trozos:</strong> Puedes descargar los archivos WAV individualmente o todos juntos en un archivo .zip.
                  </li>
              </ul>
          </div>
          
          <div className="p-4 bg-slate-700/50 rounded-lg">
              <h3 className="font-bold text-lg text-blue-300 mb-2">2. Transcriptor</h3>
               <p>
                  Esta herramienta transcribe tus archivos de audio a texto.
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4 mt-2">
                   <li>
                    <strong>Sube los trozos:</strong> Para obtener los mejores resultados, sube los archivos WAV que generaste con el "Divisor de Audio". También puedes subir directamente archivos cortos (menos de 3-4 minutos).
                  </li>
                  <li>
                    <strong>Obtén el resultado:</strong> La transcripción de todos los archivos se combinará en un solo texto, listo para que lo copies y lo uses.
                  </li>
              </ul>
          </div>

          <p className="font-semibold text-slate-300">¿Por qué este proceso?</p>
          <p>
            Las APIs de IA a veces tienen dificultades con archivos muy largos o formatos de audio comprimidos. Al convertir tus archivos a trozos en formato WAV, te aseguras la máxima compatibilidad y evitas errores internos, obteniendo transcripciones fiables en todo momento.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PromptInfoModal;
