export const isProductionEnvironment = process.env.NODE_ENV === 'production';

export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT,
);

// PDF
export const PDF_MIME_TYPE = 'application/pdf';
export const PDF_EXTENSION = '.pdf';

// DOCX
export const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const DOCX_EXTENSION = '.docx';

// DOC
export const DOC_MIME_TYPE = 'application/msword';
export const DOC_EXTENSION = '.doc';

// PPTX
export const PPTX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';
export const PPTX_EXTENSION = '.pptx';

// TXT
export const TXT_MIME_TYPE = 'text/plain';
export const TXT_EXTENSION = '.txt';

// Supported document formats
export const SUPPORTED_DOCUMENT_TYPES = [
  PDF_MIME_TYPE,
  DOCX_MIME_TYPE,
  DOC_MIME_TYPE,
  PPTX_MIME_TYPE,
  TXT_MIME_TYPE,
];

export const SUPPORTED_DOCUMENT_EXTENSIONS = [
  PDF_EXTENSION,
  DOCX_EXTENSION,
  DOC_EXTENSION,
  PPTX_EXTENSION,
  TXT_EXTENSION,
];

export const CHUNKS_SAVE_INTERVAL = 1000;
