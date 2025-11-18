/**
 * CalloutBox Node - Pedagogical callout boxes
 * Types: info, warning, success, error, tip, concept
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewProps } from '@tiptap/react';
import { CalloutBoxComponent } from '@/components/annotation/nodeviews/CalloutBoxComponent';

export interface CalloutBoxOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    calloutBox: {
      /**
       * Insert a callout box
       */
      setCalloutBox: (attrs?: { type?: string; title?: string }) => ReturnType;
    };
  }
}

export const CalloutBox = Node.create<CalloutBoxOptions>({
  name: 'calloutBox',
  group: 'block',
  content: 'block+',
  
  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: element => element.getAttribute('data-type') || 'info',
        renderHTML: attributes => ({
          'data-type': attributes.type,
        }),
      },
      title: {
        default: '',
        parseHTML: element => element.getAttribute('data-title') || '',
        renderHTML: attributes => ({
          'data-title': attributes.title,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-callout-box]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-callout-box': '' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutBoxComponent);
  },

  addCommands() {
    return {
      setCalloutBox: (attrs = {}) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            type: attrs.type || 'info',
            title: attrs.title || '',
          },
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Digite seu conteúdo aqui...' }],
            },
          ],
        });
      },
    };
  },
});
