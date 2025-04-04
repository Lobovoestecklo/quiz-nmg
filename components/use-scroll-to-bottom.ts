import { useEffect, useRef, type RefObject } from 'react';

export function useScrollToBottom<T extends HTMLElement>(): [
  RefObject<T>,
  RefObject<T>,
] {
  const containerRef = useRef<T>(null);
  const endRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    const end = endRef.current;

    if (container && end) {
      const observer = new MutationObserver((mutationsList) => {
        // Check if any mutation happened that might require scrolling
        for (const mutation of mutationsList) {
          if (
            mutation.type === 'childList' ||
            mutation.type === 'characterData'
          ) {
            // Scroll to bottom on relevant changes within the container or its subtree
            end.scrollIntoView({ behavior: 'instant', block: 'end' });
            // Break after the first relevant mutation to avoid redundant scrolls
            break;
          }
        }
      });

      // Observe changes in child nodes, subtree, and character data
      observer.observe(container, {
        childList: true,
        subtree: true, // Observe changes within the entire subtree
        characterData: true, // Observe changes to text nodes
        // attributes: false, // Still likely don't need attribute changes
      });

      return () => observer.disconnect();
    }
  }, []);

  return [containerRef, endRef];
}
