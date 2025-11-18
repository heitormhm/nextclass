/**
 * Legacy Migration Utility
 * Converts old HTML annotations to Tiptap JSON format
 */

/**
 * Convert legacy HTML annotation to Tiptap JSON
 * Handles structured content markers and converts to proper nodes
 */
export const convertLegacyToTiptap = (htmlContent: string): string => {
  // For now, return HTML as-is since Tiptap can parse HTML
  // In future, can add more sophisticated parsing of custom markers
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
