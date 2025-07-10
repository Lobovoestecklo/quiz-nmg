import { myProvider } from '@/lib/ai/providers';
import { excelPrompt, updateDocumentPrompt } from '@/lib/ai/prompts';
import { createDocumentHandler } from '@/lib/artifacts/server';
import { streamObject } from 'ai';
import { z } from 'zod';

function generateExcelFilename(title: string) {
  const date = new Date().toISOString().slice(0, 10);
  const safeTitle = title
    .replace(/[^a-zA-Zа-яА-Я0-9_\- ]/g, '')
    .replace(/\s+/g, '_');
  return `${safeTitle || 'Тест'}_${date}.xlsx`;
}

export const excelDocumentHandler = createDocumentHandler<'excel'>({
  kind: 'excel',
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = '';

    const { fullStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: excelPrompt,
      prompt: title,
      schema: z.object({
        csv: z.string().describe('CSV data'),
      }),
    });

    let filename = generateExcelFilename(title);

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { csv } = object;

        if (csv) {
          dataStream.writeData({
            type: 'excel-delta',
            content: csv,
            metadata: { filename },
          });
          draftContent = csv;
        }
      }
    }

    dataStream.writeData({
      type: 'excel-delta',
      content: draftContent,
      metadata: { filename },
    });

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = '';
    const filename = generateExcelFilename(document.title);

    const { fullStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: updateDocumentPrompt(document.content, 'excel'),
      prompt: description,
      schema: z.object({
        csv: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { csv } = object;

        if (csv) {
          dataStream.writeData({
            type: 'excel-delta',
            content: csv,
            metadata: { filename },
          });
          draftContent = csv;
        }
      }
    }

    return draftContent;
  },
});
