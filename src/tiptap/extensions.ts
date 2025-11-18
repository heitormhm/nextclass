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
import { CalloutBox } from './nodes/calloutBox';
import { CommentHighlight } from './marks/commentHighlight';
import { CustomHighlight } from './marks/customHighlight';
import { EnhancedImage } from './nodes/enhancedImage';

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
  
  // Custom Nodes
  CalloutBox,
  
  // Custom Marks
  CommentHighlight,
];
