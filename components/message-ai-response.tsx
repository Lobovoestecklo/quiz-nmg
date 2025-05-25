'use client';

import { getCustomScriptantinoFormat, parseModelResponse } from '@/lib/utils';
import equal from 'fast-deep-equal';
import { memo } from 'react';
import { Markdown } from './markdown';
import { useArtifact } from '@/hooks/use-artifact';

const PureMessageAiResponse = ({ content }: { content: string }) => {
  const segments = parseModelResponse(content);
  console.log({ segments });
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
            <AiEditingBlock key={`ai-response-${index}`} segment={segment} />
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
    // if (prevProps.message.id !== nextProps.message.id) return false;
    // if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
    // if (!equal(prevProps.vote, nextProps.vote)) return false;

    return true;
  },
);

const PureAiEditingBlock = ({ segment }: { segment: any }) => {
  const { setArtifact } = useArtifact();
  const onApply = async () => {
    console.log({ segment });
    // TODO: pass real chatId
    const chatId = '1172794d-ec95-42f9-b36f-70cbb33f5cc9';
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

      setArtifact({
        documentId: document.documentId,
        kind: document.kind,
        content: document.content,
        title: document.title,
        isVisible: true,
        status: 'idle',
        boundingBox: {
          top: 0,
          left: 0,
          width: 0,
          height: 0,
        },
      });
    } catch (error) {
      console.error('Error checking for documents:', error);
    }
  };

  return (
    <div className="relative">
      <div
        className="size-full absolute top-0 left-0 rounded-xl z-10"
        aria-hidden="true"
      >
        <div className="w-full p-4 flex justify-end items-center">
          <div className="absolute right-[9px] top-[13px] flex flex-row gap-2">
            <div className="p-2 hover:dark:bg-zinc-700 rounded-md hover:bg-zinc-100 cursor-pointer">
              Copy
            </div>
            <div
              className="p-2 hover:dark:bg-zinc-700 rounded-md hover:bg-zinc-100 cursor-pointer"
              onClick={onApply}
            >
              Apply
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 border rounded-t-2xl flex flex-row gap-2 items-start sm:items-center justify-between dark:bg-muted border-b-0 dark:border-zinc-700">
        <div className="flex flex-row items-start sm:items-center gap-3">
          <div className="text-muted-foreground">icon</div>
          <div className="-translate-y-1 sm:translate-y-0 font-medium">
            title
          </div>
        </div>
        <div className="w-8" />
      </div>
      <div className="border rounded-b-2xl dark:bg-muted border-t-0 dark:border-zinc-700 p-4 sm:px-4 sm:py-4">
        <Markdown>{segment.newFragment}</Markdown>
      </div>
    </div>
  );
};

const AiEditingBlock = memo(PureAiEditingBlock, (prevProps, nextProps) => {
  if (!equal(prevProps.segment, nextProps.segment)) return false;

  return true;
});
