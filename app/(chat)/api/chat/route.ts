import {
  APICallError,
  UIMessage,
  appendResponseMessages,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';
import { auth } from '@/app/(auth)/auth';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
  upsertMessage,
  updateChatTitleById,
} from '@/lib/db/queries';
import {
  generateUUID,
  getMostRecentUserMessage,
  getBestUserMessageForTitle,
  getTrailingMessageId,
  sanitizeResponseMessages,
} from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { CHUNKS_SAVE_INTERVAL, isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { getDocument } from '@/lib/ai/tools/get-document';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      selectedChatModel,
    }: {
      id: string;
      messages: Array<UIMessage>;
      selectedChatModel: string;
    } = await request.json();

    const assistantMessageId = generateUUID();
    let startChunkUpdateTimestamp: Date | null = null;
    let chunksText = '';

    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new Response('Вы не авторизованы', { status: 401 });
    }

    const userMessage = getMostRecentUserMessage(messages);

    if (!userMessage) {
      return new Response('Не найдено ни одного сообщения от пользователя', {
        status: 400,
      });
    }

    const chat = await getChatById({ id });

    if (!chat) {
      // Используем лучшее сообщение для генерации названия
      const bestUserMessage = getBestUserMessageForTitle(messages);
      console.log(
        '🔍 [CHAT TITLE] Creating new chat, best message:',
        bestUserMessage?.parts,
      );
      const title = await generateTitleFromUserMessage({
        message: bestUserMessage || userMessage,
      });
      console.log('📝 [CHAT TITLE] Generated title for new chat:', title);

      await saveChat({ id, userId: session.user.id, title });
    } else {
      if (chat.userId !== session.user.id) {
        return new Response('Вы не авторизованы', { status: 401 });
      }

      // Проверяем, нужно ли обновить название чата на основе нового сообщения
      const bestUserMessage = getBestUserMessageForTitle(messages);
      console.log(
        '🔍 [CHAT TITLE] Existing chat, best message:',
        bestUserMessage?.parts,
      );
      console.log('🔍 [CHAT TITLE] Current chat title:', chat.title);

      // Проверяем, есть ли сообщения лучше текущего названия
      if (bestUserMessage) {
        console.log(
          '🔄 [CHAT TITLE] Found best message, generating new title...',
        );
        // Генерируем новое название на основе лучшего сообщения
        const newTitle = await generateTitleFromUserMessage({
          message: bestUserMessage,
        });
        console.log('📝 [CHAT TITLE] New title generated:', newTitle);

        // Обновляем название чата только если оно отличается от текущего и не является "Новый чат"
        if (newTitle !== chat.title && newTitle !== 'Новый чат') {
          console.log(
            '✅ [CHAT TITLE] Updating chat title from',
            chat.title,
            'to',
            newTitle,
          );
          await updateChatTitleById({ chatId: id, title: newTitle });
        } else {
          console.log(
            '⏭️ [CHAT TITLE] Title unchanged or still "Новый чат", skipping update',
          );
        }
      } else {
        console.log(
          '⏭️ [CHAT TITLE] No best message found, keeping current title',
        );
      }
    }

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: userMessage.id,
          role: 'user',
          parts: userMessage.parts,
          attachments: userMessage.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    return createDataStreamResponse({
      execute: (dataStream) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel }),
          providerOptions: {
            anthropic: {
              cacheControl: 'ephemeral',
            },
          },
          messages,
          maxTokens: 4000,
          // TODO: check whether we need cache control ephemeral
          maxSteps: 5,
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : ['createDocument', 'updateDocument', 'getDocument'],
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools: {
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            getDocument: getDocument({ session, dataStream }),
          },
          onChunk: async ({ chunk }) => {
            if (startChunkUpdateTimestamp === null) {
              startChunkUpdateTimestamp = new Date();
            }

            if (chunk.type === 'text-delta') {
              chunksText += chunk.textDelta;
            }
            if (
              new Date().getTime() - startChunkUpdateTimestamp.getTime() >
                CHUNKS_SAVE_INTERVAL &&
              chunksText.length > 0
            ) {
              await upsertMessage({
                id: assistantMessageId,
                chatId: id,
                role: 'assistant',
                parts: [{ type: 'text', text: chunksText }],
                attachments: [],
                createdAt: new Date(),
              });
              startChunkUpdateTimestamp = new Date();
            }
          },
          onFinish: async ({ response }) => {
            if (session.user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                });

                if (!assistantId) {
                  throw new Error(
                    'Не найдено ни одного сообщения от сценарного коуча!',
                  );
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [userMessage],
                  responseMessages: response.messages,
                });

                await upsertMessage({
                  id: assistantMessageId,
                  chatId: id,
                  role: assistantMessage.role,
                  parts: assistantMessage.parts,
                  attachments: assistantMessage.experimental_attachments ?? [],
                  createdAt: new Date(),
                });
              } catch (_) {
                console.error('Произошла ошибка при сохранении чата');
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: (error) => {
        console.error('Error in chat API:', error);
        if (APICallError.isInstance(error)) {
          if (error.statusCode === 429) {
            return 'Количество токенов превысило лимит!';
          }
        }
        return 'Произошла ошибка!';
      },
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    if (APICallError.isInstance(error)) {
      if (error.statusCode === 429) {
        return new Response('Количество токенов превысило лимит!', {
          status: 429,
        });
      }
    }
    return new Response('Произошла ошибка при обработке вашего запроса!', {
      status: 404,
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Не найдено', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Вы не авторизованы', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Вы не авторизованы', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Чат удален', { status: 200 });
  } catch (error) {
    return new Response('Произошла ошибка при обработке вашего запроса!', {
      status: 500,
    });
  }
}
