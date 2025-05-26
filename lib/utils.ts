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

/**
 * Extracts the first meaningful line of text from content
 * @param content The document content to extract from
 * @param minLength Minimum length of text to consider (default: 15)
 * @returns The first line with length >= minLength, or the first line if none meet the criteria
 */
export const getFirstMeaningfulLine = (
  content: string,
  minLength: number = 15,
): string => {
  if (!content) return '';

  // Split the content by line breaks
  const lines = content.split(/\r?\n/);

  // Look for the first line with length >= minLength
  const meaningfulLine = lines.find((line) => {
    // Clean the line of markdown symbols and trim whitespace
    const cleanLine = line
      .replace(/^#+\s|^\*\s|^-\s|^>\s|^\d+\.\s|^\s*/, '')
      .trim();
    return cleanLine.length >= minLength;
  });

  // If no line meets the criteria, return the first non-empty line
  if (!meaningfulLine) {
    const firstNonEmptyLine = lines.find((line) => line.trim().length > 0);
    return firstNonEmptyLine ? firstNonEmptyLine.trim() : '';
  }

  return meaningfulLine.trim();
};

interface FixedResult {
  start: number;
  end: number;
  confidence: number;
  method: string;
  similarity: number;
  foundText?: string; // For verification
}

/**
 * Main fixed function with reliable position mapping
 */
export function findPreviousVersionFixed(
  content: string,
  previousVersion: string,
  options: {
    minSimilarity?: number;
    maxResults?: number;
  } = {},
): FixedResult | null {
  const { minSimilarity = 0.7, maxResults = 5 } = options;

  console.log('🔍 Starting fixed search...');
  console.log('Content length:', content.length);
  console.log('PreviousVersion length:', previousVersion.length);

  // Strategy 1: Fixed word-based matching
  const wordResult = findByWordsFixed(content, previousVersion, minSimilarity);
  if (wordResult && wordResult.start !== wordResult.end) {
    console.log('✅ Found with fixed word matching');
    return wordResult;
  }

  // Strategy 2: Chunk-based sliding window
  const chunkResult = findByChunks(content, previousVersion, minSimilarity);
  if (chunkResult && chunkResult.start !== chunkResult.end) {
    console.log('✅ Found with chunk matching');
    return chunkResult;
  }

  // Strategy 3: Sentence-based matching
  const sentenceResult = findBySentences(
    content,
    previousVersion,
    minSimilarity,
  );
  if (sentenceResult && sentenceResult.start !== sentenceResult.end) {
    console.log('✅ Found with sentence matching');
    return sentenceResult;
  }

  // Strategy 4: Simple substring with normalization
  const normalizedResult = findByNormalization(content, previousVersion);
  if (normalizedResult && normalizedResult.start !== normalizedResult.end) {
    console.log('✅ Found with normalization');
    return normalizedResult;
  }

  console.log('❌ No valid match found');
  return null;
}

/**
 * Fixed word-based matching with proper position mapping
 */
function findByWordsFixed(
  content: string,
  previousVersion: string,
  minSimilarity: number,
): FixedResult | null {
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s\u0400-\u04FF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const normalizedPrevious = normalize(previousVersion);
  const previousWords = normalizedPrevious
    .split(' ')
    .filter((w) => w.length > 0);

  if (previousWords.length < 3) return null;

  // Split content into overlapping chunks and test each
  const targetLength = previousVersion.length;
  const windowSize = Math.max(targetLength, 500); // Minimum window size
  const stepSize = Math.floor(windowSize * 0.1); // 10% overlap

  let bestMatch: { start: number; end: number; similarity: number } | null =
    null;
  let bestSimilarity = 0;

  for (let i = 0; i <= content.length - windowSize; i += stepSize) {
    const window = content.substring(i, i + windowSize);
    const normalizedWindow = normalize(window);
    const windowWords = normalizedWindow.split(' ').filter((w) => w.length > 0);

    // Calculate word overlap similarity
    const similarity = calculateWordOverlap(windowWords, previousWords);

    if (similarity > bestSimilarity && similarity >= minSimilarity) {
      bestSimilarity = similarity;

      // Refine the boundaries within this window
      const refined = refineWindowBoundaries(window, previousVersion, i);

      bestMatch = {
        start: refined.start,
        end: refined.end,
        similarity,
      };
    }
  }

  if (bestMatch && bestMatch.start !== bestMatch.end) {
    // Apply boundary refinement
    const refined = refineBoundariesSmart(
      content,
      bestMatch.start,
      bestMatch.end,
      previousVersion,
    );

    return {
      start: refined.start,
      end: refined.end,
      confidence: bestMatch.similarity,
      method: 'words_fixed',
      similarity: bestMatch.similarity,
      foundText:
        content.substring(
          refined.start,
          Math.min(refined.start + 100, refined.end),
        ) + '...',
    };
  }

  return null;
}

/**
 * Calculate word overlap between two word arrays
 */
function calculateWordOverlap(words1: string[], words2: string[]): number {
  if (words1.length === 0 || words2.length === 0) return 0;

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));

  // Use intersection over smaller set for better similarity scoring
  const smallerSetSize = Math.min(set1.size, set2.size);
  return intersection.size / smallerSetSize;
}

/**
 * Refine boundaries within a promising window
 */
function refineWindowBoundaries(
  window: string,
  previousVersion: string,
  windowStart: number,
): { start: number; end: number } {
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s\u0400-\u04FF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const normalizedWindow = normalize(window);
  const normalizedPrevious = normalize(previousVersion);

  // Try to find the best substring match within the window
  const bestSubstring = findBestSubstring(normalizedWindow, normalizedPrevious);

  if (bestSubstring) {
    // Map normalized positions back to original positions (approximate)
    const originalStart =
      windowStart +
      Math.floor(
        bestSubstring.start * (window.length / normalizedWindow.length),
      );
    const originalEnd =
      windowStart +
      Math.floor(bestSubstring.end * (window.length / normalizedWindow.length));

    return {
      start: Math.max(windowStart, originalStart),
      end: Math.min(windowStart + window.length, originalEnd),
    };
  }

  // Fallback: use the entire window
  return {
    start: windowStart,
    end: windowStart + window.length,
  };
}

/**
 * Find best substring match using sliding window within a window
 */
function findBestSubstring(
  normalizedWindow: string,
  normalizedTarget: string,
): { start: number; end: number; score: number } | null {
  const targetLength = normalizedTarget.length;
  const windowLength = normalizedWindow.length;

  if (targetLength > windowLength) return null;

  let bestMatch: { start: number; end: number; score: number } | null = null;
  let bestScore = 0;

  for (let i = 0; i <= windowLength - targetLength; i++) {
    const substring = normalizedWindow.substring(i, i + targetLength);
    const score = calculateStringOverlap(substring, normalizedTarget);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = { start: i, end: i + targetLength, score };
    }
  }

  return bestMatch;
}

/**
 * Calculate string overlap (character level)
 */
function calculateStringOverlap(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const chars1 = str1.split('');
  const chars2 = str2.split('');

  const set1 = new Set(chars1);
  const set2 = new Set(chars2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Chunk-based matching - divide text into logical chunks
 */
function findByChunks(
  content: string,
  previousVersion: string,
  minSimilarity: number,
): FixedResult | null {
  const chunkSize = Math.max(200, Math.floor(previousVersion.length * 0.8));
  const overlap = Math.floor(chunkSize * 0.2);

  let bestMatch: { start: number; end: number; similarity: number } | null =
    null;
  let bestSimilarity = 0;

  for (let i = 0; i <= content.length - chunkSize; i += chunkSize - overlap) {
    const chunk = content.substring(i, i + chunkSize);
    const similarity = calculateContentSimilarity(chunk, previousVersion);

    if (similarity > bestSimilarity && similarity >= minSimilarity) {
      bestSimilarity = similarity;
      bestMatch = { start: i, end: i + chunkSize, similarity };
    }
  }

  if (bestMatch) {
    // Apply boundary refinement
    const refined = refineBoundariesSmart(
      content,
      bestMatch.start,
      bestMatch.end,
      previousVersion,
    );

    return {
      start: refined.start,
      end: refined.end,
      confidence: bestMatch.similarity,
      method: 'chunks',
      similarity: bestMatch.similarity,
      foundText:
        content.substring(
          refined.start,
          Math.min(refined.start + 100, refined.end),
        ) + '...',
    };
  }

  return null;
}

/**
 * Calculate content similarity using character overlap
 */
function calculateContentSimilarity(text1: string, text2: string): number {
  const normalize = (text: string) =>
    text.toLowerCase().replace(/[^\w\u0400-\u04FF]/g, '');

  const norm1 = normalize(text1);
  const norm2 = normalize(text2);

  if (!norm1 || !norm2) return 0;

  // Calculate character overlap
  const chars1 = norm1.split('');
  const chars2 = norm2.split('');

  let matches = 0;
  const used = new Set<number>();

  for (const char1 of chars1) {
    for (let j = 0; j < chars2.length; j++) {
      if (!used.has(j) && chars2[j] === char1) {
        matches++;
        used.add(j);
        break;
      }
    }
  }

  return matches / Math.max(chars1.length, chars2.length);
}

/**
 * Sentence-based matching for structured content
 */
function findBySentences(
  content: string,
  previousVersion: string,
  minSimilarity: number,
): FixedResult | null {
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 20);
  const targetSentences = previousVersion
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 10);

  if (targetSentences.length === 0) return null;

  // Find the best sequence of sentences that matches
  let bestMatch: { start: number; end: number; similarity: number } | null =
    null;
  let bestSimilarity = 0;

  for (let i = 0; i <= sentences.length - targetSentences.length; i++) {
    const sentenceWindow = sentences.slice(i, i + targetSentences.length);
    const windowText = sentenceWindow.join('. ');
    const targetText = targetSentences.join('. ');

    const similarity = calculateContentSimilarity(windowText, targetText);

    if (similarity > bestSimilarity && similarity >= minSimilarity) {
      bestSimilarity = similarity;

      // Find positions in original content
      const startSentence = sentences.slice(0, i).join('. ');
      const start = content.indexOf(sentenceWindow[0].trim());
      const end =
        content.indexOf(sentenceWindow[sentenceWindow.length - 1].trim()) +
        sentenceWindow[sentenceWindow.length - 1].length;

      if (start !== -1 && end > start) {
        bestMatch = { start, end, similarity };
      }
    }
  }

  if (bestMatch) {
    // Apply boundary refinement
    const refined = refineBoundariesSmart(
      content,
      bestMatch.start,
      bestMatch.end,
      previousVersion,
    );

    return {
      start: refined.start,
      end: refined.end,
      confidence: bestMatch.similarity,
      method: 'sentences',
      similarity: bestMatch.similarity,
      foundText:
        content.substring(
          refined.start,
          Math.min(refined.start + 100, refined.end),
        ) + '...',
    };
  }

  return null;
}

/**
 * Normalization-based fallback
 */
function findByNormalization(
  content: string,
  previousVersion: string,
): FixedResult | null {
  const aggressiveNormalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\u0400-\u04FF]/g, '')
      .replace(/\s+/g, '');

  const normalizedContent = aggressiveNormalize(content);
  const normalizedPrevious = aggressiveNormalize(previousVersion);

  if (!normalizedPrevious) return null;

  const pos = normalizedContent.indexOf(normalizedPrevious);

  if (pos !== -1) {
    // Rough mapping back to original positions
    const ratio = content.length / normalizedContent.length;
    const roughStart = Math.floor(pos * ratio);
    const roughEnd = Math.floor((pos + normalizedPrevious.length) * ratio);

    // Apply boundary refinement
    const refined = refineBoundariesSmart(
      content,
      roughStart,
      roughEnd,
      previousVersion,
    );

    return {
      start: refined.start,
      end: refined.end,
      confidence: 0.8,
      method: 'normalization',
      similarity: 1.0,
      foundText:
        content.substring(
          refined.start,
          Math.min(refined.start + 100, refined.end),
        ) + '...',
    };
  }

  return null;
}

/**
 * Smart boundary refinement for better start/end positions
 */
function refineBoundariesSmart(
  content: string,
  start: number,
  end: number,
  previousVersion: string,
): { start: number; end: number } {
  let refinedStart = start;
  let refinedEnd = end;

  console.log(
    `🔧 Refining boundaries from ${start}-${end} (length: ${end - start})`,
  );

  // === REFINE START POSITION ===

  // Look backwards for section header (##)
  const beforeStart = content.slice(Math.max(0, start - 300), start);
  const headerMatches = [...beforeStart.matchAll(/\n(##\s*.+?)$/gm)];

  if (headerMatches.length > 0) {
    const lastHeader = headerMatches[headerMatches.length - 1];
    if (lastHeader.index !== undefined) {
      const headerPos = Math.max(0, start - 300) + lastHeader.index + 1; // +1 to skip the \n

      // Only use header if it's close enough and looks relevant
      if (start - headerPos < 200) {
        console.log(
          `📍 Found header "${lastHeader[1]}" at position ${headerPos}`,
        );
        refinedStart = headerPos;
      }
    }
  }

  // If no header found, look for character names (### NAME)
  if (refinedStart === start) {
    const characterMatches = [
      ...beforeStart.matchAll(/\n(###\s*[А-ЯЁA-Z\s]+)$/gm),
    ];
    if (characterMatches.length > 0) {
      const lastCharacter = characterMatches[characterMatches.length - 1];
      if (lastCharacter.index !== undefined) {
        const characterPos = Math.max(0, start - 300) + lastCharacter.index + 1;
        if (start - characterPos < 100) {
          console.log(
            `🎭 Found character "${lastCharacter[1]}" at position ${characterPos}`,
          );
          refinedStart = characterPos;
        }
      }
    }
  }

  // === REFINE END POSITION ===

  // Look forwards for next section header
  const afterEnd = content.slice(end, Math.min(content.length, end + 500));
  const nextHeaderMatch = afterEnd.match(/\n##\s/);

  if (nextHeaderMatch && nextHeaderMatch.index !== undefined) {
    const nextHeaderPos = end + nextHeaderMatch.index;
    console.log(`🔚 Found next section at position ${nextHeaderPos}`);
    refinedEnd = nextHeaderPos;
  } else {
    // Look for sentence boundaries
    const sentenceEndMatches = [...afterEnd.matchAll(/[.!?]\s*(?:\n|$)/g)];
    if (sentenceEndMatches.length > 0) {
      const firstSentenceEnd = sentenceEndMatches[0];
      if (firstSentenceEnd.index !== undefined) {
        const sentenceEndPos = end + firstSentenceEnd.index + 1;
        // Only extend if it's reasonable
        if (sentenceEndPos - end < 100) {
          console.log(
            `📝 Extended to sentence end at position ${sentenceEndPos}`,
          );
          refinedEnd = sentenceEndPos;
        }
      }
    }
  }

  // === VALIDATION ===

  // Make sure we don't go beyond reasonable bounds
  const originalLength = previousVersion.length;
  const refinedLength = refinedEnd - refinedStart;

  console.log(
    `📏 Original length: ${originalLength}, Refined length: ${refinedLength}`,
  );

  // If refined version is way too long, use more conservative boundaries
  if (refinedLength > originalLength * 2.5) {
    console.log(`⚠️ Refined length too long, using conservative boundaries`);
    // Try a more conservative approach
    const conservativeStart = Math.max(start - 50, refinedStart);
    const conservativeEnd = Math.min(end + 50, refinedEnd);

    return { start: conservativeStart, end: conservativeEnd };
  }

  // Make sure positions are valid
  refinedStart = Math.max(0, refinedStart);
  refinedEnd = Math.min(content.length, refinedEnd);

  // Ensure start < end
  if (refinedStart >= refinedEnd) {
    console.log(`❌ Invalid refinement, returning original boundaries`);
    return { start, end }; // Return original if refinement failed
  }

  console.log(
    `✅ Refined to ${refinedStart}-${refinedEnd} (length: ${refinedLength})`,
  );
  return { start: refinedStart, end: refinedEnd };
}

/**
 * Simple debugging function
 */
function debugFind(content: string, previousVersion: string): void {
  console.log('=== DEBUG INFO ===');
  console.log('Content length:', content.length);
  console.log('PreviousVersion length:', previousVersion.length);
  console.log(
    'PreviousVersion first 50 chars:',
    previousVersion.substring(0, 50),
  );
  console.log(
    'PreviousVersion last 50 chars:',
    previousVersion.substring(previousVersion.length - 50),
  );

  const result = findPreviousVersionFixed(content, previousVersion, {
    minSimilarity: 0.6,
  });

  if (result) {
    console.log('FOUND:', result);
    console.log('Found text:', result.foundText);
  } else {
    console.log('NOT FOUND');
  }
}
