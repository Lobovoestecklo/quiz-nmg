declare module 'pdfjs-dist/build/pdf.mjs' {
  export const GlobalWorkerOptions: {
    workerSrc: string;
  };
}

declare module 'pdfjs-dist/build/pdf.min.mjs' {
  export default {
    GlobalWorkerOptions: {
      workerSrc: string,
    }
  };
}

declare module 'pdfjs-dist/legacy/build/pdf.min.mjs' {
  export default {
    GlobalWorkerOptions: {
      workerSrc: string,
    }
  };
} 