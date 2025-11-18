/**
 * Legacy Migration Utility
 * Converts old HTML annotations to Tiptap JSON format
 */

import { convertStructuredJsonToTiptap } from './structuredJsonConverter';

/**
 * Detect if content is structured JSON format
 */
export const isStructuredJSON = (content: string): boolean => {
  if (!content || typeof content !== 'string') return false;
  
  // Check if it starts with { and contains expected keys
  const trimmed = content.trim();
  if (!trimmed.startsWith('{')) return false;
  
  try {
    const parsed = JSON.parse(content);
    return parsed.conteudo && Array.isArray(parsed.conteudo);
  } catch {
    return false;
  }
};

/**
 * Convert legacy HTML annotation to Tiptap JSON
 * Handles structured content markers and converts to proper nodes
 */
export const convertLegacyToTiptap = (htmlContent: string): any => {
  // Check if it's structured JSON first
  if (isStructuredJSON(htmlContent)) {
    const tiptapJson = convertStructuredJsonToTiptap(htmlContent);
    if (tiptapJson) {
      return tiptapJson;
    }
  }
  
  // Otherwise, return HTML as-is since Tiptap can parse HTML
  return htmlContent;
};

/**
 * Detect if content uses legacy structured markers
 */
export const isLegacyStructuredContent = (content: string): boolean => {
  const legacyMarkers = [
    '##CALLOUT',
    '##POSTIT',
    '##DIAGRAM',
    '##CONCEPT',
    '##TIP',
  ];
  
  return legacyMarkers.some(marker => content.includes(marker));
};

/**
 * Parse legacy structured markers to Tiptap commands
 */
export const parseLegacyMarkers = (content: string): any[] => {
  const commands: any[] = [];
  
  // Parse ##CALLOUT[type] markers
  const calloutRegex = /##CALLOUT\[(\w+)\](.*?)##ENDCALLOUT/gs;
  let match;
  
  while ((match = calloutRegex.exec(content)) !== null) {
    commands.push({
      type: 'calloutBox',
      attrs: {
        type: match[1].toLowerCase(),
        title: '',
      },
      content: match[2].trim(),
    });
  }
  
  return commands;
};
