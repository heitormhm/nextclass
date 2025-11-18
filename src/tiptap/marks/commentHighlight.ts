/**
 * CommentHighlight Mark - For Post-It annotation system
 * Highlights text that has an associated floating comment
 */

import { Mark, mergeAttributes } from '@tiptap/core';

export interface CommentHighlightOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    commentHighlight: {
      /**
       * Set a comment highlight
       */
      setCommentHighlight: (commentId: string) => ReturnType;
      /**
       * Unset a comment highlight
       */
      unsetCommentHighlight: () => ReturnType;
    };
  }
}

export const CommentHighlight = Mark.create<CommentHighlightOptions>({
  name: 'commentHighlight',
  
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: element => element.getAttribute('data-comment-id'),
        renderHTML: attributes => {
          if (!attributes.commentId) {
            return {};
          }
          return {
            'data-comment-id': attributes.commentId,
          };
        },
      },
      color: {
        default: '#fef3c7',
        parseHTML: element => element.getAttribute('data-color'),
        renderHTML: attributes => ({
          'data-color': attributes.color,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'mark[data-comment-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'mark',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'comment-highlight cursor-pointer',
        style: `background-color: ${HTMLAttributes['data-color'] || '#fef3c7'}; padding: 2px 4px; border-radius: 4px;`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCommentHighlight: (commentId: string) => ({ commands }) => {
        return commands.setMark(this.name, { commentId });
      },
      unsetCommentHighlight: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },
});
