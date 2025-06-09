import { auth } from '@/app/(auth)/auth';
import {
  saveDocument,
  saveChat,
  saveMessages,
  getChatById,
} from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';

export async function POST(request: Request) {
  const { id, chatId, title, content } = await request.json();

  if (!chatId || !title || !content) {
    return new Response('Missing required fields', { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  let isNewChat = false;

  try {
    // Check if the chat exists
    const existingChat = await getChatById({ id: chatId });

    // If chat doesn't exist, create it
    if (!existingChat) {
      await saveChat({
        id: chatId,
        userId: session.user.id,
        title: `Сценарий: ${title}`,
      });

      isNewChat = true;
    }

    // Generate a unique ID for the document
    const documentId = id || generateUUID();

    // Create the document
    await saveDocument({
      id: documentId,
      title,
      kind: 'text',
      content,
      userId: session.user.id,
    });

    // Create message parts with tool invocation
    const messageParts = [
      { type: 'text', text: 'Извлекаю текст из pdf...' },
      {
        type: 'tool-invocation',
        toolInvocation: {
          state: 'result',
          step: 0,
          args: {
            title: title,
            kind: 'text',
          },
          toolCallId: `toolu_${generateUUID()}`,
          toolName: 'createDocument',
          result: {
            id: documentId,
            title: title,
            kind: 'text',
            content,
          },
        },
      },
      {
        type: 'text',
        text: `Сценарий ${title} успешно извлечен из pdf. Желаете приступить к анализу?`,
      },
    ];

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
        id: documentId,
        title,
        kind: 'text',
        content,
        savedMessage,
        isNewChat,
        chatId,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error saving document:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
