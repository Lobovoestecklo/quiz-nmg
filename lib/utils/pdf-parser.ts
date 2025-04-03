import * as pdfjsLib from 'pdfjs-dist';

/**
 * Extracts text content from a given PDF file using pdfjs-dist.
 *
 * @param file The PDF file object to parse.
 * @returns A promise that resolves with the extracted text content as a string,
 *          or rejects if an error occurs during parsing.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
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