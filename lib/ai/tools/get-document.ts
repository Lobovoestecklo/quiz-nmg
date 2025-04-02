import { DataStreamWriter, tool } from 'ai';
import { Session } from 'next-auth';
import { z } from 'zod';
import { getDocumentById } from '@/lib/db/queries';

interface GetDocumentProps {
  session: Session;
  dataStream: DataStreamWriter;
}

export const getDocument = ({ session }: GetDocumentProps) =>
  tool({
    description: 'Get a document by ID to analyze its content.',
    parameters: z.object({
      id: z.string().describe('The ID of the document to retrieve'),
    }),
    execute: async ({ id }) => {
      const document = await getDocumentById({ id });

      if (!document) {
        return {
          error: 'Document not found',
        };
      }

      // Check if user has access to this document
      if (document.userId !== session.user?.id) {
        return {
          error: 'Unauthorized access to document',
        };
      }

      return document.content;

      // return {
      //   id,
      //   title: document.title,
      //   kind: document.kind,
      //   content: document.content,
      //   message: 'Document retrieved successfully',
      // };
    },
  });
