export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  type: string;
}

export const validateAnnotationMarkers = (content: string): ValidationError[] => {
  const errors: ValidationError[] = [];
  const lines = content.split('\n');
  
  // Track open tags
  const openTags: Array<{ tag: string; line: number; column: number }> = [];
  
  // Markers that require closing tags
  const pairedMarkers = [
    'CALLOUT-INFO',
    'CALLOUT-WARNING',
    'CALLOUT-SUCCESS',
    'CALLOUT-ERROR',
    'POSTIT-YELLOW',
    'COLOR-RED',
    'COLOR-BLUE',
    'COLOR-GREEN',
    'DIAGRAM-MERMAID',
    'CHART-BARS',
    'ACCORDION',
  ];
  
  lines.forEach((line, lineIndex) => {
    const lineNumber = lineIndex + 1;
    
    // Check for opening tags
    pairedMarkers.forEach((marker) => {
      const openRegex = new RegExp(`\\[${marker}(?:\\s+[^\\]]*)?\\]`, 'g');
      let match;
      
      while ((match = openRegex.exec(line)) !== null) {
        openTags.push({
          tag: marker,
          line: lineNumber,
          column: match.index + 1,
        });
      }
    });
    
    // Check for closing tags
    pairedMarkers.forEach((marker) => {
      const closeRegex = new RegExp(`\\[/${marker}\\]`, 'g');
      let match;
      
      while ((match = closeRegex.exec(line)) !== null) {
        const lastOpen = openTags.findIndex((t) => t.tag === marker);
        
        if (lastOpen === -1) {
          errors.push({
            line: lineNumber,
            column: match.index + 1,
            message: `Closing tag [/${marker}] found without matching opening tag`,
            severity: 'error',
            type: 'unmatched-closing-tag',
          });
        } else {
          openTags.splice(lastOpen, 1);
        }
      }
    });
    
    // Check for very long lines (warning)
    if (line.length > 200) {
      errors.push({
        line: lineNumber,
        column: 200,
        message: 'Line is very long. Consider breaking it into multiple lines for better readability',
        severity: 'warning',
        type: 'long-line',
      });
    }
    
    // Check for potential JSON errors in CHART-BARS
    if (line.includes('[CHART-BARS]')) {
      const jsonStart = lineIndex;
      let jsonContent = '';
      let foundEnd = false;
      
      for (let i = lineIndex + 1; i < lines.length; i++) {
        if (lines[i].includes('[/CHART-BARS]')) {
          foundEnd = true;
          break;
        }
        jsonContent += lines[i];
      }
      
      if (foundEnd && jsonContent.trim()) {
        try {
          JSON.parse(jsonContent);
        } catch (e) {
          errors.push({
            line: jsonStart + 1,
            column: 1,
            message: `Invalid JSON in CHART-BARS: ${e instanceof Error ? e.message : 'Unknown error'}`,
            severity: 'error',
            type: 'invalid-json',
          });
        }
      }
    }
  });
  
  // Check for unclosed tags
  openTags.forEach((tag) => {
    errors.push({
      line: tag.line,
      column: tag.column,
      message: `Opening tag [${tag.tag}] at line ${tag.line} is never closed`,
      severity: 'error',
      type: 'unclosed-tag',
    });
  });
  
  return errors.sort((a, b) => a.line - b.line);
};

export const formatValidationError = (error: ValidationError): string => {
  const icon = error.severity === 'error' ? '❌' : '⚠️';
  return `${icon} Line ${error.line}, Col ${error.column}: ${error.message}`;
};
