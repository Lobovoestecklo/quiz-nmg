'use client';

import {
  convertToUIMessages,
  findPreviousVersionFixed,
  getCustomScriptantinoFormat,
  getFirstMeaningfulLine,
  parseModelResponse,
} from '@/lib/utils';
import equal from 'fast-deep-equal';
import { memo, useCallback } from 'react';
import { Markdown } from './markdown';
import { useArtifact } from '@/hooks/use-artifact';
import { useSWRConfig } from 'swr';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CopyIcon, PlayIcon } from 'lucide-react';

const PureMessageAiResponse = ({
  content,
  chatId,
}: {
  content: string;
  chatId: string;
}) => {
  const segments = parseModelResponse(content);
  console.log({ segments });
  console.log({ chatId });
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
          return (
            <AiEditingBlock
              chatId={chatId}
              key={`ai-response-${index}`}
              segment={segment}
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
    // if (prevProps.message.id !== nextProps.message.id) return false;
    // if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
    // if (!equal(prevProps.vote, nextProps.vote)) return false;

    return true;
  },
);

const PureAiEditingBlock = ({
  segment,
  chatId,
}: { segment: any; chatId: string }) => {
  const { setArtifact } = useArtifact();
  const { mutate } = useSWRConfig();

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

      const textLineToScrollTo = getFirstMeaningfulLine(
        segment.previousVersion,
      );
      console.log({ textLineToScrollTo });

      const previousVersionPositions = findPreviousVersionFixed(
        document.content,
        segment.previousVersion,
      );

      console.log('segment.previousVersion', segment.previousVersion);

      console.log({ previousVersionPositions });
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
            <Tooltip key={'Применить'}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('h-fit dark:hover:bg-zinc-700 py-1.5 px-2')}
                  onClick={async () => {
                    try {
                      await onApply();
                    } catch (error) {
                      toast.error('Произошла ошибка! Попробуйте ещё раз.');
                    }
                  }}
                  disabled={false}
                >
                  <PlayIcon />
                  {'Применить'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Применить</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
      <div className="p-4 border rounded-t-2xl flex flex-row gap-2 items-start sm:items-center justify-between dark:bg-muted border-b-0 dark:border-zinc-700">
        <div className="flex flex-row items-start sm:items-center gap-3">
          <div className="text-muted-foreground">{/* icon */}</div>
          <div className="-translate-y-1 sm:translate-y-0 font-medium">
            {/* title */}
          </div>
        </div>
        <div className="w-8" />
      </div>
      <div className="border rounded-b-2xl dark:bg-muted border-t-0 dark:border-zinc-700 p-4 sm:px-4 sm:py-4">
        <Markdown>{`${'...\n'}${segment.newFragment}${'\n...'}`}</Markdown>
      </div>
    </div>
  );
};

const AiEditingBlock = memo(PureAiEditingBlock, (prevProps, nextProps) => {
  if (!equal(prevProps.segment, nextProps.segment)) return false;
  if (prevProps.chatId !== nextProps.chatId) return false;

  return true;
});
