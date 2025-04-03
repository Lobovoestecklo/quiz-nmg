/**
 * Extracts text content from a given PDF file using pdfjs-dist.
 *
 * @param file The PDF file object to parse.
 * @returns A promise that resolves with the extracted text content as a string,
 *          or rejects if an error occurs during parsing.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  // Dynamically import pdfjs-dist inside the function
  const pdfjsLib = await import('pdfjs-dist');

  // Ensure the worker is configured (especially if ClientLayoutWrapper might not run first)
  // It's generally safe to set this multiple times.
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    const workerSrc = `/pdf.worker.min.mjs`;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
    console.warn('PDF.js workerSrc was not set. Setting it now from pdf-parser.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  let fullText = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    // Join text items, handling potential undefined items gracefully
    const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
    fullText += pageText + '\n'; // Add newline between pages
  }

  return fullText.trim();
} 