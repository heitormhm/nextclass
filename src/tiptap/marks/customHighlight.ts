/**
 * CustomHighlight Mark - Multi-color text highlighting
 * Extends Tiptap's Highlight with custom colors
 */

import { Mark, mergeAttributes } from '@tiptap/core';

export interface CustomHighlightOptions {
  multicolor: boolean;
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customHighlight: {
      /**
       * Set a custom highlight
       */
      setCustomHighlight: (attributes?: { color?: string }) => ReturnType;
      /**
       * Toggle a custom highlight
       */
      toggleCustomHighlight: (attributes?: { color?: string }) => ReturnType;
      /**
       * Unset a custom highlight
       */
      unsetCustomHighlight: () => ReturnType;
    };
  }
}

export const CustomHighlight = Mark.create<CustomHighlightOptions>({
  name: 'customHighlight',

  addOptions() {
    return {
      multicolor: true,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      color: {
        default: '#fef3c7',
        parseHTML: element => element.getAttribute('data-color') || element.style.backgroundColor,
        renderHTML: attributes => {
          if (!attributes.color) {
            return {};
          }
          return {
            'data-color': attributes.color,
            style: `background-color: ${attributes.color}; padding: 2px 4px; border-radius: 3px;`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'mark[data-color]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCustomHighlight: attributes => ({ commands }) => {
        return commands.setMark(this.name, attributes);
      },
      toggleCustomHighlight: attributes => ({ commands }) => {
        return commands.toggleMark(this.name, attributes);
      },
      unsetCustomHighlight: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },
});
