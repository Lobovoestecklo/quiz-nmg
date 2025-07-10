import { Artifact } from '@/components/create-artifact';
import {
  CopyIcon,
  DownloadIcon,
  ExcelIcon,
  RedoIcon,
  SparklesIcon,
  UndoIcon,
} from '@/components/icons';
import {
  createExcelBlob,
  downloadBlob,
  csvToExcelData,
  generateFilenameWithDate,
} from '@/lib/utils/excel-export';
import { useDownload } from '@/hooks/use-download';
import { toast } from 'sonner';
import { useState } from 'react';

type Metadata = {
  filename?: string;
  data?: string[][];
};

export const excelArtifact = new Artifact<'excel', Metadata>({
  kind: 'excel',
  description: 'Useful for creating and downloading Excel files',
  initialize: async () => {},
  onStreamPart: ({ setArtifact, setMetadata, streamPart }) => {
    if (streamPart.type === 'excel-delta') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.content as string,
        isVisible: true,
        status: 'streaming',
      }));
      if (streamPart.metadata && streamPart.metadata.filename) {
        setMetadata((prev: any) => ({
          ...prev,
          filename: streamPart.metadata.filename,
        }));
      }
    }
  },
  content: ({
    content,
    currentVersionIndex,
    isCurrentVersion,
    onSaveContent,
    status,
    metadata,
    isInline,
  }) => {
    const { downloadFile, isDownloading } = useDownload();

    // Автоматически создаем Excel данные из контента
    const excelData = metadata?.data || csvToExcelData(content || '');
    const filename =
      metadata?.filename || generateFilenameWithDate('excel_export');

    // DEBUG: выводим данные в консоль
    console.log('excelArtifact debug:', {
      excelData,
      filename,
      content,
      metadata,
    });

    const handleDownload = async () => {
      if (!excelData || excelData.length === 0) {
        toast.error('Нет данных для экспорта');
        return;
      }

      try {
        const blob = createExcelBlob(excelData);
        await downloadFile(blob, filename);
      } catch (error) {
        console.error('Error downloading Excel file:', error);
        toast.error('Ошибка при скачивании файла');
      }
    };

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <ExcelIcon size={20} />
            <h3 className="text-lg font-semibold">Excel файл</h3>
            {filename && (
              <span className="text-sm text-muted-foreground">
                ({filename})
              </span>
            )}
          </div>
          {/* Оставляем только одну кнопку 'Скачать' */}
          {!isInline && (
            <button
              onClick={handleDownload}
              disabled={isDownloading || !excelData || excelData.length === 0}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Скачать Excel файл"
            >
              <DownloadIcon size={16} />
              {isDownloading ? 'Скачивание...' : 'Скачать'}
            </button>
          )}
        </div>
        {/* Кнопка 'Развернуть' только внизу, зелёная кнопка 'Скачать' только одна сверху */}
        <div className="flex justify-end p-4">
          <button
            type="button"
            className="p-2 rounded-md bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors text-sm font-medium shadow"
            style={{ minWidth: 100 }}
            onClick={() => {
              // Логика раскрытия (развернуть Excel-документ)
              // Можно вызвать setArtifact или другой обработчик, если нужно
              // Пока просто console.log
              console.log('Развернуть Excel-документ');
            }}
          >
            Развернуть
          </button>
        </div>

        <div className="flex-1 p-4">
          {excelData && excelData.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Подготовлено {excelData.length} строк данных для экспорта в
                Excel
              </div>

              {/* Предварительный просмотр данных */}
              <div className="max-h-96 overflow-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {excelData[0]?.map((header, index) => (
                        <th
                          key={index}
                          className="px-2 py-1 text-left border-b"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {excelData.slice(1, 6).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-2 py-1 border-b">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {excelData.length > 6 && (
                      <tr>
                        <td
                          colSpan={excelData[0]?.length || 1}
                          className="px-2 py-1 text-center text-muted-foreground"
                        >
                          ... и еще {excelData.length - 6} строк
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Нет данных для экспорта
            </div>
          )}
        </div>
      </div>
    );
  },
  actions: [
    {
      icon: <DownloadIcon size={18} />,
      description: 'Скачать Excel файл',
      onClick: ({ content, metadata }) => {
        try {
          const excelData = metadata?.data || csvToExcelData(content || '');
          const filename =
            metadata?.filename || generateFilenameWithDate('excel_export');

          if (excelData && excelData.length > 0) {
            const blob = createExcelBlob(excelData);
            downloadBlob(blob, filename);
            toast.success('Excel файл скачан!');
          } else {
            toast.error('Нет данных для экспорта');
          }
        } catch (error) {
          console.error('Error downloading Excel file:', error);
          toast.error('Ошибка при скачивании файла');
        }
      },
    },
  ],
  toolbar: [
    {
      description: 'Format and clean data',
      icon: <SparklesIcon />,
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content: 'Can you please format and clean the Excel data?',
        });
      },
    },
  ],
});
