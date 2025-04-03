'use client';

import { useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

export function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Correct the filename extension to .mjs
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    console.log('PDF.js workerSrc set to:', pdfjsLib.GlobalWorkerOptions.workerSrc);
  }, []);

  return <>{children}</>;
} 