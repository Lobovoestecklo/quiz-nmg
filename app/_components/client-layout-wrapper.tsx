'use client';

import { useEffect } from 'react';

export function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Dynamically import pdfjs-dist only on the client
    import('pdfjs-dist').then(pdfjsLib => {
      // Check if running in a browser environment where window exists
      if (typeof window !== 'undefined') {
        // Construct the worker URL relative to the public directory
        const workerSrc = `/pdf.worker.min.mjs`;
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
        console.log(`PDF.js workerSrc set to: ${workerSrc}`); // Debug log
      }
    }).catch(error => {
        console.error("Failed to load pdfjs-dist dynamically:", error);
    });
  }, []); // Empty dependency array ensures this runs only once on mount

  return <>{children}</>;
} 