/**
 * Extracts text content from a given PDF file using pdfjs-dist.
 *
 * @param file The PDF file object to parse.
 * @returns A promise that resolves with the extracted text content as a string,
 *          or rejects if an error occurs during parsing.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  // console.log(`[pdf-parser] Starting text extraction for: ${file.name}, size: ${file.size} bytes`);
  // Dynamically import pdfjs-dist inside the function
  const pdfjsLib = await import('pdfjs-dist');

  // Ensure the worker is configured (especially if ClientLayoutWrapper might not run first)
  // It's generally safe to set this multiple times.
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    const workerSrc = `/pdf.worker.min.mjs`;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
    // console.warn('[pdf-parser] PDF.js workerSrc was not set. Setting it now.');
  }

  const arrayBuffer = await file.arrayBuffer();
  // console.log('[pdf-parser] ArrayBuffer created.');

  // console.log('[pdf-parser] Calling getDocument...');
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  // console.log(`[pdf-parser] Document loaded. Number of pages: ${pdf.numPages}`);
  const numPages = pdf.numPages;
  let fullText = '';

  // console.log('[pdf-parser] Starting page processing loop...');
  for (let i = 1; i <= numPages; i++) {
    // console.log(`[pdf-parser] Processing page ${i}...`);
    // console.log(`[pdf-parser]   - Getting page ${i}...`);
    const page = await pdf.getPage(i);
    // console.log(`[pdf-parser]   - Page ${i} retrieved.`);
    // console.log(`[pdf-parser]   - Getting text content for page ${i}...`);
    const textContent = await page.getTextContent();
    // console.log(`[pdf-parser]   - Text content for page ${i} retrieved. Items: ${textContent.items.length}`);
    // Join text items, handling potential undefined items gracefully
    const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
    // console.log(`[pdf-parser]   - Page ${i} text processed.`);
    fullText += pageText + '\n'; // Add newline between pages
  }
  // console.log('[pdf-parser] Finished processing all pages.');

  // console.log('[pdf-parser] Returning extracted text.');
  // Replace null characters before returning
  return fullText.replace(/\x00/g, '').trim();
} 