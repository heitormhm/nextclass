/**
 * Structured JSON Converter
 * Converts legacy structured JSON format to Tiptap-compatible JSON
 */

interface StructuredContent {
  titulo_geral?: string;
  conteudo: Array<{
    tipo: string;
    texto?: string;
    itens?: string[];
    nivel?: number;
  }>;
}

/**
 * Convert legacy structured JSON to Tiptap JSON format
 */
export const convertStructuredJsonToTiptap = (content: string): any => {
  try {
    const parsed: StructuredContent = JSON.parse(content);
    
    if (!parsed.conteudo || !Array.isArray(parsed.conteudo)) {
      return null;
    }

    const nodes: any[] = [];

    // Add title as heading if exists
    if (parsed.titulo_geral) {
      nodes.push({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: parsed.titulo_geral }],
      });
    }

    // Convert content items
    parsed.conteudo.forEach((item) => {
      switch (item.tipo) {
        case 'paragrafo':
          if (item.texto) {
            nodes.push({
              type: 'paragraph',
              content: [{ type: 'text', text: item.texto }],
            });
          }
          break;

        case 'h2':
          if (item.texto) {
            nodes.push({
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: item.texto }],
            });
          }
          break;

        case 'h3':
          if (item.texto) {
            nodes.push({
              type: 'heading',
              attrs: { level: 3 },
              content: [{ type: 'text', text: item.texto }],
            });
          }
          break;

        case 'lista':
          if (item.itens && item.itens.length > 0) {
            nodes.push({
              type: 'bulletList',
              content: item.itens.map((itemText) => ({
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: itemText }],
                  },
                ],
              })),
            });
          }
          break;

        case 'lista_numerada':
          if (item.itens && item.itens.length > 0) {
            nodes.push({
              type: 'orderedList',
              content: item.itens.map((itemText) => ({
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: itemText }],
                  },
                ],
              })),
            });
          }
          break;

        default:
          // Fallback to paragraph for unknown types
          if (item.texto) {
            nodes.push({
              type: 'paragraph',
              content: [{ type: 'text', text: item.texto }],
            });
          }
      }
    });

    return {
      type: 'doc',
      content: nodes.length > 0 ? nodes : [{ type: 'paragraph' }],
    };
  } catch (error) {
    console.error('Error converting structured JSON:', error);
    return null;
  }
};

/**
 * Convert Tiptap JSON back to legacy structured format (for backward compatibility)
 */
export const convertTiptapToStructuredJson = (tiptapJson: any): string => {
  try {
    if (!tiptapJson || !tiptapJson.content) {
      return '';
    }

    const conteudo: any[] = [];
    let titulo_geral = '';

    tiptapJson.content.forEach((node: any, index: number) => {
      if (node.type === 'heading' && node.attrs.level === 1 && index === 0) {
        // First H1 becomes titulo_geral
        titulo_geral = node.content?.[0]?.text || '';
      } else if (node.type === 'heading') {
        const level = node.attrs.level;
        conteudo.push({
          tipo: level === 2 ? 'h2' : 'h3',
          texto: node.content?.[0]?.text || '',
        });
      } else if (node.type === 'paragraph') {
        const text = node.content?.map((c: any) => c.text).join('') || '';
        if (text) {
          conteudo.push({
            tipo: 'paragrafo',
            texto: text,
          });
        }
      } else if (node.type === 'bulletList') {
        const itens = node.content?.map((listItem: any) => 
          listItem.content?.[0]?.content?.[0]?.text || ''
        ).filter(Boolean) || [];
        if (itens.length > 0) {
          conteudo.push({
            tipo: 'lista',
            itens: itens,
          });
        }
      } else if (node.type === 'orderedList') {
        const itens = node.content?.map((listItem: any) => 
          listItem.content?.[0]?.content?.[0]?.text || ''
        ).filter(Boolean) || [];
        if (itens.length > 0) {
          conteudo.push({
            tipo: 'lista_numerada',
            itens: itens,
          });
        }
      }
    });

    return JSON.stringify({
      titulo_geral: titulo_geral || 'Documento sem título',
      conteudo: conteudo,
    }, null, 2);
  } catch (error) {
    console.error('Error converting to structured JSON:', error);
    return '';
  }
};
