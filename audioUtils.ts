// This file contains utility functions for processing audio using the Web Audio API.

/**
 * Converts an AudioBuffer to a WAV file (Blob).
 * This function is robust and handles mono/stereo correctly by building the WAV header precisely.
 * @param buffer The AudioBuffer to convert.
 * @returns A Blob representing the WAV file.
 */
const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const numSamples = buffer.length;
  const dataSize = numSamples * numChannels * (bitDepth / 8);
  const blockAlign = numChannels * (bitDepth / 8);
  const byteRate = sampleRate * blockAlign;
  
  const headerSize = 44;
  const bufferSize = headerSize + dataSize;
  
  const wavBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(wavBuffer);
  
  // Helper function to write strings to the DataView
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // file-size - 8
  writeString(8, 'WAVE');
  
  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // subchunk1 size (16 for PCM)
  view.setUint16(20, format, true); // audio format 1
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  
  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write the PCM data
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = buffer.getChannelData(channel)[i];
      // Clamp the sample to the range [-1, 1]
      const clampedSample = Math.max(-1, Math.min(1, sample));
      // Convert to 16-bit integer
      const intSample = clampedSample < 0 ? clampedSample * 0x8000 : clampedSample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
};


/**
 * Decodes an audio/video file, splits it into chunks of a specified duration,
 * and encodes each chunk as a WAV file. This process is non-blocking to prevent UI freezing.
 * @param file The audio/video file to process.
 * @param chunkDurationInSeconds The desired duration of each chunk in seconds.
 * @param onProgress A callback to report progress messages to the UI.
 * @returns A promise that resolves to an array of objects, each containing the chunk name and its Blob.
 */
export const processAndSplitAudio = async (
  file: File,
  chunkDurationInSeconds: number,
  onProgress: (message: string) => void
): Promise<{ name: string; blob: Blob }[]> => {
  onProgress('Decodificando el archivo...');
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await file.arrayBuffer();
  
  const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  const sampleRate = decodedBuffer.sampleRate;
  const numberOfChannels = decodedBuffer.numberOfChannels;
  const totalDuration = decodedBuffer.duration;
  
  const chunks: { name: string; blob: Blob }[] = [];
  const totalChunks = Math.ceil(totalDuration / chunkDurationInSeconds);

  for (let i = 0; i < totalChunks; i++) {
    const chunkNumber = i + 1;
    onProgress(`Procesando trozo ${chunkNumber} de ${totalChunks}...`);

    // Yield to the main thread before processing the chunk to allow UI updates.
    // This is the key to preventing the page from freezing.
    await new Promise(resolve => setTimeout(resolve, 0));

    const startTime = i * chunkDurationInSeconds;
    const endTime = Math.min(startTime + chunkDurationInSeconds, totalDuration);
    
    if (endTime <= startTime) continue;

    const startOffset = Math.floor(startTime * sampleRate);
    const endOffset = Math.floor(endTime * sampleRate);
    const frameCount = endOffset - startOffset;
    
    if (frameCount <= 0) continue;
    
    // Create a new AudioBuffer for the chunk
    const chunkBuffer = audioContext.createBuffer(
      numberOfChannels,
      frameCount,
      sampleRate
    );
    
    // Copy data for each channel
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = decodedBuffer.getChannelData(channel);
      const chunkChannelData = chunkBuffer.getChannelData(channel);
      chunkChannelData.set(channelData.subarray(startOffset, endOffset));
    }
    
    // Convert the chunk buffer to a WAV Blob using the robust function
    const wavBlob = audioBufferToWav(chunkBuffer);
    
    const originalFileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    
    chunks.push({
      name: `${originalFileName}_parte_${String(chunkNumber).padStart(2, '0')}.wav`,
      blob: wavBlob,
    });
  }
  
  await audioContext.close();
  return chunks;
};