/**
 * Centralized KaTeX Configuration
 * Used by: RichMaterialRenderer, AIChatPage, LecturePage, TeacherAIChatPage
 * 
 * Single source of truth for all KaTeX rendering across the application.
 */

export const katexOptions = {
  throwOnError: false,
  errorColor: '#cc0000',
  strict: false,
  trust: false,
  macros: {
    "\\f": "\\frac",
    "\\d": "\\dot",
  },
  displayMode: false,
};

export const remarkPlugins = [
  'remark-gfm',
  'remark-math',
] as const;

export const rehypePlugins = [
  ['rehype-katex', katexOptions],
] as const;
