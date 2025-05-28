'use client';

import {
  convertToUIMessages,
  findPreviousVersionFixed,
  getCustomScriptantinoFormat,
  getFirstMeaningfulLine,
  parseModelResponse,
} from '@/lib/utils';
import equal from 'fast-deep-equal';
import { memo, useCallback, useState, useMemo } from 'react';
import { Markdown } from './markdown';
import { useArtifact } from '@/hooks/use-artifact';
import { useSWRConfig } from 'swr';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CopyIcon, PlayIcon, LetterTextIcon, CheckIcon } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';

// This parses streaming content the same way as parseModelResponse
const parseStreamingContent = (content: string) => {
  if (!content || typeof content !== 'string')
    return [{ type: 'text', content: '' }];

  // Initialize segments array
  const segments = [];
  let remainingText = content;

  // Parse <редактирование> blocks
  const editingRegex = /<редактирование>([\s\S]*?)(<\/редактирование>|$)/g;
  let editingMatch;

  while ((editingMatch = editingRegex.exec(content)) !== null) {
    // Add text before the match
    const beforeText = remainingText.substring(0, editingMatch.index);
    if (beforeText) segments.push({ type: 'text', content: beforeText });

    // Extract the editing content
    const editingContent = editingMatch[1];

    // Parse previousVersion and newFragment
    const previousVersionMatch =
      /<предыдущая_версия>([\s\S]*?)(<\/предыдущая_версия>|$)/g.exec(
        editingContent,
      );
    const newFragmentMatch =
      /<новый_фрагмент>([\s\S]*?)(<\/новый_фрагмент>|$)/g.exec(editingContent);

    segments.push({
      type: 'editing',
      previousVersion: previousVersionMatch ? previousVersionMatch[1] : '',
      newFragment: newFragmentMatch ? newFragmentMatch[1] : '',
    });

    // Update remaining text - only if we have a closing tag
    if (editingMatch[2] === '</редактирование>') {
      remainingText = remainingText.substring(
        editingMatch.index + editingMatch[0].length,
      );
    } else {
      // If there's no closing tag, we've processed all content
      remainingText = '';
      break;
    }
  }

  // Add any remaining text
  if (remainingText) segments.push({ type: 'text', content: remainingText });

  return segments;
};

const PureMessageAiResponse = ({
  content,
  chatId,
  isStreaming = false,
  isEditingApplied = false,
}: {
  content: string;
  chatId: string;
  isStreaming?: boolean;
  isEditingApplied?: boolean;
}) => {
  // Use different parsing based on streaming state
  const segments = useMemo(() => {
    return isStreaming
      ? parseStreamingContent(content)
      : parseModelResponse(content);
  }, [content, isStreaming]);

  if (!segments || segments.length === 0) {
    return <Markdown>{content}</Markdown>;
  }

  return (
    <>
      {segments.map((segment: any, index: number) => {
        if (segment.type === 'text') {
          return (
            <Markdown key={`ai-response-${index}`}>
              {getCustomScriptantinoFormat(segment.content)}
            </Markdown>
          );
        } else if (segment.type === 'editing') {
          // For streaming, render a simplified version of AiEditingBlock
          if (isStreaming) {
            return (
              <div key={`ai-response-${index}`} className="relative">
                <div className="p-4 border rounded-t-2xl flex flex-row gap-2 items-start sm:items-center justify-between dark:bg-muted border-b-0 dark:border-zinc-700">
                  <div className="flex flex-row items-start sm:items-center gap-3">
                    <div className="text-muted-foreground">
                      <LetterTextIcon />
                    </div>
                    <div className="-translate-y-1 sm:translate-y-0 font-medium">
                      {/* title */}
                    </div>
                  </div>
                </div>
                <div className="border rounded-b-2xl dark:bg-muted border-t-0 dark:border-zinc-700 p-4 sm:px-4 sm:py-4">
                  <Markdown>{`${'...\n'}${segment.newFragment}${'\n...'}`}</Markdown>
                </div>
              </div>
            );
          }

          // For completed responses, use the full component
          return (
            <AiEditingBlock
              chatId={chatId}
              key={`ai-response-${index}`}
              segment={segment}
              isEditingApplied={isEditingApplied}
            />
          );
        }
        return null;
      })}
    </>
  );
};

export const MessageAiResponse = memo(
  PureMessageAiResponse,
  (prevProps, nextProps) => {
    if (prevProps.content !== nextProps.content) return false;
    if (prevProps.chatId !== nextProps.chatId) return false;
    if (prevProps.isStreaming !== nextProps.isStreaming) return false;
    if (prevProps.isEditingApplied !== nextProps.isEditingApplied) return false;
    return true;
  },
);

const PureAiEditingBlock = ({
  segment,
  chatId,
  isEditingApplied = false,
}: { segment: any; chatId: string; isEditingApplied?: boolean }) => {
  const { setArtifact } = useArtifact();
  const { mutate } = useSWRConfig();
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  const handleContentChange = useCallback(
    async (
      updatedContent: string,
      chatId: string,
      documentId: string,
      title: string,
      kind: string,
      document: any,
    ) => {
      mutate<Array<Document>>(
        `/api/document?id=${documentId}`,
        async (currentDocuments) => {
          if (!currentDocuments) return undefined;

          const messagesResponse = await fetch(
            `/api/chat/messages?chatId=${chatId}`,
          );
          const { messages: dbMessages } = await messagesResponse.json();
          console.log({ dbMessages });
          const messages = convertToUIMessages(dbMessages);
          console.log({ messages });

          // const response = await fetch(
          //   `/api/document/manual?id=${documentId}&chatId=${chatId}`,
          //   {
          //     method: 'PATCH',
          //     body: JSON.stringify({
          //       title: title,
          //       content: updatedContent,
          //       kind: kind,
          //     }),
          //   },
          // );

          // const result = await response.json();

          // if (result.savedMessage) {
          //   setMessages([...messages, result.savedMessage]);
          // }

          // const newDocument = {
          //   ...document,
          //   content: updatedContent,
          //   createdAt: new Date(),
          // };

          return [...currentDocuments /* , newDocument */];
        },
        { revalidate: false },
      );
    },
    [mutate, /* setMessages, */ chatId],
  );

  const onApply = useCallback(async () => {
    console.log({ segment });
    // TODO: pass real chatId
    try {
      const response = await fetch(
        `/api/document/chat-latest?chatId=${chatId}`,
      );

      if (!response.ok) {
        // TODO: show message
      }

      const data = await response.json();
      console.log({ data });

      if (!data.found) {
        // TODO: show message
      }

      const { document } = data;

      //   const textLineToScrollTo = getFirstMeaningfulLine(
      //     segment.previousVersion,
      //   );
      //   console.log({ textLineToScrollTo });

      const previousVersionPositions = findPreviousVersionFixed(
        document.content,
        segment.previousVersion,
      );

      //   console.log('segment.previousVersion', segment.previousVersion);

      //   console.log({ previousVersionPositions });
      if (!previousVersionPositions) {
        // TODO: show message
      } else {
        const { start, end } = previousVersionPositions;
        const test = document.content.slice(start, end);
        console.log({ test });

        const newContent =
          document.content.slice(0, start) +
          segment.newFragment +
          document.content.slice(end);
        console.log({ newContent });

        await handleContentChange(
          newContent,
          chatId,
          document.documentId,
          document.title,
          document.kind,
          document,
        );
      }

      //   setArtifact({
      //     documentId: document.documentId,
      //     kind: document.kind,
      //     content: document.content,
      //     title: document.title,
      //     isVisible: true,
      //     status: 'idle',
      //     boundingBox: {
      //       top: 0,
      //       left: 0,
      //       width: 0,
      //       height: 0,
      //     },
      //     editingMetadata: {
      //       scrollToText: textLineToScrollTo,
      //     },
      //   });
    } catch (error) {
      console.error('Error checking for documents:', error);
    }
  }, [handleContentChange, chatId, segment]);

  return (
    <div className="relative">
      <div
        className="size-full absolute top-0 left-0 rounded-xl z-10"
        aria-hidden="true"
      >
        <div className="w-full p-4 flex justify-end items-center">
          <div className="absolute right-[9px] top-[13px] flex flex-row gap-2">
            <Tooltip key={'Копировать'}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('h-fit dark:hover:bg-zinc-700 p-2')}
                  onClick={() => {
                    try {
                      navigator.clipboard.writeText(segment.newFragment);
                      toast.success('Скопировано!');
                    } catch (error) {
                      toast.error('Произошла ошибка! Попробуйте ещё раз.');
                    }
                  }}
                  disabled={false}
                >
                  <CopyIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Копировать</TooltipContent>
            </Tooltip>
            {!isEditingApplied ? (
              <Tooltip key={'Применить'}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('h-fit dark:hover:bg-zinc-700 py-1.5 px-2')}
                    onClick={() => {
                      setIsComparisonOpen(true);
                    }}
                    disabled={false}
                  >
                    <PlayIcon />
                    {'Применить'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Применить</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip key={'Применено'}>
                <TooltipTrigger asChild>
                  <Button
                    disabled
                    variant="outline"
                    className={cn('h-fit dark:hover:bg-zinc-700 py-1.5 px-2')}
                  >
                    <CheckIcon />
                    {'Применено'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Применено</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
      <div className="p-4 border rounded-t-2xl flex flex-row gap-2 items-start sm:items-center justify-between dark:bg-muted border-b-0 dark:border-zinc-700">
        <div className="flex flex-row items-start sm:items-center gap-3">
          <div className="text-muted-foreground">
            <LetterTextIcon />
          </div>
          <div className="-translate-y-1 sm:translate-y-0 font-medium">
            {/* title */}
          </div>
        </div>
        <div className="w-8" />
      </div>
      <div className="border rounded-b-2xl dark:bg-muted border-t-0 dark:border-zinc-700 p-4 sm:px-4 sm:py-4">
        <Markdown>{`${'...\n'}${segment.newFragment}${'\n...'}`}</Markdown>
      </div>

      {/* Comparison Modal */}
      <Sheet open={isComparisonOpen} onOpenChange={setIsComparisonOpen}>
        <SheetContent side="bottom" className="h-[90vh] w-full max-w-none p-0">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b">
              <SheetHeader>
                <SheetTitle>Сравнение изменений</SheetTitle>
                <SheetDescription>
                  Просмотрите изменения перед применением
                </SheetDescription>
              </SheetHeader>
            </div>
            <div className="flex-1 flex overflow-hidden">
              <div className="w-1/2 border-r overflow-auto p-4">
                <div className="font-medium mb-2 text-muted-foreground">
                  Предыдущая версия
                </div>
                <Markdown>{segment.previousVersion}</Markdown>
              </div>
              <div className="w-1/2 overflow-auto p-4">
                <div className="font-medium mb-2 text-muted-foreground">
                  Новая версия
                </div>
                <Markdown>{segment.newFragment}</Markdown>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <SheetClose asChild>
                <Button variant="outline">Отмена</Button>
              </SheetClose>
              <Button
                onClick={async () => {
                  await onApply();
                  setIsComparisonOpen(false);
                }}
              >
                Применить изменения
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

const AiEditingBlock = memo(PureAiEditingBlock, (prevProps, nextProps) => {
  if (!equal(prevProps.segment, nextProps.segment)) return false;
  if (prevProps.chatId !== nextProps.chatId) return false;
  if (prevProps.isEditingApplied !== nextProps.isEditingApplied) return false;
  return true;
});
