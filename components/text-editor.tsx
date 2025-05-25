'use client';

import { exampleSetup } from 'prosemirror-example-setup';
import { inputRules } from 'prosemirror-inputrules';
import { EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import React, { memo, useEffect, useRef } from 'react';

import type { Suggestion } from '@/lib/db/schema';
import {
  documentSchema,
  handleTransaction,
  headingRule,
} from '@/lib/editor/config';
import {
  buildContentFromDocument,
  buildDocumentFromContent,
  createDecorations,
  findTextPositionInDoc,
} from '@/lib/editor/functions';
import {
  projectWithPositions,
  suggestionsPlugin,
  suggestionsPluginKey,
} from '@/lib/editor/suggestions';
import { useArtifact } from '@/hooks/use-artifact';

type EditorProps = {
  content: string;
  onSaveContent: (updatedContent: string, debounce: boolean) => void;
  status: 'streaming' | 'idle';
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  suggestions: Array<Suggestion>;
  setContent?: (updatedContent: string) => void;
};

function PureEditor({
  content,
  onSaveContent,
  suggestions,
  status,
  setContent,
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const { artifact } = useArtifact();
  const editingMetadata = artifact?.editingMetadata;

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      setContent?.(content);
      const state = EditorState.create({
        doc: buildDocumentFromContent(content),
        plugins: [
          ...exampleSetup({ schema: documentSchema, menuBar: false }),
          inputRules({
            rules: [
              headingRule(1),
              headingRule(2),
              headingRule(3),
              headingRule(4),
              headingRule(5),
              headingRule(6),
            ],
          }),
          suggestionsPlugin,
        ],
      });

      editorRef.current = new EditorView(containerRef.current, {
        state,
      });
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
    // NOTE: we only want to run this effect once
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setProps({
        dispatchTransaction: (transaction) => {
          handleTransaction({
            transaction,
            editorRef,
            onSaveContent,
            setContent,
          });
        },
      });
    }
  }, [onSaveContent, setContent]);

  useEffect(() => {
    if (editorRef.current && content) {
      const currentContent = buildContentFromDocument(
        editorRef.current.state.doc,
      );

      if (status === 'streaming') {
        const newDocument = buildDocumentFromContent(content);

        const transaction = editorRef.current.state.tr.replaceWith(
          0,
          editorRef.current.state.doc.content.size,
          newDocument.content,
        );

        transaction.setMeta('no-save', true);
        editorRef.current.dispatch(transaction);
        return;
      }

      if (currentContent !== content) {
        setContent?.(content);
        const newDocument = buildDocumentFromContent(content);

        const transaction = editorRef.current.state.tr.replaceWith(
          0,
          editorRef.current.state.doc.content.size,
          newDocument.content,
        );

        transaction.setMeta('no-save', true);
        editorRef.current.dispatch(transaction);
      }
    }
  }, [content, status, setContent]);

  useEffect(() => {
    if (editorRef.current?.state.doc && content) {
      const projectedSuggestions = projectWithPositions(
        editorRef.current.state.doc,
        suggestions,
      ).filter(
        (suggestion) => suggestion.selectionStart && suggestion.selectionEnd,
      );

      const decorations = createDecorations(
        projectedSuggestions,
        editorRef.current,
      );

      const transaction = editorRef.current.state.tr;
      transaction.setMeta(suggestionsPluginKey, { decorations });
      editorRef.current.dispatch(transaction);
    }
  }, [suggestions, content]);

  // Scroll to text effect
  useEffect(() => {
    if (
      editorRef.current?.state.doc &&
      content &&
      editingMetadata?.scrollToText &&
      status === 'idle' &&
      artifact.isVisible
    ) {
      console.log({ editingMetadata });
      const textToFindTest = editingMetadata?.scrollToText;
      const textToFind = 'Ничего . Мне нравится';
      const positions: any = findTextPositionInDoc(
        editorRef.current.state.doc,
        textToFind,
      );

      console.log({ positions });

      if (positions) {
        // Create a text selection at the found position
        const selection = TextSelection.create(
          editorRef.current.state.doc,
          positions.start,
          positions.end,
        );

        // Apply the selection
        const transaction = editorRef.current.state.tr.setSelection(selection);
        editorRef.current.dispatch(transaction);

        setTimeout(() => {
          if (editorRef.current) {
            // Find the direct parent scroll container of the editor
            // This should be within the artifact component
            const editorContainer =
              containerRef.current?.closest('.overflow-y-scroll');

            if (editorContainer) {
              // Get coordinates at the position
              const coords = editorRef.current.coordsAtPos(positions.start);

              // Calculate the top position relative to the editor container
              const editorContainerRect =
                editorContainer.getBoundingClientRect();
              const topRelativeToContainer =
                coords.top -
                editorContainerRect.top +
                editorContainer.scrollTop;

              // Scroll only the editor container
              editorContainer.scrollTop =
                topRelativeToContainer - editorContainer.clientHeight / 2;
            }
          }
        }, 100);
      }
    }
  }, [content, editingMetadata, status, artifact.isVisible]);

  return (
    <div className="relative prose dark:prose-invert" ref={containerRef} />
  );
}

function areEqual(prevProps: EditorProps, nextProps: EditorProps) {
  return (
    prevProps.suggestions === nextProps.suggestions &&
    prevProps.currentVersionIndex === nextProps.currentVersionIndex &&
    prevProps.isCurrentVersion === nextProps.isCurrentVersion &&
    !(prevProps.status === 'streaming' && nextProps.status === 'streaming') &&
    prevProps.content === nextProps.content &&
    prevProps.onSaveContent === nextProps.onSaveContent &&
    prevProps.setContent === nextProps.setContent
  );
}

export const Editor = memo(PureEditor, areEqual);
