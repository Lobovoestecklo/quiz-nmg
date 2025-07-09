// app/(chat)/api/test/route.ts
import { auth } from '@/app/(auth)/auth';
import {
  getChatById,
  saveChat,
  saveMessages,
  saveDocument,
} from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';

export async function POST(request: Request) {
  const { chatId, title, content } = await request.json();

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
        title: `Тест: ${title}`,
      });

      isNewChat = true;
    }

    // Generate a unique ID for the document
    const documentId = generateUUID();

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
      { type: 'text', text: 'Создаю новый тест...' },
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
        text: `Тест ${title} успешно создан.`,
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
        chatId,
        documentId,
        messageId,
        savedMessage,
        isNewChat,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Failed to create test:', error);
    return new Response('Произошла ошибка при создании теста', {
      status: 500,
    });
  }
}
