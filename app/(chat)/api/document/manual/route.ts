import { auth } from '@/app/(auth)/auth';
import { ArtifactKind } from '@/components/artifact';
import { saveDocument, saveMessages } from '@/lib/db/queries';
import { createDocumentUpdateMessage, generateUUID } from '@/lib/utils';

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
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

    if (chatId) {
      try {
        // Create message parts with the document update message
        const messageParts = createDocumentUpdateMessage(
          id,
          title,
          description,
          content,
        );

        // Generate a unique ID for the message
        const messageId = generateUUID();

        // Save the message to the database
        const savedMessage = (
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
          })
        )[0];

        return Response.json(
          {
            ...document,
            messageId,
            messageParts,
            savedMessage,
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
