/**
 * Splits a File object into smaller chunks of a specified size.
 * If the file is smaller than the chunk size, it returns an array with the original file as the single element.
 * @param file The file to split.
 * @param chunkSizeInBytes The maximum size of each chunk in bytes.
 * @returns An array of Blob objects, each representing a chunk of the original file.
 */
export const splitAudioFile = (file: File, chunkSizeInBytes: number): Blob[] => {
  // If the file is smaller than or equal to the chunk size, return it as a single-element array.
  if (file.size <= chunkSizeInBytes) {
    return [file];
  }

  const chunks: Blob[] = [];
  let start = 0;

  while (start < file.size) {
    const end = Math.min(start + chunkSizeInBytes, file.size);
    // Create a new Blob from the file slice, preserving the MIME type.
    const chunk = file.slice(start, end, file.type);
    chunks.push(chunk);
    start = end;
  }

  return chunks;
};
