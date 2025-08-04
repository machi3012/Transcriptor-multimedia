import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { TranscriptionStatus } from './types';
import { transcribeAudio } from './services/geminiService';
import { processAndSplitAudio } from './utils/audioUtils';
import FileInput from './components/FileInput';
import Spinner from './components/Spinner';
import Alert from './components/Alert';
import TranscriptionOutput from './components/TranscriptionOutput';
import PromptInfoModal from './components/PromptInfoModal';

type Tool = 'transcriber' | 'splitter';

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool>('transcriber');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  
  // Transcriber state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<TranscriptionStatus>(TranscriptionStatus.IDLE);
  const [transcription, setTranscription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);

  // Splitter state
  const [splitterFile, setSplitterFile] = useState<File | null>(null);
  const [splitChunks, setSplitChunks] = useState<{name: string, blob: Blob}[]>([]);
  const [isSplitting, setIsSplitting] = useState<boolean>(false);
  const [splittingMessage, setSplittingMessage] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [splitterError, setSplitterError] = useState<string | null>(null);
  const [chunkDuration, setChunkDuration] = useState<number>(180); // 3 minutes default

  const handleReset = useCallback(() => {
    // Reset both tools
    setSelectedFiles([]);
    setTranscription('');
    setError(null);
    setProcessingMessage(null);
    setStatus(TranscriptionStatus.IDLE);
    setSplitterFile(null);
    setSplitChunks([]);
    setSplitterError(null);
    setIsSplitting(false);
    setSplittingMessage(null);
    setIsZipping(false);
  }, []);
  
  const handleToolChange = (tool: Tool) => {
    handleReset();
    setActiveTool(tool);
  };

  // --- Transcriber Logic ---
  const handleFilesAdd = useCallback((newFiles: File[]) => {
    setSelectedFiles(prevFiles => {
      const existingFileNames = new Set(prevFiles.map(f => f.name));
      const uniqueNewFiles = newFiles.filter(f => !existingFileNames.has(f.name));
      return [...prevFiles, ...uniqueNewFiles];
    });
    setStatus(TranscriptionStatus.IDLE);
    setError(null);
  }, []);

  const handleRemoveFile = useCallback((fileToRemove: File) => {
    setSelectedFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
  }, []);

  const handleClearAllFiles = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  const handleTranscription = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setStatus(TranscriptionStatus.PROCESSING);
    setError(null);
    setTranscription('');
    
    try {
        const allFileTranscriptions: string[] = [];
        const totalFiles = selectedFiles.length;

        for (let i = 0; i < totalFiles; i++) {
            const file = selectedFiles[i];
            setProcessingMessage(`Transcribiendo archivo ${i + 1}/${totalFiles}: ${file.name}`);
            const result = await transcribeAudio(file);
            
            if (result) {
                allFileTranscriptions.push(result);
            }

            // To prevent hitting API rate limits, add a small delay between requests.
            // No delay needed after the last file.
            if (i < totalFiles - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay
            }
        }

        setTranscription(allFileTranscriptions.join('\n\n---\n\n'));
        setStatus(TranscriptionStatus.SUCCESS);
    } catch (err: any) {
        setError(err.message || 'Ocurrió un error inesperado durante la transcripción.');
        setStatus(TranscriptionStatus.ERROR);
    } finally {
        setProcessingMessage(null);
    }
  }, [selectedFiles]);

  // --- Splitter Logic ---
  const handleSplitterFileAdd = useCallback((files: File[]) => {
      if (files.length > 0) {
          setSplitterFile(files[0]);
          setSplitChunks([]);
          setSplitterError(null);
      }
  }, []);

  const handleSplitterFileRemove = useCallback(() => {
      setSplitterFile(null);
      setSplitChunks([]);
      setSplitterError(null);
  }, []);

  const handleSplit = async () => {
      if (!splitterFile) return;
      setIsSplitting(true);
      setSplitterError(null);
      setSplitChunks([]);
      setSplittingMessage('Iniciando división...');
      try {
          const chunks = await processAndSplitAudio(
            splitterFile,
            chunkDuration,
            (message: string) => {
              setSplittingMessage(message);
            }
          );
          setSplitChunks(chunks);
      } catch (err) {
          console.error(err);
          setSplitterError('No se pudo procesar el archivo. Asegúrate de que es un formato de audio o video estándar y no está corrupto.');
      } finally {
          setIsSplitting(false);
          setSplittingMessage(null);
      }
  };

  const handleDownloadChunk = (chunk: { name: string; blob: Blob }) => {
    const url = URL.createObjectURL(chunk.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = chunk.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllChunks = async () => {
    if (splitChunks.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      splitChunks.forEach(chunk => {
        zip.file(chunk.name, chunk.blob);
      });
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${splitterFile?.name.split('.')[0] || 'trozos'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setSplitterError('Error al crear el archivo ZIP.');
    } finally {
      setIsZipping(false);
    }
  };

  const renderTranscriber = () => {
    switch (status) {
      case TranscriptionStatus.PROCESSING:
        return (
          <div className="flex flex-col items-center justify-center text-center p-8">
            <Spinner className="-ml-1 mr-3 h-10 w-10 text-blue-500" />
            <p className="mt-4 text-lg text-slate-300">{processingMessage || 'Procesando...'}</p>
            <p className="text-sm text-slate-400">Esto puede tardar unos momentos.</p>
          </div>
        );
      case TranscriptionStatus.SUCCESS:
        return (
          <div className="w-full flex flex-col items-center gap-6">
            <TranscriptionOutput text={transcription} />
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500"
            >
              Volver
            </button>
          </div>
        );
      case TranscriptionStatus.ERROR:
        return (
          <div className="w-full flex flex-col items-center gap-6">
            <Alert message={error!} />
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500"
            >
              Intentar de Nuevo
            </button>
          </div>
        );
      case TranscriptionStatus.IDLE:
      default:
        return (
          <div className="w-full max-w-md bg-slate-800 rounded-xl shadow-2xl p-8 space-y-6">
             <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Transcribir Archivos</h2>
              <p className="text-slate-400 mt-2">Sube uno o varios archivos de audio/video para obtener su transcripción.</p>
            </div>
            <FileInput 
              onFilesAdd={handleFilesAdd}
              onFileRemove={handleRemoveFile}
              onClearAll={handleClearAllFiles}
              selectedFiles={selectedFiles}
            />
            <button
              onClick={handleTranscription}
              disabled={selectedFiles.length === 0}
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span>Transcribir {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}</span>
            </button>
          </div>
        );
    }
  };

  const renderSplitter = () => (
    <div className="w-full max-w-md bg-slate-800 rounded-xl shadow-2xl p-8 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">Divisor de Audio</h2>
        <p className="text-slate-400 mt-2">Divide archivos grandes en trozos WAV compatibles.</p>
      </div>

      {!splitterFile && (
        <FileInput 
          onFilesAdd={handleSplitterFileAdd}
          onFileRemove={() => {}}
          onClearAll={handleSplitterFileRemove}
          selectedFiles={[]}
        />
      )}

      {splitterFile && !isSplitting && splitChunks.length === 0 && (
          <div className="space-y-4">
              <div className="bg-slate-700/50 p-3 rounded-md flex items-center justify-between text-sm">
                <span className="text-slate-300 truncate w-4/5">{splitterFile.name}</span>
                <button
                  onClick={handleSplitterFileRemove}
                  className="text-slate-400 hover:text-red-400 p-1 rounded-full transition-colors"
                  aria-label={`Quitar ${splitterFile.name}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
              </div>
              <div>
                  <label htmlFor="chunk-duration" className="block text-sm font-medium text-slate-300 mb-2">
                      Duración del trozo (segundos)
                  </label>
                  <input
                      type="number"
                      id="chunk-duration"
                      value={chunkDuration}
                      onChange={(e) => setChunkDuration(Number(e.target.value))}
                      className="block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="10"
                      max="600"
                  />
              </div>
              <button
                  onClick={handleSplit}
                  className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                  Dividir Archivo
              </button>
          </div>
      )}

      {isSplitting && (
          <div className="flex flex-col items-center justify-center text-center p-8">
              <Spinner className="-ml-1 mr-3 h-10 w-10 text-purple-500" />
              <p className="mt-4 text-lg text-slate-300">{splittingMessage || 'Dividiendo archivo...'}</p>
              <p className="text-sm text-slate-400">La página permanecerá interactiva durante el proceso.</p>
          </div>
      )}
      
      {splitterError && (
          <div className="w-full flex flex-col items-center gap-4">
              <Alert message={splitterError} />
              <button
                  onClick={handleSplitterFileRemove}
                  className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
              >
                  Intentar con otro archivo
              </button>
          </div>
      )}

      {splitChunks.length > 0 && (
          <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Trozos Generados ({splitChunks.length})</h3>
              <div className="w-full max-h-60 overflow-y-auto space-y-2 pr-2">
                  {splitChunks.map((chunk) => (
                      <div key={chunk.name} className="bg-slate-700/50 p-2 rounded-md flex items-center justify-between text-sm">
                          <span className="text-slate-300 truncate w-3/5">{chunk.name}</span>
                          <button
                              onClick={() => handleDownloadChunk(chunk)}
                              className="text-xs bg-slate-600 hover:bg-slate-500 text-white font-medium py-1 px-2 rounded-md transition-colors"
                          >
                              Descargar
                          </button>
                      </div>
                  ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                  <button
                      onClick={handleDownloadAllChunks}
                      disabled={isZipping}
                      className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-slate-700 disabled:cursor-wait flex items-center justify-center gap-2"
                  >
                      {isZipping ? <Spinner className="h-5 w-5" /> : 'Descargar Todo (.zip)'}
                  </button>
                  <button
                      onClick={handleSplitterFileRemove}
                      className="w-full sm:w-auto px-4 py-3 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors"
                  >
                      Empezar de Nuevo
                  </button>
              </div>
          </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 font-sans relative">
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="text-slate-400 hover:text-blue-400 transition-colors"
          aria-label="Mostrar información"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      <main className="w-full flex flex-col items-center justify-center flex-grow">
        <div className="mb-8 text-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white">Transcriptor Multimedia <span className="text-blue-400">IA</span></h1>
            <p className="mt-2 text-lg text-slate-400">Potenciado por Google Gemini</p>
        </div>

        <div className="w-full max-w-md mb-6">
            <div className="flex p-1 bg-slate-700/80 rounded-lg">
                <button
                    onClick={() => handleToolChange('transcriber')}
                    className={`w-1/2 py-2.5 text-sm font-medium leading-5 rounded-md transition-colors focus:outline-none ${
                        activeTool === 'transcriber' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-white/[0.12] hover:text-white'
                    }`}
                >
                    Transcriptor
                </button>
                <button
                    onClick={() => handleToolChange('splitter')}
                    className={`w-1/2 py-2.5 text-sm font-medium leading-5 rounded-md transition-colors focus:outline-none ${
                        activeTool === 'splitter' ? 'bg-purple-600 text-white shadow' : 'text-slate-300 hover:bg-white/[0.12] hover:text-white'
                    }`}
                >
                    Divisor de Audio
                </button>
            </div>
        </div>

        {activeTool === 'transcriber' ? renderTranscriber() : renderSplitter()}
      </main>
      
      <PromptInfoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default App;