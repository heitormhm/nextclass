/**
 * Post-It Plugin for Tiptap
 * Manages floating comment annotations
 */

import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface PostIt {
  id: string;
  commentId: string;
  content: string;
  position: number;
  createdAt: number;
}

export interface PostItPluginState {
  postIts: PostIt[];
}

export const postItPluginKey = new PluginKey<PostItPluginState>('postItPlugin');

/**
 * Create the Post-It plugin
 */
export const createPostItPlugin = () => {
  return new Plugin<PostItPluginState>({
    key: postItPluginKey,

    state: {
      init() {
        return {
          postIts: [],
        };
      },

      apply(tr, state) {
        // Get meta transactions for post-it operations
        const meta = tr.getMeta(postItPluginKey);
        
        if (meta) {
          if (meta.action === 'add') {
            return {
              postIts: [...state.postIts, meta.postIt],
            };
          }
          
          if (meta.action === 'update') {
            return {
              postIts: state.postIts.map(p => 
                p.id === meta.id ? { ...p, ...meta.updates } : p
              ),
            };
          }
          
          if (meta.action === 'remove') {
            return {
              postIts: state.postIts.filter(p => p.id !== meta.id),
            };
          }
        }

        // Map positions through document changes
        if (tr.docChanged) {
          return {
            postIts: state.postIts.map(postIt => ({
              ...postIt,
              position: tr.mapping.map(postIt.position),
            })),
          };
        }

        return state;
      },
    },

    props: {
      decorations(state) {
        const pluginState = postItPluginKey.getState(state);
        if (!pluginState) return DecorationSet.empty;

        const decorations = pluginState.postIts.map(postIt => 
          Decoration.widget(postIt.position, () => {
            const span = document.createElement('span');
            span.className = 'post-it-marker';
            span.setAttribute('data-post-it-id', postIt.id);
            span.textContent = '📝';
            span.style.cssText = 'cursor: pointer; margin: 0 2px; font-size: 14px;';
            return span;
          })
        );

        return DecorationSet.create(state.doc, decorations);
      },
    },
  });
};

/**
 * Helper functions for post-it operations
 */
export const postItHelpers = {
  addPostIt: (postIt: PostIt) => (view: any) => {
    const tr = view.state.tr.setMeta(postItPluginKey, {
      action: 'add',
      postIt,
    });
    view.dispatch(tr);
  },

  updatePostIt: (id: string, updates: Partial<PostIt>) => (view: any) => {
    const tr = view.state.tr.setMeta(postItPluginKey, {
      action: 'update',
      id,
      updates,
    });
    view.dispatch(tr);
  },

  removePostIt: (id: string) => (view: any) => {
    const tr = view.state.tr.setMeta(postItPluginKey, {
      action: 'remove',
      id,
    });
    view.dispatch(tr);
  },

  getPostIts: (state: any): PostIt[] => {
    const pluginState = postItPluginKey.getState(state);
    return pluginState?.postIts || [];
  },
};
