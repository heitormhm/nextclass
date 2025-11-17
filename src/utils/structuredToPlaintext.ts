// Convert structured JSON content to marked plaintext for editing
export const structuredToPlaintext = (structuredData: any): string => {
  if (!structuredData || !structuredData.conteudo) {
    return '';
  }

  const blocks: string[] = [];
  
  // Add main title if present
  if (structuredData.titulo_geral || structuredData.titulo) {
    blocks.push(`# ${structuredData.titulo_geral || structuredData.titulo}\n`);
  }

  structuredData.conteudo.forEach((block: any) => {
    switch (block.tipo) {
      case 'titulo':
      case 'h1':
        const h1Text = block.texto || block.conteudo || '';
        blocks.push(`# ${h1Text}\n`);
        break;
        
      case 'h2':
        const h2Text = block.texto || block.conteudo || '';
        blocks.push(`## ${h2Text}\n`);
        break;
        
      case 'h3':
        const h3Text = block.texto || block.conteudo || '';
        blocks.push(`### ${h3Text}\n`);
        break;
        
      case 'paragrafo':
        const paraText = block.texto || block.conteudo || '';
        blocks.push(`${paraText}\n`);
        break;
        
      case 'lista':
        blocks.push('[LIST-BULLET]');
        if (block.itens && Array.isArray(block.itens)) {
          block.itens.forEach((item: any) => {
            const itemText = typeof item === 'string' ? item : (item.texto || item.conteudo || '');
            blocks.push(`- ${itemText}`);
          });
        }
        blocks.push('');
        break;
        
      case 'lista_numerada':
        blocks.push('[LIST-NUMBER]');
        if (block.itens && Array.isArray(block.itens)) {
          block.itens.forEach((item: any, index: number) => {
            const itemText = typeof item === 'string' ? item : (item.texto || item.conteudo || '');
            blocks.push(`${index + 1}. ${itemText}`);
          });
        }
        blocks.push('');
        break;
        
      case 'callout':
        const calloutType = (block.tipo_callout || 'info').toUpperCase();
        const calloutText = block.conteudo || block.texto || '';
        blocks.push(`[CALLOUT-${calloutType}]`);
        blocks.push(calloutText);
        blocks.push(`[/CALLOUT-${calloutType}]\n`);
        break;
        
      case 'postit':
        const postitText = block.conteudo || block.texto || '';
        blocks.push(`[POSTIT-YELLOW]`);
        blocks.push(postitText);
        blocks.push(`[/POSTIT-YELLOW]\n`);
        break;
        
      case 'texto_colorido':
        const color = (block.cor || 'red').toUpperCase();
        const colorText = block.texto || block.conteudo || '';
        blocks.push(`[COLOR-${color}]${colorText}[/COLOR-${color}]\n`);
        break;
        
      case 'diagrama':
        if (block.tipo_diagrama === 'mermaid' && block.codigo_diagrama) {
          blocks.push('[DIAGRAM-MERMAID]');
          blocks.push(block.codigo_diagrama);
          blocks.push('[/DIAGRAM-MERMAID]\n');
        }
        break;
        
      case 'grafico':
        if (block.tipo_grafico === 'barras' && block.dados_grafico) {
          blocks.push('[CHART-BARS]');
          blocks.push(JSON.stringify(block.dados_grafico, null, 2));
          blocks.push('[/CHART-BARS]\n');
        }
        break;
        
      case 'accordion':
        const accordionTitle = block.titulo_acordeao || 'Accordion';
        blocks.push(`[ACCORDION title="${accordionTitle}"]`);
        if (block.itens_acordeao && Array.isArray(block.itens_acordeao)) {
          block.itens_acordeao.forEach((item: any) => {
            const itemText = typeof item === 'string' ? item : (item.texto || item.conteudo || '');
            blocks.push(itemText);
          });
        }
        blocks.push('[/ACCORDION]\n');
        break;
        
      default:
        // Fallback for unknown types
        const fallbackText = block.texto || block.conteudo || '';
        if (fallbackText) {
          blocks.push(`${fallbackText}\n`);
        }
    }
  });

  return blocks.join('\n');
};
