import type {
  CoreAssistantMessage,
  CoreToolMessage,
  Message,
  TextStreamPart,
  ToolInvocation,
  ToolSet,
  UIMessage,
} from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import type { Document } from '@/lib/db/schema';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ApplicationError extends Error {
  info: string;
  status: number;
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error(
      'An error occurred while fetching the data.',
    ) as ApplicationError;

    error.info = await res.json();
    error.status = res.status;

    throw error;
  }

  return res.json();
};

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function addToolMessageToChat({
  toolMessage,
  messages,
}: {
  toolMessage: CoreToolMessage;
  messages: Array<Message>;
}): Array<Message> {
  return messages.map((message) => {
    if (message.toolInvocations) {
      return {
        ...message,
        toolInvocations: message.toolInvocations.map((toolInvocation) => {
          const toolResult = toolMessage.content.find(
            (tool) => tool.toolCallId === toolInvocation.toolCallId,
          );

          if (toolResult) {
            return {
              ...toolInvocation,
              state: 'result',
              result: toolResult.result,
            };
          }

          return toolInvocation;
        }),
      };
    }

    return message;
  });
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function sanitizeResponseMessages({
  messages,
  reasoning,
}: {
  messages: Array<ResponseMessage>;
  reasoning: string | undefined;
}) {
  const toolResultIds: Array<string> = [];

  for (const message of messages) {
    if (message.role === 'tool') {
      for (const content of message.content) {
        if (content.type === 'tool-result') {
          toolResultIds.push(content.toolCallId);
        }
      }
    }
  }

  const messagesBySanitizedContent = messages.map((message) => {
    if (message.role !== 'assistant') return message;

    if (typeof message.content === 'string') return message;

    const sanitizedContent = message.content.filter((content) =>
      content.type === 'tool-call'
        ? toolResultIds.includes(content.toolCallId)
        : content.type === 'text'
          ? content.text.length > 0
          : true,
    );

    if (reasoning) {
      // @ts-expect-error: reasoning message parts in sdk is wip
      sanitizedContent.push({ type: 'reasoning', reasoning });
    }

    return {
      ...message,
      content: sanitizedContent,
    };
  });

  return messagesBySanitizedContent.filter(
    (message) => message.content.length > 0,
  );
}

export function getMostRecentUserMessage(messages: Array<UIMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getBestUserMessageForTitle(messages: Array<UIMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  console.log('🔍 [TITLE LOGIC] Total user messages:', userMessages.length);

  // Список приветствий, которые нужно пропустить
  const greetings = [
    'привет',
    'здравствуйте',
    'добрый день',
    'добрый вечер',
    'доброе утро',
    'hi',
    'hello',
    'hey',
    'good morning',
    'good afternoon',
    'good evening',
    'привет!',
    'здравствуйте!',
    'добрый день!',
    'добрый вечер!',
    'доброе утро!',
    'hi!',
    'hello!',
    'hey!',
    'good morning!',
    'good afternoon!',
    'good evening!',
  ];

  // Ищем самое информативное сообщение пользователя
  let bestMessage = null;
  let bestScore = 0;

  for (const message of userMessages) {
    const messageText = message.parts
      .filter((part) => part.type === 'text')
      .map((part) => (part as any).text)
      .join(' ')
      .toLowerCase()
      .trim();

    console.log('🔍 [TITLE LOGIC] Analyzing message:', messageText);

    // Проверяем, является ли сообщение только приветствием
    const isOnlyGreeting = greetings.some(
      (greeting) => messageText === greeting || messageText === greeting.trim(),
    );

    if (isOnlyGreeting) {
      console.log('⏭️ [TITLE LOGIC] Skipping greeting message');
      continue; // Пропускаем сообщения, которые содержат только приветствие
    }

    // Вычисляем "информативность" сообщения
    let score = 0;

    // Базовый балл за длину (но не слишком длинные)
    score += Math.min(messageText.length, 100);

    // Бонус за ключевые слова, связанные с обучением
    const educationalKeywords = [
      'курс',
      'обучение',
      'развитие',
      'навык',
      'умение',
      'изучить',
      'научиться',
      'программа',
      'тренинг',
      'семинар',
      'мастер-класс',
      'практика',
      'теория',
      'менеджмент',
      'управление',
      'лидерство',
      'коммуникация',
      'презентация',
      'продажи',
      'маркетинг',
      'финансы',
      'анализ',
      'планирование',
      'проект',
      'команда',
      'сотрудники',
      'клиенты',
      'партнеры',
      'переговоры',
      'конфликт',
      'мотивация',
      'делегирование',
      'контроль',
      'оценка',
      'обратная связь',
      'excel',
      'word',
      'powerpoint',
      'access',
      'outlook',
      'teams',
      'sharepoint',
      'python',
      'javascript',
      'html',
      'css',
      'sql',
      'база данных',
      'аналитика',
      'статистика',
      'графики',
      'отчеты',
      'документы',
      'процессы',
      'автоматизация',
    ];

    educationalKeywords.forEach((keyword) => {
      if (messageText.includes(keyword)) {
        score += 50; // Большой бонус за образовательные ключевые слова
        console.log(
          '🎯 [TITLE LOGIC] Found educational keyword:',
          keyword,
          'score +50',
        );
      }
    });

    // Бонус за конкретные запросы
    if (
      messageText.includes('хочу') ||
      messageText.includes('нужно') ||
      messageText.includes('требуется')
    ) {
      score += 30;
      console.log('🎯 [TITLE LOGIC] Found request word, score +30');
    }

    if (
      messageText.includes('стать') ||
      messageText.includes('развиться') ||
      messageText.includes('получить')
    ) {
      score += 25;
      console.log('🎯 [TITLE LOGIC] Found goal word, score +25');
    }

    // Штраф за очень короткие сообщения
    if (messageText.length < 10) {
      score -= 20;
      console.log('⚠️ [TITLE LOGIC] Short message penalty, score -20');
    }

    console.log('📊 [TITLE LOGIC] Message score:', score);

    // Если это сообщение лучше предыдущего лучшего
    if (score > bestScore) {
      bestScore = score;
      bestMessage = message;
      console.log('🏆 [TITLE LOGIC] New best message found with score:', score);
    }
  }

  console.log('🏆 [TITLE LOGIC] Final best message score:', bestScore);

  // Если не нашли подходящего сообщения, возвращаем последнее
  return bestMessage || userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index].createdAt;
}

export function getTrailingMessageId({
  messages,
}: {
  messages: Array<ResponseMessage>;
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) return null;

  return trailingMessage.id;
}

export const createDocumentUpdateMessage = (
  documentId: string,
  title: string,
  description: string,
  content: string,
) => {
  return [
    {
      type: 'text',
      text: `Тест обновлен.`,
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
          content,
          justUpdated: true,
        },
      },
    },
    {
      type: 'text',
      text: `Учебный материал обновлен.`,
    },
  ];
};

export function getCustomScriptantinoFormat(text: any) {
  if (!text || typeof text !== 'string') return text;

  return (
    text
      // Opening tags
      .replace(/<разбор_сценария>/g, '**Разбор сценария:**\n')
      .replace(/<предложения>/g, '**Предложения:**\n')
      .replace(/<объяснение>/g, '**Объяснение:**\n')
      .replace(/<поддержка>/g, '**Поддержка:**\n')
      // Closing tags
      .replace(/<\/разбор_сценария>/g, '\n')
      .replace(/<\/предложения>/g, '\n')
      .replace(/<\/объяснение>/g, '\n')
      .replace(/<\/поддержка>/g, '\n')
  );
}
