import { Artifact } from '@/components/create-artifact';
import {
  CopyIcon,
  LineChartIcon,
  RedoIcon,
  SparklesIcon,
  UndoIcon,
  ExcelIcon,
} from '@/components/icons';
import { SpreadsheetEditor } from '@/components/sheet-editor';
import { parse, unparse } from 'papaparse';
import { toast } from 'sonner';
import {
  csvToExcelData,
  generateFilenameWithDate,
} from '@/lib/utils/excel-export';
import { ExcelDownloadDialog } from '@/components/excel-download-dialog';
import { useState } from 'react';

type Metadata = any;

export const sheetArtifact = new Artifact<'sheet', Metadata>({
  kind: 'sheet',
  description: 'Useful for working with spreadsheets',
  initialize: async () => {},
  onStreamPart: ({ setArtifact, streamPart }) => {
    if (streamPart.type === 'sheet-delta') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.content as string,
        isVisible: true,
        status: 'streaming',
      }));
    }
  },
  content: ({
    content,
    currentVersionIndex,
    isCurrentVersion,
    onSaveContent,
    status,
  }) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [excelData, setExcelData] = useState<string[][]>([]);

    const handleExcelExport = () => {
      console.log('handleExcelExport called');
      console.log('content:', content);

      try {
        // Конвертируем CSV в данные для Excel
        const data = csvToExcelData(content);
        console.log('Excel data prepared:', data);

        setExcelData(data);
        setIsDialogOpen(true);
        console.log('Dialog should open now');
      } catch (error) {
        console.error('Error preparing Excel export:', error);
        toast.error('Ошибка при подготовке экспорта в Excel');
      }
    };

    console.log('SheetArtifact content render:', {
      isDialogOpen,
      excelDataLength: excelData.length,
      contentLength: content?.length,
    });

    return (
      <>
        <SpreadsheetEditor
          content={content}
          currentVersionIndex={currentVersionIndex}
          isCurrentVersion={isCurrentVersion}
          saveContent={onSaveContent}
          status={status}
          onExcelExport={handleExcelExport}
        />
        <ExcelDownloadDialog
          isOpen={isDialogOpen}
          onClose={() => {
            console.log('Dialog closing');
            setIsDialogOpen(false);
          }}
          data={excelData}
          defaultFilename={generateFilenameWithDate('spreadsheet')}
        />
      </>
    );
  },
  actions: [
    {
      icon: <UndoIcon size={18} />,
      description: 'View Previous version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('prev');
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: 'View Next version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('next');
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <CopyIcon />,
      description: 'Copy as .csv',
      onClick: ({ content }) => {
        const parsed = parse<string[]>(content, { skipEmptyLines: true });

        const nonEmptyRows = parsed.data.filter((row) =>
          row.some((cell) => cell.trim() !== ''),
        );

        const cleanedCsv = unparse(nonEmptyRows);

        navigator.clipboard.writeText(cleanedCsv);
        toast.success('CSV скопировано!');
      },
    },
    {
      icon: <ExcelIcon />,
      description: 'Export as Excel',
      onClick: ({ content }) => {
        console.log('Excel action clicked');
        try {
          // Конвертируем CSV в данные для Excel
          const excelData = csvToExcelData(content);
          console.log('Excel data from action:', excelData);

          // Открываем диалог для выбора имени файла
          // Диалог будет открыт через компонент content
          // Здесь мы просто показываем уведомление
          toast.info('Нажмите кнопку Excel в редакторе для скачивания');
        } catch (error) {
          console.error('Error exporting to Excel:', error);
          toast.error('Ошибка при экспорте в Excel');
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
          content: 'Can you please format and clean the data?',
        });
      },
    },
    {
      description: 'Analyze and visualize data',
      icon: <LineChartIcon />,
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content:
            'Can you please analyze and visualize the data by creating a new sheet artifact?',
        });
      },
    },
  ],
});
