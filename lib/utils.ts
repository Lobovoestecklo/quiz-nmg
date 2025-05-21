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
          content,
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
      //test
      .replace(/<редактирование>/g, '<div class="editing-block">')
      .replace(/<\/редактирование>/g, '</div>')
  );
}

export function parseModelResponse(text: any) {
  if (!text || typeof text !== 'string') return text;

  // Split the text by the custom tags to get the segments
  const segments = [];
  let remainingText = text;

  // Parse <редактирование> blocks
  const editingRegex = /<редактирование>([\s\S]*?)<\/редактирование>/g;
  let editingMatch;

  while ((editingMatch = editingRegex.exec(text)) !== null) {
    // Add text before the match
    const beforeText = remainingText.substring(0, editingMatch.index);
    if (beforeText) segments.push({ type: 'text', content: beforeText });

    // Parse inner content for previousVersion and newFragment
    const editingContent = editingMatch[1];
    const previousVersionMatch =
      /<предыдущая_версия>([\s\S]*?)<\/предыдущая_версия>/g.exec(
        editingContent,
      );
    const newFragmentMatch =
      /<новый_фрагмент>([\s\S]*?)<\/новый_фрагмент>/g.exec(editingContent);

    segments.push({
      type: 'editing',
      previousVersion: previousVersionMatch ? previousVersionMatch[1] : '',
      newFragment: newFragmentMatch ? newFragmentMatch[1] : '',
    });

    // Update remaining text
    remainingText = remainingText.substring(
      editingMatch.index + editingMatch[0].length,
    );
  }

  // Add any remaining text
  if (remainingText) segments.push({ type: 'text', content: remainingText });

  return segments;
}
