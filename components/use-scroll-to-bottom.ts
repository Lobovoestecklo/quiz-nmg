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
        for (const mutation of mutationsList) {
          // Only scroll if new nodes were added directly to the container
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Check if the added node is a direct child of the container
            let addedToContainer = false;
            mutation.addedNodes.forEach(node => {
              if (node.parentNode === container) {
                addedToContainer = true;
              }
            });

            if (addedToContainer) {
              end.scrollIntoView({ behavior: 'instant', block: 'end' });
              // Break after the first relevant mutation to avoid redundant scrolls
              break;
            }
          }
        }
      });

      observer.observe(container, {
        childList: true, // We only care about direct children being added/removed
        // subtree: false, // Remove subtree observation
        // attributes: false, // Remove attribute observation
        // characterData: false, // Remove characterData observation
      });

      return () => observer.disconnect();
    }
  }, []);

  return [containerRef, endRef];
}
