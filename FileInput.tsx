import React, { useState, useCallback, DragEvent } from 'react';

interface FileInputProps {
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (file: File) => void;
  onClearAll: () => void;
  selectedFiles: File[];
}

const FileInput: React.FC<FileInputProps> = ({ onFilesAdd, onFileRemove, onClearAll, selectedFiles }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onFilesAdd(Array.from(event.target.files));
      // Reset the input value to allow selecting the same file again after removing it
      event.target.value = '';
    }
  };

  const handleDragEnter = useCallback((e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesAdd(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  }, [onFilesAdd]);

  return (
    <div className="w-full space-y-4">
      <label
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        htmlFor="file-upload"
        className={`flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          isDragging ? 'border-blue-500 bg-slate-700' : 'border-slate-600 bg-slate-800 hover:bg-slate-700'
        }`}
      >
        <div className="flex flex-col items-center justify-center">
          <svg className="w-8 h-8 mb-4 text-slate-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
          </svg>
          <p className="mb-2 text-sm text-slate-400"><span className="font-semibold text-blue-400">Haz clic para subir</span> o arrastra y suelta</p>
          <p className="text-xs text-slate-500">Soporta archivos de audio y video</p>
        </div>
        <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} multiple />
      </label>

      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-semibold text-slate-300">Archivos en cola ({selectedFiles.length})</h4>
            <button
                onClick={onClearAll}
                className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
            >
                Quitar Todos
            </button>
          </div>
          <div className="w-full max-h-48 overflow-y-auto space-y-2 pr-2">
            {selectedFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="bg-slate-700/50 p-2 rounded-md flex items-center justify-between text-sm">
                <span className="text-slate-300 truncate w-4/5">{file.name}</span>
                <button
                  onClick={() => onFileRemove(file)}
                  className="text-slate-400 hover:text-red-400 p-1 rounded-full transition-colors"
                  aria-label={`Quitar ${file.name}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileInput;