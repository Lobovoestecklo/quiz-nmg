import { useCallback, useEffect, useRef, type RefObject } from 'react';

const SCROLL_THRESHOLD_PX = 50; // Pixels from bottom to consider "at bottom"

export function useScrollToBottom<T extends HTMLElement>(): [
  RefObject<T>,
  RefObject<T>,
  () => void, // Type for the scrollToBottom function
] {
  const containerRef = useRef<T>(null);
  const endRef = useRef<T>(null);

  // Define the manual scroll function using useCallback for stable reference
  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const end = endRef.current;

    if (container && end) {
      // Initial scroll to bottom on mount
      end.scrollIntoView({ behavior: 'instant', block: 'end' });

      const observer = new MutationObserver((mutationsList) => {
        // Check if the container is scrolled near the bottom before deciding to scroll
        const isAtBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight <
          SCROLL_THRESHOLD_PX;

        if (!isAtBottom) {
          // User has scrolled up, don't force scroll on mutation
          return;
        }

        // If already at the bottom, scroll to keep it in view after content changes
        for (const mutation of mutationsList) {
          // Check if the mutation is a type that indicates new content
          if (
            mutation.type === 'childList' ||
            mutation.type === 'characterData'
          ) {
            // Relevant content change detected while user is at the bottom
            end.scrollIntoView({ behavior: 'instant', block: 'end' });
            // Break after the first relevant mutation
            break;
          }
        }
      });

      // Observe content changes
      observer.observe(container, {
        childList: true,
        subtree: true,
        characterData: true,
        // attributes: false, // Attribute changes usually don't warrant auto-scroll
      });

      return () => observer.disconnect();
    }
  }, []); // Empty dependency array ensures this runs only on mount

  return [containerRef, endRef, scrollToBottom];
}
