/**
 * Convert structured JSON educational material to markdown format
 * Handles the educational_material JSON structure with header and body blocks
 */

interface EducationalMaterialBlock {
  type: string;
  level?: number;
  text?: string;
  content?: string;
  formula?: string;
  code?: string;
  language?: string;
  caption?: string;
  items?: string[];
  title?: string;
  message?: string;
  references?: Array<{ number: number; citation: string }>;
}

interface EducationalMaterial {
  header?: {
    discipline?: string;
    topic?: string;
    professor?: string;
  };
  body: EducationalMaterialBlock[];
}

/**
 * Convert educational material JSON to markdown
 */
export function convertEducationalJSONToMarkdown(jsonContent: any): string {
  try {
    // Extract educational_material structure
    const material: EducationalMaterial = jsonContent.educational_material || jsonContent;
    
    if (!material || !material.body || !Array.isArray(material.body)) {
      throw new Error('Invalid educational material structure - missing body array');
    }

    let markdown = '';

    // Add header if present
    if (material.header) {
      markdown += `### **Material Didático de Engenharia**\n\n`;
      if (material.header.discipline) {
        markdown += `**Disciplina:** ${material.header.discipline}\n\n`;
      }
      if (material.header.topic) {
        markdown += `**Tópico:** ${material.header.topic}\n\n`;
      }
      if (material.header.professor) {
        markdown += `**Professor:** ${material.header.professor}\n\n`;
      }
      markdown += '\n';
    }

    // Convert body blocks to markdown
    for (const block of material.body) {
      markdown += convertBlockToMarkdown(block) + '\n\n';
    }

    return markdown.trim();
  } catch (error) {
    console.error('[JSON Converter] Failed to convert:', error);
    throw new Error(`Failed to convert educational JSON to markdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert individual content block to markdown
 */
function convertBlockToMarkdown(block: EducationalMaterialBlock): string {
  switch (block.type) {
    case 'heading':
      const level = block.level || 2;
      const hashes = '#'.repeat(level);
      return `${hashes} ${block.text || ''}`;

    case 'paragraph':
      return block.text || '';

    case 'formula':
    case 'latex':
      return `$$${block.formula || block.content || ''}$$`;

    case 'diagram':
    case 'mermaid':
      const caption = block.caption ? `${block.caption}\n\n` : '';
      const code = block.code || block.content || '';
      
      // ✅ PHASE 2 & 4: CRITICAL FIX - Add newlines FIRST, normalize spaces SECOND
      const normalizedCode = code
        // 1. FIRST: Add newlines where needed (do NOT collapse whitespace yet!)
        .replace(/\s*-->\s*/g, '\n    --> ')  // Standard arrows
        .replace(/\s*---\s*/g, '\n    --- ')  // Dashed lines
        .replace(/\s*==>\s*/g, '\n    ==> ')  // Bold arrows
        .replace(/\s*-\.-\s*/g, '\n    -.- ')  // Dotted lines
        .replace(/\s*-\.\s*/g, '\n    -. ')  // Dotted arrow start
        .replace(/\s*\.->\s*/g, ' .-> ')  // Dotted arrow end
        .replace(/\s*->\s*/g, '\n    -> ')  // Simple arrows
        .replace(/([A-Z0-9_]+)(\[[^\]]+\])/g, '\n    $1$2')  // Square node declarations
        .replace(/([A-Z0-9_]+)(\([^)]+\))/g, '\n    $1$2')  // Round node declarations
        .replace(/\s*(style\s+)/g, '\n    $1')  // Style statements
        .replace(/flowchart\s+(TD|LR|TB|BT|RL)(?=\s|$)/g, 'flowchart $1\n    ')  // Flowchart type
        .replace(/sequenceDiagram(?=\s|$)/g, 'sequenceDiagram\n    ')  // Sequence diagrams
        // 2. SECOND: Normalize spaces (do this AFTER adding newlines!)
        .replace(/ {2,}/g, ' ')  // Multiple spaces → single space
        .replace(/\n{3,}/g, '\n\n')  // Multiple newlines → max 2
        .trim();
        
      return `${caption}\`\`\`mermaid\n${normalizedCode}\n\`\`\``;

    case 'code':
      const lang = block.language || '';
      return `\`\`\`${lang}\n${block.code || block.content || ''}\n\`\`\``;

    case 'list':
    case 'bullet_list':
      if (!block.items || !Array.isArray(block.items)) return '';
      return block.items.map(item => `- ${item}`).join('\n');

    case 'numbered_list':
      if (!block.items || !Array.isArray(block.items)) return '';
      return block.items.map((item, i) => `${i + 1}. ${item}`).join('\n');

    case 'callout':
    case 'highlight':
    case 'note':
      const title = block.title ? `**${block.title}**\n\n` : '';
      return `> ${title}${block.message || block.content || block.text || ''}`;

    case 'table':
      // Simplified table handling - assumes content has markdown table
      return block.content || block.text || '';

    case 'references':
    case 'reference_section':
      let refs = '## 7. Fontes e Referências\n\n';
      if (block.references && Array.isArray(block.references)) {
        refs += block.references.map(ref => 
          `[${ref.number}] ${ref.citation}`
        ).join('\n');
      } else if (block.content) {
        refs += block.content;
      }
      return refs;

    default:
      // Fallback: try to extract any text content
      return block.text || block.content || '';
  }
}

/**
 * Detect if content is structured JSON educational material
 */
export function isEducationalJSON(content: string): boolean {
  try {
    const parsed = JSON.parse(content);
    return !!(parsed.educational_material || (parsed.body && Array.isArray(parsed.body)));
  } catch {
    return false;
  }
}
