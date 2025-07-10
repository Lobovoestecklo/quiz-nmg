import { useState } from 'react';
import { toast } from 'sonner';
import {
  downloadBlobAdvanced,
  generateFilenameWithDate,
} from '@/lib/utils/excel-export';

interface UseDownloadOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
}

export function useDownload(options: UseDownloadOptions = {}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadFile = async (
    blob: Blob,
    filename?: string,
    customOptions?: UseDownloadOptions,
  ) => {
    const finalOptions = { ...options, ...customOptions };
    const finalFilename = filename || generateFilenameWithDate('download');

    setIsDownloading(true);

    try {
      await downloadBlobAdvanced(blob, finalFilename);

      if (finalOptions.showToast !== false) {
        toast.success('Файл успешно скачан!');
      }

      finalOptions.onSuccess?.();
    } catch (error) {
      console.error('Ошибка при скачивании файла:', error);

      if (finalOptions.showToast !== false) {
        toast.error('Ошибка при скачивании файла');
      }

      finalOptions.onError?.(error as Error);
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    downloadFile,
    isDownloading,
  };
}
