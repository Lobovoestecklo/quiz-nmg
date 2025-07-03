import { extractTextFromPdf } from './pdf-parser';

/**
 * Extracts text content from various document formats
 * @param file The file object to parse
 * @returns A promise that resolves with the extracted text content
 */
export async function extractTextFromDocument(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  const fileType = file.type;

  // PDF files
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return extractTextFromPdf(file);
  }

  // DOCX files
  if (
    fileType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    return extractTextFromDocx(file);
  }

  // DOC files
  if (fileType === 'application/msword' || fileName.endsWith('.doc')) {
    return extractTextFromDoc(file);
  }

  // TXT files
  if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    return extractTextFromTxt(file);
  }

  throw new Error(`Unsupported file format: ${fileType} (${fileName})`);
}

/**
 * Extracts text content from a DOCX file using mammoth
 * @param file The DOCX file object to parse
 * @returns A promise that resolves with the extracted text content
 */
async function extractTextFromDocx(file: File): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();

    const result = await mammoth.extractRawText({ arrayBuffer });

    if (result.messages.length > 0) {
      console.warn('DOCX parsing warnings:', result.messages);
    }

    return result.value || '';
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error(
      `Failed to extract text from DOCX file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Extracts text content from a DOC file using mammoth
 * @param file The DOC file object to parse
 * @returns A promise that resolves with the extracted text content
 */
async function extractTextFromDoc(file: File): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();

    const result = await mammoth.extractRawText({ arrayBuffer });

    if (result.messages.length > 0) {
      console.warn('DOC parsing warnings:', result.messages);
    }

    return result.value || '';
  } catch (error) {
    console.error('DOC parsing error:', error);
    throw new Error(
      `Failed to extract text from DOC file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Extracts text content from a TXT file
 * @param file The TXT file object to parse
 * @returns A promise that resolves with the extracted text content
 */
async function extractTextFromTxt(file: File): Promise<string> {
  try {
    const text = await file.text();
    return text || '';
  } catch (error) {
    console.error('TXT parsing error:', error);
    throw new Error(
      `Failed to extract text from TXT file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Validates if a file is a supported document format
 * @param file The file to validate
 * @returns True if the file format is supported
 */
export function isSupportedDocumentFormat(file: File): boolean {
  const fileName = file.name.toLowerCase();
  const fileType = file.type;

  // Check by MIME type
  const supportedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
  ];

  if (supportedMimeTypes.includes(fileType)) {
    return true;
  }

  // Check by file extension
  const supportedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
  return supportedExtensions.some((ext) => fileName.endsWith(ext));
}

/**
 * Gets the file type description for display purposes
 * @param file The file to get description for
 * @returns A human-readable description of the file type
 */
export function getFileTypeDescription(file: File): string {
  const fileName = file.name.toLowerCase();
  const fileType = file.type;

  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return 'PDF документ';
  }
  if (
    fileType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    return 'DOCX документ';
  }
  if (fileType === 'application/msword' || fileName.endsWith('.doc')) {
    return 'DOC документ';
  }
  if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    return 'Текстовый файл';
  }

  return 'Неизвестный формат';
}
