import { auth } from '@/app/(auth)/auth';
import { getMessagesByChatId, getDocumentsById } from '@/lib/db/queries';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new Response('Missing chatId', { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Get messages for this chat
    const messages = await getMessagesByChatId({ id: chatId });

    // Find the latest document from tool invocations
    let latestDocument = null;
    let latestMessageTimestamp = 0;

    for (const message of messages) {
      if (!message.parts || !Array.isArray(message.parts)) continue;

      const createdAt = new Date(message.createdAt).getTime();

      for (const part of message.parts) {
        if (
          part.type === 'tool-invocation' &&
          (part.toolInvocation?.toolName === 'createDocument' ||
            part.toolInvocation?.toolName === 'updateDocument') &&
          part.toolInvocation?.state === 'result' &&
          createdAt >= latestMessageTimestamp
        ) {
          latestMessageTimestamp = createdAt;
          latestDocument = {
            documentId: part.toolInvocation.result.id,
            title: part.toolInvocation.result.title,
            kind: part.toolInvocation.result.kind,
            messageId: message.id,
            createdAt: message.createdAt,
          };
        }
      }
    }

    if (!latestDocument) {
      return Response.json({ found: false }, { status: 200 });
    }

    // Get the full document with content
    const documents = await getDocumentsById({ id: latestDocument.documentId });

    if (!documents || documents.length === 0) {
      return Response.json({ found: false }, { status: 200 });
    }

    // Get the latest version of the document
    const latestDocumentWithContent = documents[documents.length - 1];

    return Response.json(
      {
        found: true,
        document: {
          ...latestDocument,
          content: latestDocumentWithContent.content,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error getting latest document for chat:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
