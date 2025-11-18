/**
 * Central Tiptap Extensions Registry
 * Following "Document of Canvases" architecture
 */

import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { BubbleMenu } from '@tiptap/extension-bubble-menu';
import { Extension } from '@tiptap/core';
import { CalloutBox } from './nodes/calloutBox';
import { CommentHighlight } from './marks/commentHighlight';
import { CustomHighlight } from './marks/customHighlight';
import { EnhancedImage } from './nodes/enhancedImage';
import { createPostItPlugin } from './plugins/postItPlugin';

// Wrap the post-it plugin as a Tiptap Extension
const PostItExtension = Extension.create({
  name: 'postIt',
  
  addProseMirrorPlugins() {
    return [createPostItPlugin()];
  },
});

/**
 * Get all Tiptap extensions for the Pedagogical Editor
 * Configured for teacher annotation use cases
 */
export const getPedagogicalExtensions = () => [
  // Core functionality
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3, 4],
    },
  }),

  // Text styling
  TextStyle,
  Color,
  Underline,
  
  // Highlighting
  Highlight.configure({
    multicolor: true,
  }),
  CustomHighlight,
  
  // Images
  Image,
  EnhancedImage,
  
  // Placeholder
  Placeholder.configure({
    placeholder: 'Comece a escrever sua anotação pedagógica...',
  }),
  
  // Bubble Menu
  BubbleMenu.configure({
    pluginKey: 'bubbleMenu',
    shouldShow: ({ editor, view, state, from, to }) => {
      // Only show when there's an actual text selection
      return from !== to && !state.selection.empty;
    },
  }),
  
  // Custom Nodes
  CalloutBox,
  
  // Custom Marks
  CommentHighlight,
  
  // Custom Extensions with Plugins
  PostItExtension,
];
