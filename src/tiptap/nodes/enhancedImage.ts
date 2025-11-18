/**
 * EnhancedImage Node - Images with captions
 * Extends Tiptap's Image with caption support
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewProps } from '@tiptap/react';
import { EnhancedImageComponent } from '@/components/annotation/nodeviews/EnhancedImageComponent';

export interface EnhancedImageOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    enhancedImage: {
      /**
       * Insert an enhanced image
       */
      setEnhancedImage: (options: { src: string; alt?: string; caption?: string }) => ReturnType;
    };
  }
}

export const EnhancedImage = Node.create<EnhancedImageOptions>({
  name: 'enhancedImage',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: element => element.querySelector('img')?.getAttribute('src'),
      },
      alt: {
        default: null,
        parseHTML: element => element.querySelector('img')?.getAttribute('alt'),
      },
      caption: {
        default: '',
        parseHTML: element => element.querySelector('.image-caption')?.textContent || '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-enhanced-image]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['figure', mergeAttributes(HTMLAttributes, { 'data-enhanced-image': '' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EnhancedImageComponent);
  },

  addCommands() {
    return {
      setEnhancedImage: options => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },
});
