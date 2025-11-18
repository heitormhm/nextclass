/**
 * Post-It Plugin - Floating annotation system
 * Creates floating sticky notes attached to highlighted text
 */

import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface PostIt {
  id: string;
  commentId: string;
  text: string;
  position: { x: number; y: number };
  color: string;
  timestamp: number;
}

export interface PostItPluginState {
  postIts: PostIt[];
}

export const postItPluginKey = new PluginKey<PostItPluginState>('postItPlugin');

export const postItPlugin = new Plugin<PostItPluginState>({
  key: postItPluginKey,

  state: {
    init() {
      return {
        postIts: [],
      };
    },
    apply(tr, value) {
      const meta = tr.getMeta(postItPluginKey);
      if (meta) {
        return meta;
      }
      return value;
    },
  },

  props: {
    decorations(state) {
      const pluginState = postItPluginKey.getState(state);
      if (!pluginState) return DecorationSet.empty;

      const decorations: Decoration[] = [];
      
      // Create decorations for each post-it
      pluginState.postIts.forEach(postIt => {
        // Find the mark with this commentId
        state.doc.descendants((node, pos) => {
          if (node.marks) {
            const commentMark = node.marks.find(
              mark => mark.type.name === 'commentHighlight' && mark.attrs.commentId === postIt.commentId
            );
            if (commentMark) {
              decorations.push(
                Decoration.widget(pos + node.nodeSize, () => {
                  const widget = document.createElement('div');
                  widget.className = 'post-it-widget';
                  widget.style.cssText = `
                    position: absolute;
                    left: ${postIt.position.x}px;
                    top: ${postIt.position.y}px;
                    background: ${postIt.color};
                    padding: 8px 12px;
                    border-radius: 8px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    font-size: 12px;
                    max-width: 200px;
                    z-index: 1000;
                  `;
                  widget.textContent = postIt.text;
                  return widget;
                })
              );
            }
          }
        });
      });

      return DecorationSet.create(state.doc, decorations);
    },
  },
});
