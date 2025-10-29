/**
 * ⚠️ PHASE 6: DEPRECATED - LEGACY ONLY
 * This utility converts structured JSON to markdown format.
 * No longer used in current material generation flow.
 * New materials are generated directly as markdown.
 * Kept only for backward compatibility.
 */

interface ContentBlock {
  tipo: string;
  texto?: string;
  titulo?: string;
  descricao?: string;
  definicao_mermaid?: string;
  tipo_grafico?: 'barras' | 'pizza' | 'linha';
  dados?: any[];
  componente?: string;
  props?: any;
  itens?: string[];
  [key: string]: any;
}

interface StructuredData {
  titulo_geral: string;
  conteudo: ContentBlock[];
}

export const structuredContentToMarkdown = (structuredData: StructuredData): string => {
  let markdown = `# ${structuredData.titulo_geral}\n\n`;
  
  structuredData.conteudo.forEach((bloco) => {
    switch (bloco.tipo) {
      case 'h2':
        markdown += `## ${bloco.texto}\n\n`;
        break;
      
      case 'h3':
        markdown += `### ${bloco.texto}\n\n`;
        break;
      
      case 'h4':
        markdown += `#### ${bloco.texto}\n\n`;
        break;
      
      case 'paragrafo':
        // Limpar HTML tags para texto puro
        const cleanText = bloco.texto?.replace(/<[^>]*>/g, '') || '';
        markdown += `${cleanText}\n\n`;
        break;
      
      case 'caixa_de_destaque':
        markdown += `> **📌 ${bloco.titulo}**\n`;
        const cleanBoxText = bloco.texto?.replace(/<[^>]*>/g, '') || '';
        markdown += `> ${cleanBoxText}\n\n`;
        break;
      
      case 'post_it':
        const textoLower = bloco.texto?.toLowerCase() || '';
        let icon = '💡';
        
        if (textoLower.includes('atenção') || textoLower.includes('cuidado')) {
          icon = '⚠️';
        } else if (textoLower.includes('dica')) {
          icon = '💡';
        } else if (textoLower.includes('pense') || textoLower.includes('reflexão')) {
          icon = '🤔';
        } else if (textoLower.includes('aplicação') || textoLower.includes('prática')) {
          icon = '🌍';
        }
        
        const cleanPostIt = bloco.texto?.replace(/<[^>]*>/g, '') || '';
        markdown += `> ${icon} **${cleanPostIt}**\n\n`;
        break;
      
      case 'fluxograma':
      case 'mapa_mental':
      case 'diagrama':
        const diagramIcons: Record<string, string> = { 
          fluxograma: '📊', 
          mapa_mental: '🧠', 
          diagrama: '📐' 
        };
        markdown += `### ${diagramIcons[bloco.tipo]} ${bloco.titulo}\n\n`;
        if (bloco.descricao) {
          markdown += `${bloco.descricao}\n\n`;
        }
        markdown += `\`\`\`mermaid\n${bloco.definicao_mermaid}\n\`\`\`\n\n`;
        break;
      
      case 'grafico':
        markdown += `### 📊 ${bloco.titulo}\n\n`;
        if (bloco.descricao) {
          markdown += `${bloco.descricao}\n\n`;
        }
        if (bloco.dados && Array.isArray(bloco.dados)) {
          markdown += `**Dados do gráfico:**\n\n`;
          bloco.dados.forEach((item: any) => {
            const keys = Object.keys(item);
            const values = Object.values(item);
            markdown += `- ${keys[0]}: ${values.join(', ')}\n`;
          });
          markdown += `\n`;
        }
        break;
      
      case 'componente_react':
        if (bloco.componente === 'Accordion') {
          markdown += `### ⚛️ ${bloco.titulo}\n\n`;
          if (bloco.descricao) {
            markdown += `${bloco.descricao}\n\n`;
          }
          bloco.props?.items?.forEach((item: any, i: number) => {
            markdown += `**${i + 1}. ${item.trigger}**\n\n`;
            const cleanAccordion = item.content?.replace(/<[^>]*>/g, '') || '';
            markdown += `${cleanAccordion}\n\n`;
          });
        }
        break;
      
      case 'referencias':
        markdown += `## 📚 ${bloco.titulo || 'Referências Bibliográficas'}\n\n`;
        bloco.itens?.forEach((ref: string) => {
          markdown += `- ${ref}\n`;
        });
        markdown += `\n`;
        break;
      
      default:
        console.warn(`Tipo de bloco não suportado: ${bloco.tipo}`);
    }
  });
  
  return markdown;
};
