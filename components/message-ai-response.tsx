import { getCustomScriptantinoFormat, parseModelResponse } from '@/lib/utils';
import equal from 'fast-deep-equal';
import { memo } from 'react';
import { Markdown } from './markdown';

const PureMessageAiResponse = ({ content }: { content: string }) => {
  const segments = parseModelResponse(content);
  console.log({ segments });
  if (!segments || segments.length === 0) {
    return <Markdown>{content}</Markdown>;
  }

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return (
            <Markdown key={index}>
              {getCustomScriptantinoFormat(segment.content)}
            </Markdown>
          );
        } else if (segment.type === 'editing') {
          return (
            <div key={'test-iddddd'} className="relative">
              <div
                className="size-full absolute top-0 left-0 rounded-xl z-10"
                aria-hidden="true"
              >
                <div className="w-full p-4 flex justify-end items-center">
                  <div className="absolute right-[9px] top-[13px] flex flex-row gap-2">
                    <div className="p-2 hover:dark:bg-zinc-700 rounded-md hover:bg-zinc-100 cursor-pointer">
                      copy
                    </div>
                    <div className="p-2 hover:dark:bg-zinc-700 rounded-md hover:bg-zinc-100 cursor-pointer">
                      review
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
