import { auth } from '@/app/(auth)/auth';
import { ArtifactKind } from '@/components/artifact';
import {
  deleteDocumentsByIdAfterTimestamp,
  getDocumentsById,
  saveDocument,
  saveMessages,
} from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const documents = await getDocumentsById({ id });

  const [document] = documents;

  if (!document) {
    return new Response('Not Found', { status: 404 });
  }

  if (document.userId !== session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  return Response.json(documents, { status: 200 });
}

const createDocumentUpdateMessage = (
  documentId: string,
  title: string,
  description: string,
) => {
  return [
    {
      type: 'text',
      text: `Обновляю сценарий:`,
    },
    {
      type: 'tool-invocation',
      toolInvocation: {
        state: 'result',
        step: 0,
        args: {
          id: documentId,
          description: description,
        },
        toolCallId: `toolu_${generateUUID()}`,
        toolName: 'updateDocument',
        result: {
          id: documentId,
          title: title,
          kind: 'text',
          content:
            'Документ успешно обновлен. Нельзя сразу вызывать updateDocument или createDocument в тот же запрос. Пожалуйста, ОБЯЗАТЕЛЬНО дождитесь отзыва пользователя перед дальнейшими изменениями.',
          justUpdated: true,
        },
      },
    },
    {
      type: 'text',
      text: `Сценарий обновлен.`,
    },
  ];
};

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const is_manual = searchParams.get('is_manual');
  const chatId = searchParams.get('chatId');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const session = await auth();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const {
    content,
    title,
    kind,
    description = 'Ручное обновление сценария',
  }: {
    content: string;
    title: string;
    kind: ArtifactKind;
    description?: string;
  } = await request.json();

  if (session.user?.id) {
    const document = await saveDocument({
      id,
      content,
      title,
      kind,
      userId: session.user.id,
    });

    // If this is a manual update and we have a chatId, create an assistant message
    if (is_manual === '1' && chatId) {
      try {
        // Create message parts with the document update message
        const messageParts = createDocumentUpdateMessage(
          id,
          title,
          description,
        );

        // Generate a unique ID for the message
        const messageId = generateUUID();

        // Save the message to the database
        await saveMessages({
          messages: [
            {
              id: messageId,
              chatId,
              role: 'assistant',
              parts: messageParts,
              attachments: [],
              createdAt: new Date(),
            },
          ],
        });

        return Response.json(
          {
            ...document,
            messageId,
            messageParts,
          },
          { status: 200 },
        );
      } catch (error) {
        console.error('Failed to create assistant message:', error);
        // Still return the document even if message creation fails
        return Response.json(document, { status: 200 });
      }
    }

    return Response.json(document, { status: 200 });
  }

  return new Response('Unauthorized', { status: 401 });
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const { timestamp }: { timestamp: string } = await request.json();

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const documents = await getDocumentsById({ id });

  const [document] = documents;

  if (document.userId !== session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  await deleteDocumentsByIdAfterTimestamp({
    id,
    timestamp: new Date(timestamp),
  });

  return new Response('Deleted', { status: 200 });
}
