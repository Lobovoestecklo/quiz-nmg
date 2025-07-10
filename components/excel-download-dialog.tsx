'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  createExcelBlob,
  downloadBlob,
  generateFilenameWithDate,
} from '@/lib/utils/excel-export';
import { toast } from 'sonner';

interface ExcelDownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: string[][];
  defaultFilename?: string;
}

export function ExcelDownloadDialog({
  isOpen,
  onClose,
  data,
  defaultFilename,
}: ExcelDownloadDialogProps) {
  const [filename, setFilename] = useState(
    defaultFilename || generateFilenameWithDate('spreadsheet'),
  );
  const [isDownloading, setIsDownloading] = useState(false);

  // Отладочная информация
  console.log('ExcelDownloadDialog props:', { isOpen, data, defaultFilename });

  const handleDownload = async () => {
    console.log('handleDownload called with filename:', filename);
    console.log('data for export:', data);

    if (!filename.trim()) {
      toast.error('Пожалуйста, введите имя файла');
      return;
    }

    setIsDownloading(true);
    try {
      console.log('Creating Excel blob...');
      const blob = createExcelBlob(data);
      console.log('Blob created:', blob);

      console.log('Downloading blob...');
      downloadBlob(blob, filename);
      console.log('Download completed');

      toast.success('Excel файл скачан!');
      onClose();
    } catch (error) {
      console.error('Error downloading Excel file:', error);
      toast.error('Ошибка при скачивании файла');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCancel = () => {
    console.log('handleCancel called');
    setFilename(defaultFilename || generateFilenameWithDate('spreadsheet'));
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        console.log('Dialog onOpenChange:', open);
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Скачать Excel файл</DialogTitle>
          <DialogDescription>
            Введите имя файла для скачивания. Файл будет сохранен в формате
            .xlsx
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="filename" className="text-right">
              Имя файла
            </Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => {
                console.log('Filename changed:', e.target.value);
                setFilename(e.target.value);
              }}
              className="col-span-3"
              placeholder="Введите имя файла"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Отмена
          </Button>
          <Button onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? 'Скачивание...' : 'Скачать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
