/**
 * Extracts text content from a given PDF file using pdfjs-dist and formats it as Markdown text.
 *
 * @param file The PDF file object to parse.
 * @returns A promise that resolves with the extracted text content as a Markdown-formatted string,
 *          or rejects if an error occurs during parsing.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  // console.log(`[pdf-parser] Starting text extraction for: ${file.name}, size: ${file.size} bytes`);
  // Dynamically import pdfjs-dist inside the function
  const pdfjsLib = await import('pdfjs-dist');

  // Ensure the worker is configured (especially if ClientLayoutWrapper might not run first)
  // It's generally safe to set this multiple times.
  if (
    typeof window !== 'undefined' &&
    !pdfjsLib.GlobalWorkerOptions.workerSrc
  ) {
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

  let allText = '';

  // Extract text from all pages
  for (let i = 1; i <= numPages; i++) {
    // console.log(`[pdf-parser] Processing page ${i}...`);
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Process text content
    const pageText = processTextContent(textContent);
    allText += pageText + '\n\n';
  }

  // Convert to markdown
  const markdownText = convertToMarkdown(allText.trim());

  // Replace null characters and trim
  return markdownText.replace(/\x00/g, '').trim();
}

/**
 * Processes the text content from a PDF page to extract structured text
 */
function processTextContent(textContent: any): string {
  // Get all text items
  const items = textContent.items;

  // Sort items by vertical position first, then horizontal
  // This ensures we get text in reading order
  items.sort((a: any, b: any) => {
    if (!('transform' in a) || !('transform' in b)) return 0;

    // Compare y-coordinates (vertical position)
    // PDF coordinates start from bottom, so higher y is actually earlier in reading order
    const yDiff = b.transform[5] - a.transform[5];

    // If on the same approximate line (within tolerance)
    if (Math.abs(yDiff) < 3) {
      // Compare x-coordinates (horizontal position)
      return a.transform[4] - b.transform[4];
    }

    // Different lines, sort by vertical position
    return yDiff;
  });

  // Group items into lines based on y-coordinate
  const lines = [];
  let currentLine = [];
  let lastY = null;

  for (const item of items) {
    if (!('str' in item) || item.str.trim() === '') continue;

    const y = item.transform ? item.transform[5] : null;

    // If we can't determine position, just append
    if (y === null) {
      currentLine.push(item.str);
      continue;
    }

    // If this is the first item or it's on the same line as the last item
    if (lastY === null || Math.abs(y - lastY) < 3) {
      currentLine.push(item.str);
      lastY = y;
    } else {
      // New line
      if (currentLine.length > 0) {
        lines.push(currentLine.join(' '));
      }
      currentLine = [item.str];
      lastY = y;
    }
  }

  // Add the last line if not empty
  if (currentLine.length > 0) {
    lines.push(currentLine.join(' '));
  }

  return lines.join('\n');
}

/**
 * Converts the extracted text to proper markdown format
 */
function convertToMarkdown(text: string): string {
  // Replace page separators and page numbers
  let markdown = text.replace(/^## Page \d+$/gm, '');

  // Remove page separator lines
  markdown = markdown.replace(/^---$/gm, '');

  // Handle scene headers (numbered scenes)
  markdown = markdown.replace(/^(\d+\.\s+[A-ZА-Я][A-ZА-Я\s\-.]+)$/gm, '## $1');

  // Handle scene descriptions
  markdown = markdown.replace(/^([A-ZА-Я][A-ZА-Я\s\-.]+)$/gm, (match) => {
    // Only convert if it's likely a heading (not dialogue)
    if (match.length < 80 && !match.includes(':')) {
      return `### ${match}`;
    }
    return match;
  });

  // Format character names in dialogue
  markdown = markdown.replace(/^([A-ZА-Я]+)$/gm, '**$1**');

  // Handle parentheticals in dialogue
  markdown = markdown.replace(/^\(([^)]+)\)$/gm, '*($1)*');

  // Convert CUT or similar screenplay directions to bold
  markdown = markdown.replace(/^(CUT|FADE IN|FADE OUT|DISSOLVE)$/gm, '**$1**');

  // Handle special screenplay formatting for character directions
  markdown = markdown.replace(/^([A-ZА-Я]+)(\s+\([^)]+\))$/gm, '**$1** *$2*');

  // Clean up multiple blank lines
  markdown = markdown.replace(/\n{3,}/g, '\n\n');

  // Restore structure for the screenplay format
  // Look for character name followed by dialogue
  markdown = markdown.replace(
    /\*\*([A-ZА-Я]+)\*\*\n+([^*\n][^\n]+)/gm,
    '**$1**\n\n$2',
  );

  // Remove extra whitespace
  markdown = markdown.trim();

  return markdown;
}

/**
 * Extracts text content from a given PDF file using pdfjs-dist.
 *
 * @param file The PDF file object to parse.
 * @returns A promise that resolves with the extracted text content as a string,
 *          or rejects if an error occurs during parsing.
 */
export async function extractTextFromPdfLegacy(file: File): Promise<string> {
  // console.log(`[pdf-parser] Starting text extraction for: ${file.name}, size: ${file.size} bytes`);
  // Dynamically import pdfjs-dist inside the function
  const pdfjsLib = await import('pdfjs-dist');

  // Ensure the worker is configured (especially if ClientLayoutWrapper might not run first)
  // It's generally safe to set this multiple times.
  if (
    typeof window !== 'undefined' &&
    !pdfjsLib.GlobalWorkerOptions.workerSrc
  ) {
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
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    // console.log(`[pdf-parser]   - Page ${i} text processed.`);
    fullText += pageText + '\n'; // Add newline between pages
  }
  // console.log('[pdf-parser] Finished processing all pages.');

  // console.log('[pdf-parser] Returning extracted text.');
  // Replace null characters before returning
  return fullText.replace(/\x00/g, '').trim();
}
