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

interface GeneralResult {
  start: number;
  end: number;
  confidence: number; // 0-1 score
  method: string;
  similarity: number;
}

/**
 * Main general-purpose finder
 */
export function findPreviousVersionGeneral(
  content: string,
  previousVersion: string,
  options: {
    minSimilarity?: number;
    windowSizeMultiplier?: number;
    stepSizeRatio?: number;
  } = {},
): GeneralResult | null {
  const {
    minSimilarity = 0.7,
    windowSizeMultiplier = 1.5,
    stepSizeRatio = 0.1,
  } = options;

  console.log('🔍 Starting general search...');

  // Strategy 1: Word-based fuzzy matching
  const fuzzyResult = findByWordMatching(
    content,
    previousVersion,
    minSimilarity,
  );
  if (fuzzyResult && fuzzyResult.confidence > 0.8) {
    console.log('✅ Found with word matching (high confidence)');
    return fuzzyResult;
  }

  // Strategy 2: Sliding window with content fingerprinting
  const windowResult = findBySlidingWindow(
    content,
    previousVersion,
    windowSizeMultiplier,
    stepSizeRatio,
    minSimilarity,
  );
  if (windowResult && windowResult.confidence > 0.7) {
    console.log('✅ Found with sliding window');
    return windowResult;
  }

  // Strategy 3: Multi-anchor approach
  const anchorResult = findByMultipleAnchors(content, previousVersion);
  if (anchorResult && anchorResult.confidence > 0.6) {
    console.log('✅ Found with multiple anchors');
    return anchorResult;
  }

  // Strategy 4: Progressive signature matching
  const progressiveResult = findByProgressiveSignatures(
    content,
    previousVersion,
  );
  if (progressiveResult && progressiveResult.confidence > 0.5) {
    console.log('✅ Found with progressive signatures');
    return progressiveResult;
  }

  // Return best result found, even if low confidence
  const allResults = [
    fuzzyResult,
    windowResult,
    anchorResult,
    progressiveResult,
  ]
    .filter((r) => r !== null)
    .sort((a, b) => (b?.confidence || 0) - (a?.confidence || 0));

  return allResults[0] || null;
}

/**
 * Word-based fuzzy matching - most reliable for formatting differences
 */
function findByWordMatching(
  content: string,
  previousVersion: string,
  minSimilarity: number,
): GeneralResult | null {
  // Aggressive normalization
  const normalizeForWords = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u0400-\u04FF]/g, ' ') // Keep only words and Cyrillic
      .replace(/\s+/g, ' ')
      .trim();
  };

  const normalizedContent = normalizeForWords(content);
  const normalizedPrevious = normalizeForWords(previousVersion);

  if (!normalizedPrevious) return null;

  const contentWords = normalizedContent.split(' ');
  const previousWords = normalizedPrevious.split(' ');

  if (previousWords.length < 3) return null; // Need enough words for reliable matching

  const windowSize = previousWords.length;
  let bestMatch: { start: number; end: number; similarity: number } | null =
    null;
  let bestSimilarity = 0;

  // Slide word window across content
  for (let i = 0; i <= contentWords.length - windowSize; i++) {
    const windowWords = contentWords.slice(i, i + windowSize);
    const similarity = calculateWordSimilarity(windowWords, previousWords);

    if (similarity > bestSimilarity && similarity >= minSimilarity) {
      bestSimilarity = similarity;

      // Map word positions back to character positions
      const charStart = mapWordsToCharPosition(content, normalizedContent, i);
      const charEnd = mapWordsToCharPosition(
        content,
        normalizedContent,
        i + windowSize,
      );

      bestMatch = { start: charStart, end: charEnd, similarity };
    }
  }

  if (bestMatch) {
    return {
      start: bestMatch.start,
      end: bestMatch.end,
      confidence: bestMatch.similarity,
      method: 'word_matching',
      similarity: bestMatch.similarity,
    };
  }

  return null;
}

/**
 * Calculate similarity between word arrays
 */
function calculateWordSimilarity(words1: string[], words2: string[]): number {
  if (words1.length === 0 || words2.length === 0) return 0;

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  const jaccardSimilarity = intersection.size / union.size;

  // Also consider word order
  let orderSimilarity = 0;
  const minLength = Math.min(words1.length, words2.length);
  for (let i = 0; i < minLength; i++) {
    if (words1[i] === words2[i]) {
      orderSimilarity += 1;
    }
  }
  orderSimilarity /= Math.max(words1.length, words2.length);

  // Combined score
  return jaccardSimilarity * 0.7 + orderSimilarity * 0.3;
}

/**
 * Map word position to character position
 */
function mapWordsToCharPosition(
  originalText: string,
  normalizedText: string,
  wordIndex: number,
): number {
  if (wordIndex === 0) return 0;

  const normalizedWords = normalizedText.split(' ');
  const targetWordStart = normalizedWords.slice(0, wordIndex).join(' ');

  // Find this in the original text (approximate)
  const normalized = originalText
    .toLowerCase()
    .replace(/[^\w\s\u0400-\u04FF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const normalizedPos = normalized.indexOf(targetWordStart);

  if (normalizedPos === -1) return 0;

  // Map back to original (rough approximation)
  let originalPos = 0;
  let normalizedCount = 0;

  for (
    let i = 0;
    i < originalText.length && normalizedCount < normalizedPos;
    i++
  ) {
    const char = originalText[i];
    const normalizedChar = char
      .toLowerCase()
      .replace(/[^\w\s\u0400-\u04FF]/g, ' ')
      .replace(/\s+/g, ' ');

    originalPos++;
    if (normalizedChar) normalizedCount++;
  }

  return originalPos;
}

/**
 * Sliding window with content fingerprinting
 */
function findBySlidingWindow(
  content: string,
  previousVersion: string,
  windowMultiplier: number,
  stepRatio: number,
  minSimilarity: number,
): GeneralResult | null {
  const targetLength = previousVersion.length;
  const windowSize = Math.floor(targetLength * windowMultiplier);
  const stepSize = Math.max(1, Math.floor(targetLength * stepRatio));

  let bestMatch: { start: number; end: number; similarity: number } | null =
    null;
  let bestSimilarity = 0;

  for (let i = 0; i <= content.length - windowSize; i += stepSize) {
    const window = content.substring(i, i + windowSize);
    const similarity = calculateContentSimilarity(window, previousVersion);

    if (similarity > bestSimilarity && similarity >= minSimilarity) {
      bestSimilarity = similarity;
      bestMatch = { start: i, end: i + windowSize, similarity };
    }
  }

  if (bestMatch) {
    // Refine boundaries
    const refined = refineBoundaries(
      content,
      previousVersion,
      bestMatch.start,
      bestMatch.end,
    );

    return {
      start: refined.start,
      end: refined.end,
      confidence: bestMatch.similarity,
      method: 'sliding_window',
      similarity: bestMatch.similarity,
    };
  }

  return null;
}

/**
 * Calculate content similarity (formatting-agnostic)
 */
function calculateContentSimilarity(text1: string, text2: string): number {
  const normalize = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\u0400-\u04FF]/g, '')
      .replace(/\s+/g, '');
  };

  const norm1 = normalize(text1);
  const norm2 = normalize(text2);

  if (!norm1 || !norm2) return 0;

  // Use longest common subsequence ratio
  const lcs = longestCommonSubsequence(norm1, norm2);
  return lcs / Math.max(norm1.length, norm2.length);
}

/**
 * Longest Common Subsequence length
 */
function longestCommonSubsequence(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Multiple anchor points approach
 */
function findByMultipleAnchors(
  content: string,
  previousVersion: string,
): GeneralResult | null {
  // Extract multiple anchor phrases from previousVersion
  const anchors = extractAnchorPhrases(previousVersion);
  if (anchors.length < 2) return null;

  const anchorPositions: { phrase: string; position: number }[] = [];

  // Find each anchor in content
  for (const anchor of anchors) {
    const pos = findAnchorInContent(content, anchor);
    if (pos !== -1) {
      anchorPositions.push({ phrase: anchor, position: pos });
    }
  }

  if (anchorPositions.length < 2) return null;

  // Sort by position
  anchorPositions.sort((a, b) => a.position - b.position);

  // Estimate boundaries based on anchors
  const start = anchorPositions[0].position;
  const end =
    anchorPositions[anchorPositions.length - 1].position +
    anchorPositions[anchorPositions.length - 1].phrase.length;

  const similarity = anchorPositions.length / anchors.length;

  return {
    start,
    end,
    confidence: similarity,
    method: 'multiple_anchors',
    similarity,
  };
}

/**
 * Extract anchor phrases from text
 */
function extractAnchorPhrases(text: string, minLength: number = 10): string[] {
  const sentences = text
    .split(/[.!?]+/)
    .filter((s) => s.trim().length >= minLength);
  const phrases: string[] = [];

  // Add sentence fragments
  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/);
    if (words.length >= 3) {
      // First few words
      phrases.push(words.slice(0, Math.min(5, words.length)).join(' ').trim());
      // Last few words
      if (words.length > 5) {
        phrases.push(words.slice(-3).join(' ').trim());
      }
    }
  }

  // Add line-based phrases
  const lines = text
    .split('\n')
    .filter((line) => line.trim().length >= minLength);
  for (const line of lines.slice(0, 5)) {
    // First 5 substantial lines
    phrases.push(line.trim());
  }

  return [...new Set(phrases)]; // Remove duplicates
}

/**
 * Find anchor phrase in content with fuzzy matching
 */
function findAnchorInContent(content: string, anchor: string): number {
  const normalize = (text: string) =>
    text.toLowerCase().replace(/\s+/g, ' ').trim();

  const normalizedContent = normalize(content);
  const normalizedAnchor = normalize(anchor);

  // Try exact match first
  let pos = normalizedContent.indexOf(normalizedAnchor);
  if (pos !== -1) return pos;

  // Try partial matches (80% of anchor)
  const partialLength = Math.floor(normalizedAnchor.length * 0.8);
  if (partialLength >= 8) {
    pos = normalizedContent.indexOf(
      normalizedAnchor.substring(0, partialLength),
    );
    if (pos !== -1) return pos;
  }

  return -1;
}

/**
 * Progressive signature matching with increasing lengths
 */
function findByProgressiveSignatures(
  content: string,
  previousVersion: string,
): GeneralResult | null {
  const signatureLengths = [10, 15, 20, 25, 30, 40, 50];

  for (const sigLength of signatureLengths) {
    const result = trySignatureLength(content, previousVersion, sigLength);
    if (result) {
      return { ...result, method: `progressive_${sigLength}` };
    }
  }

  return null;
}

/**
 * Try specific signature length
 */
function trySignatureLength(
  content: string,
  previousVersion: string,
  sigLength: number,
): GeneralResult | null {
  if (previousVersion.length < sigLength * 2) return null;

  const startSig = extractSignature(previousVersion, 'start', sigLength);
  const endSig = extractSignature(previousVersion, 'end', sigLength);

  if (!startSig || !endSig) return null;

  const startPos = findSignatureInContent(content, startSig);
  if (startPos === -1) return null;

  const endPos = findSignatureInContent(content, endSig, startPos);
  if (endPos === -1) return null;

  const foundLength = endPos - startPos + endSig.length;
  const expectedLength = previousVersion.length;
  const lengthRatio = foundLength / expectedLength;

  if (lengthRatio < 0.3 || lengthRatio > 3) return null;

  return {
    start: startPos,
    end: endPos + endSig.length,
    confidence: Math.min(1, 1 / Math.abs(lengthRatio - 1) + 0.5),
    method: 'signature',
    similarity: lengthRatio > 1 ? 1 / lengthRatio : lengthRatio,
  };
}

/**
 * Extract meaningful signature from text
 */
function extractSignature(
  text: string,
  position: 'start' | 'end',
  length: number,
): string {
  const lines = text.split('\n').filter((line) => line.trim());
  if (lines.length === 0) return '';

  let signature = '';
  if (position === 'start') {
    signature = lines[0] + (lines[1] || '');
  } else {
    signature = lines[lines.length - 1];
    if (signature.length < length && lines.length > 1) {
      signature = (lines[lines.length - 2] || '') + signature;
    }
  }

  return signature
    .substring(
      position === 'start' ? 0 : Math.max(0, signature.length - length),
      position === 'start' ? length : signature.length,
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find signature in content with fuzzy matching
 */
function findSignatureInContent(
  content: string,
  signature: string,
  startFrom: number = 0,
): number {
  const normalize = (text: string) =>
    text.toLowerCase().replace(/\s+/g, ' ').trim();

  const normalizedContent = normalize(content);
  const normalizedSignature = normalize(signature);

  return normalizedContent.indexOf(normalizedSignature, startFrom);
}

/**
 * Refine boundaries to better match content structure
 */
function refineBoundaries(
  content: string,
  previousVersion: string,
  start: number,
  end: number,
): { start: number; end: number } {
  // Look for natural boundaries around the found region
  const before = content.substring(Math.max(0, start - 100), start);
  const after = content.substring(end, Math.min(content.length, end + 100));

  // Find section boundaries
  const sectionStart = before.lastIndexOf('\n##');
  const sectionEnd = after.indexOf('\n##');

  let refinedStart = start;
  let refinedEnd = end;

  if (sectionStart !== -1) {
    refinedStart = Math.max(0, start - 100 + sectionStart + 1);
  }

  if (sectionEnd !== -1) {
    refinedEnd = end + sectionEnd;
  }

  return { start: refinedStart, end: refinedEnd };
}
