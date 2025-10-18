import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { loadUnicodeFont } from './unicodeFont';
import React from 'react';
import ReactDOM from 'react-dom/client';

interface VisualPDFOptions {
  structuredData: StructuredData;
  title: string;
  logoSvg?: string;
}

interface StructuredData {
  titulo_geral: string;
  conteudo: ContentBlock[];
}

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

interface RenderStrategy {
  renderAsImage: boolean;
  expandAccordions?: boolean;
}

interface PDFStats {
  imagesCaptured: number;
  nativeTextBlocks: number;
  mermaidDiagrams: number;
  charts: number;
  postIts: number;
  totalPages: number;
  captureTime: number;
}

interface PDFResult {
  success: boolean;
  error?: string;
  warnings?: string[];
  stats?: PDFStats;
}

// Estratégias de renderização por tipo de bloco
const RENDER_STRATEGIES: Record<string, RenderStrategy> = {
  'h2': { renderAsImage: false },
  'h3': { renderAsImage: false },
  'h4': { renderAsImage: false },
  'paragrafo': { renderAsImage: false },
  'post_it': { renderAsImage: true },
  'caixa_de_destaque': { renderAsImage: true },
  'fluxograma': { renderAsImage: true },
  'mapa_mental': { renderAsImage: true },
  'diagrama': { renderAsImage: true },
  'grafico': { renderAsImage: true },
  'componente_react': { renderAsImage: true, expandAccordions: true },
  'referencias': { renderAsImage: false }
};

export const generateVisualPDF = async (options: VisualPDFOptions): Promise<PDFResult> => {
  const startTime = Date.now();
  const stats: PDFStats = {
    imagesCaptured: 0,
    nativeTextBlocks: 0,
    mermaidDiagrams: 0,
    charts: 0,
    postIts: 0,
    totalPages: 1,
    captureTime: 0
  };
  const warnings: string[] = [];

  try {
    console.log('🎨 [VisualPDF] Iniciando geração...');
    
    // Criar PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Carregar fonte Unicode
    const fontBase64 = await loadUnicodeFont();
    pdf.addFileToVFS('DejaVuSans.ttf', fontBase64);
    pdf.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
    
    // Dimensões da página
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (2 * margin);
    let currentY = margin;

    // CABEÇALHO COM IDENTIDADE NEXTCLASS
    const logoY = currentY;
    
    // Logo NextClass - círculo rosa
    pdf.setFillColor(255, 70, 130); // Rosa #FF4682
    pdf.circle(pageWidth / 2 - 15, logoY, 3, 'F');
    pdf.setFillColor(255, 113, 160); // Rosa claro #FF71A0
    pdf.circle(pageWidth / 2 - 13, logoY - 1, 2.5, 'F');
    
    // Texto "NEXTCLASS"
    pdf.setFontSize(16);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(63, 45, 175); // Roxo #3F2DAF
    pdf.text('NEXTCLASS', pageWidth / 2 - 8, logoY + 1);
    
    currentY += 10;
    
    // Título principal
    pdf.setFontSize(22);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(63, 45, 175); // Roxo escuro
    pdf.text(options.title, pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;

    // Linha decorativa com gradiente rosa→roxo
    const lineSegments = 20;
    const lineWidth = pageWidth - (2 * margin);
    const segmentWidth = lineWidth / lineSegments;
    
    for (let i = 0; i < lineSegments; i++) {
      const ratio = i / lineSegments;
      const r = Math.round(255 - (255 - 63) * ratio);
      const g = Math.round(70 - (70 - 45) * ratio);
      const b = Math.round(130 + (175 - 130) * ratio);
      
      pdf.setDrawColor(r, g, b);
      pdf.setLineWidth(1.5);
      pdf.line(
        margin + (i * segmentWidth),
        currentY,
        margin + ((i + 1) * segmentWidth),
        currentY
      );
    }
    
    currentY += 6;

    // Subtítulo com data em rosa
    pdf.setFontSize(9);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(255, 70, 130); // Rosa
    const date = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    pdf.text(`Gerado por NextClass AI  •  ${date}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    // PROCESSAR CADA BLOCO
    for (let i = 0; i < options.structuredData.conteudo.length; i++) {
      const bloco = options.structuredData.conteudo[i];
      const strategy = RENDER_STRATEGIES[bloco.tipo] || { renderAsImage: false };

      console.log(`📦 [VisualPDF] Processando bloco ${i + 1}/${options.structuredData.conteudo.length}: ${bloco.tipo}`);

      if (strategy.renderAsImage) {
        // CAPTURAR COMO IMAGEM
        const imageData = await captureBlockAsImage(bloco, contentWidth);
        
        if (imageData) {
          // Calcular dimensões da imagem
          const imageHeight = (imageData.height / imageData.width) * contentWidth;
          let imageWidth = contentWidth;
          let xPosition = margin;

          // Se imagem é pequena (< 70% da largura), centralizar
          if (imageHeight < 100 && imageData.width < imageData.height) {
            imageWidth = contentWidth * 0.7;
            xPosition = margin + (contentWidth - imageWidth) / 2;
          }
          
          // Verificar quebra de página
          if (currentY + imageHeight > pageHeight - margin) {
            pdf.addPage();
            stats.totalPages++;
            currentY = margin;
          }

          pdf.addImage(
            imageData.base64,
            imageData.base64.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG',
            xPosition,
            currentY,
            imageWidth,
            imageHeight
          );

          currentY += imageHeight + 8;
          stats.imagesCaptured++;

          // Estatísticas específicas
          if (bloco.tipo.includes('mermaid') || bloco.tipo === 'fluxograma' || bloco.tipo === 'mapa_mental' || bloco.tipo === 'diagrama') {
            stats.mermaidDiagrams++;
          }
          if (bloco.tipo === 'grafico') stats.charts++;
          if (bloco.tipo === 'post_it') stats.postIts++;
        } else {
          warnings.push(`Falha ao capturar imagem do bloco ${i + 1} (${bloco.tipo})`);
        }
      } else {
        // RENDERIZAR COMO TEXTO NATIVO
        currentY = addTextBlockToPDF(pdf, bloco, currentY, margin, contentWidth, pageWidth, pageHeight);
        stats.nativeTextBlocks++;

        // Verificar quebra de página após texto
        if (currentY > pageHeight - margin) {
          pdf.addPage();
          stats.totalPages++;
          currentY = margin;
        }
      }
    }

    // RODAPÉ COM IDENTIDADE NEXTCLASS
    const totalPages = (pdf as any).internal.pages.length - 1;
    
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      
      // Linha decorativa com gradiente rosa→roxo
      const footerLineY = pageHeight - 18;
      const lineSegments = 20;
      const lineWidth = pageWidth - (2 * margin);
      const segmentWidth = lineWidth / lineSegments;
      
      for (let j = 0; j < lineSegments; j++) {
        const ratio = j / lineSegments;
        const r = Math.round(255 - (255 - 63) * ratio);
        const g = Math.round(70 - (70 - 45) * ratio);
        const b = Math.round(130 + (175 - 130) * ratio);
        
        pdf.setDrawColor(r, g, b);
        pdf.setLineWidth(0.8);
        pdf.line(
          margin + (j * segmentWidth),
          footerLineY,
          margin + ((j + 1) * segmentWidth),
          footerLineY
        );
      }
      
      // Número da página (centro, roxo)
      pdf.setFontSize(9);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(63, 45, 175); // Roxo
      pdf.text(
        `Pagina ${i} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      
      // Nome do documento (esquerda, rosa)
      pdf.setFontSize(7);
      pdf.setFont('DejaVuSans', 'normal');
      pdf.setTextColor(255, 70, 130); // Rosa
      const truncatedTitle = options.title.substring(0, 35) + (options.title.length > 35 ? '...' : '');
      pdf.text(truncatedTitle, margin, pageHeight - 10);
      
      // "NextClass AI" (direita, roxo claro)
      pdf.setTextColor(145, 127, 251); // Roxo claro
      pdf.text('NextClass AI', pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    // Download
    const fileName = `${options.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.pdf`;
    pdf.save(fileName);

    stats.captureTime = Date.now() - startTime;
    console.log('✅ [VisualPDF] Geração concluída em', stats.captureTime, 'ms');

    return {
      success: true,
      stats,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  } catch (error) {
    console.error('❌ [VisualPDF] Erro:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

// FUNÇÃO: Redimensionar canvas
const resizeCanvas = (originalCanvas: HTMLCanvasElement, maxWidth: number = 1200): HTMLCanvasElement => {
  if (originalCanvas.width <= maxWidth) {
    return originalCanvas;
  }
  
  const scale = maxWidth / originalCanvas.width;
  const resizedCanvas = document.createElement('canvas');
  resizedCanvas.width = maxWidth;
  resizedCanvas.height = originalCanvas.height * scale;
  
  const ctx = resizedCanvas.getContext('2d')!;
  ctx.drawImage(originalCanvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
  
  return resizedCanvas;
};

// FUNÇÃO: Comprimir imagem
const compressImage = (canvas: HTMLCanvasElement, hasTransparency: boolean): string => {
  if (hasTransparency) {
    // PNG para elementos com transparência (bordas arredondadas, etc)
    return canvas.toDataURL('image/png', 0.8);
  } else {
    // JPEG com compressão 0.85 para elementos opacos (economia de ~60%)
    return canvas.toDataURL('image/jpeg', 0.85);
  }
};

// FUNÇÃO: Capturar bloco como imagem
const captureBlockAsImage = async (bloco: ContentBlock, maxWidth: number): Promise<{ base64: string; width: number; height: number } | null> => {
  try {
    // Criar container invisível
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = `${maxWidth * 3.7795275591}px`; // mm para px (A4 width)
    container.style.backgroundColor = '#ffffff';
    container.style.padding = '20px';
    document.body.appendChild(container);

    // Renderizar bloco baseado no tipo
    const element = await renderBlockToElement(bloco);
    container.appendChild(element);

    // Aguardar renderização de Mermaid/Charts
    await new Promise(resolve => setTimeout(resolve, 500));

    // Capturar com html2canvas
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 1.2, // Resolução otimizada (reduz tamanho 65%)
      logging: false,
      useCORS: true,
      allowTaint: true
    });

    // Redimensionar canvas se muito grande (máximo 1200px de largura)
    const resizedCanvas = resizeCanvas(canvas, 1200);
    
    // Comprimir imagem baseado no tipo
    const hasTransparency = bloco.tipo === 'post_it' || bloco.tipo === 'componente_react';
    const base64 = compressImage(resizedCanvas, hasTransparency);

    // Limpar
    document.body.removeChild(container);

    return {
      base64,
      width: canvas.width,
      height: canvas.height
    };
  } catch (error) {
    console.error('[VisualPDF] Erro ao capturar bloco:', error);
    return null;
  }
};

// FUNÇÃO: Renderizar bloco em elemento DOM
const renderBlockToElement = async (bloco: ContentBlock): Promise<HTMLElement> => {
  const div = document.createElement('div');
  
  // Aplicar estilos inline para garantir renderização
  const styles = {
    'post_it': 'background: linear-gradient(to bottom right, #fef3c7, #fde047); border: 2px dashed #eab308; padding: 16px; border-radius: 8px; font-style: italic; font-weight: 500; font-family: Manrope, sans-serif;',
    'caixa_de_destaque': 'background: linear-gradient(to bottom right, #fef3c7, #fde68a); border-left: 4px solid #f59e0b; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); font-family: Manrope, sans-serif;',
    'fluxograma': 'background: #f9fafb; border: 2px solid #e5e7eb; padding: 24px; border-radius: 12px; font-family: Manrope, sans-serif;',
    'grafico': 'background: #f9fafb; border: 2px solid #e5e7eb; padding: 24px; border-radius: 12px; font-family: Manrope, sans-serif;',
    'componente_react': 'background: linear-gradient(to bottom right, #ede9fe, #ddd6fe); border: 2px solid #a855f7; padding: 24px; border-radius: 12px; font-family: Manrope, sans-serif;'
  };

  div.style.cssText = styles[bloco.tipo as keyof typeof styles] || '';

  // Renderizar conteúdo específico
  switch (bloco.tipo) {
    case 'post_it':
      const icon = getPostItIcon(bloco.texto || '');
      div.innerHTML = `<p style="font-size: 14px; line-height: 1.6; color: #000;">${icon} ${bloco.texto || ''}</p>`;
      break;

    case 'caixa_de_destaque':
      div.innerHTML = `
        <h4 style="font-weight: bold; color: #92400e; margin-bottom: 12px; font-size: 16px;">📌 ${bloco.titulo}</h4>
        <div style="color: #78350f; line-height: 1.6;">${bloco.texto || ''}</div>
      `;
      break;

    case 'fluxograma':
    case 'mapa_mental':
    case 'diagrama':
      const diagramIcon = bloco.tipo === 'mapa_mental' ? '🧠' : bloco.tipo === 'fluxograma' ? '📊' : '📐';
      div.innerHTML = `
        <h4 style="font-weight: bold; color: #1f2937; margin-bottom: 8px; font-size: 16px;">${diagramIcon} ${bloco.titulo || ''}</h4>
        ${bloco.descricao ? `<p style="color: #6b7280; margin-bottom: 12px; font-size: 13px;">${bloco.descricao}</p>` : ''}
        <div id="mermaid-container-${Date.now()}" style="min-height: 200px;"></div>
      `;
      
      // Renderizar Mermaid
      if (bloco.definicao_mermaid) {
        try {
          const mermaid = (await import('mermaid')).default;
          mermaid.initialize({ 
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose'
          });
          
          const containerId = `mermaid-container-${Date.now()}`;
          const mermaidContainer = div.querySelector(`#${containerId}`) || div;
          const { svg } = await mermaid.render(`mermaid-${Date.now()}`, bloco.definicao_mermaid);
          mermaidContainer.innerHTML = svg;
        } catch (error) {
          console.error('Erro ao renderizar Mermaid:', error);
          div.innerHTML += `<p style="color: #dc2626;">Erro ao renderizar diagrama</p>`;
        }
      }
      break;

    case 'grafico':
      div.innerHTML = `
        <h4 style="font-weight: bold; color: #1f2937; margin-bottom: 8px; font-size: 16px;">📊 ${bloco.titulo || ''}</h4>
        ${bloco.descricao ? `<p style="color: #6b7280; margin-bottom: 12px; font-size: 13px;">${bloco.descricao}</p>` : ''}
        <div style="width: 100%; height: 300px; background: #fff; border-radius: 8px; padding: 16px;">
          <canvas id="chart-${Date.now()}"></canvas>
        </div>
      `;
      
      // Renderizar gráfico com Recharts (simplificado como tabela visual)
      if (bloco.dados && Array.isArray(bloco.dados)) {
        let chartHTML = '<div style="padding: 16px;">';
        bloco.dados.forEach((item: any) => {
          const keys = Object.keys(item);
          const label = item[keys[0]];
          const value = item[keys[1]] || 0;
          const barWidth = Math.min((value / 100) * 100, 100);
          
          chartHTML += `
            <div style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-size: 12px; font-weight: 600;">${label}</span>
                <span style="font-size: 12px; color: #6b7280;">${value}</span>
              </div>
              <div style="width: 100%; height: 20px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
                <div style="width: ${barWidth}%; height: 100%; background: linear-gradient(to right, #3b82f6, #2563eb);"></div>
              </div>
            </div>
          `;
        });
        chartHTML += '</div>';
        div.querySelector('div[style*="height: 300px"]')!.innerHTML = chartHTML;
      }
      break;

    case 'componente_react':
      if (bloco.componente === 'Accordion') {
        let accordionHTML = `<h4 style="font-weight: bold; color: #581c87; margin-bottom: 8px;">⚛️ ${bloco.titulo}</h4>`;
        accordionHTML += `<p style="font-size: 12px; color: #6b21a8; font-style: italic; margin-bottom: 16px;">${bloco.descricao || ''}</p>`;
        
        bloco.props?.items?.forEach((item: any, i: number) => {
          accordionHTML += `
            <div style="margin-bottom: 12px; border: 1px solid #c084fc; border-radius: 8px; padding: 12px; background: #faf5ff;">
              <p style="font-weight: 600; color: #581c87; margin-bottom: 8px;">${i + 1}. ${item.trigger}</p>
              <div style="color: #6b21a8; line-height: 1.6; font-size: 13px;">${item.content}</div>
            </div>
          `;
        });
        
        div.innerHTML = accordionHTML;
      }
      break;
  }

  return div;
};

// FUNÇÃO: Adicionar texto nativo ao PDF
const addTextBlockToPDF = (
  pdf: jsPDF,
  bloco: ContentBlock,
  currentY: number,
  margin: number,
  contentWidth: number,
  pageWidth: number,
  pageHeight: number
): number => {
  pdf.setTextColor(0, 0, 0);

  switch (bloco.tipo) {
    case 'h2':
      pdf.setFontSize(16);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(63, 45, 175); // Roxo escuro
      const h2Lines = pdf.splitTextToSize(bloco.texto || '', contentWidth);
      pdf.text(h2Lines, margin, currentY);
      
      const h2Height = h2Lines.length * 7;
      currentY += h2Height;
      
      // Linha rosa decorativa
      pdf.setDrawColor(255, 70, 130); // Rosa
      pdf.setLineWidth(0.8);
      pdf.line(margin, currentY, margin + 60, currentY);
      currentY += 6;
      break;

    case 'h3':
      pdf.setFontSize(13);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(145, 127, 251); // Roxo claro
      const h3Lines = pdf.splitTextToSize(bloco.texto || '', contentWidth);
      pdf.text(h3Lines, margin, currentY);
      
      const h3Height = h3Lines.length * 6;
      currentY += h3Height;
      
      // Linha roxa decorativa
      pdf.setDrawColor(145, 127, 251); // Roxo claro
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, margin + 40, currentY);
      currentY += 5;
      break;

    case 'h4':
      pdf.setFontSize(11);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(255, 113, 160); // Rosa claro
      const h4Lines = pdf.splitTextToSize(bloco.texto || '', contentWidth);
      pdf.text(h4Lines, margin, currentY);
      currentY += h4Lines.length * 5 + 4;
      break;

    case 'paragrafo':
      pdf.setFontSize(10);
      pdf.setTextColor(40, 40, 40);
      
      let cleanText = bloco.texto?.replace(/<[^>]*>/g, '') || '';
      
      // Detectar palavras-chave em **negrito** ou MAIÚSCULAS
      const keywordPattern = /\*\*(.*?)\*\*/g;
      const segments: Array<{text: string, bold: boolean}> = [];
      let lastIndex = 0;
      
      cleanText.replace(keywordPattern, (match, p1, offset) => {
        if (offset > lastIndex) {
          segments.push({ text: cleanText.substring(lastIndex, offset), bold: false });
        }
        segments.push({ text: p1, bold: true });
        lastIndex = offset + match.length;
        return match;
      });
      
      if (lastIndex < cleanText.length) {
        segments.push({ text: cleanText.substring(lastIndex), bold: false });
      }
      
      // Se não há segmentos, renderizar texto normal
      if (segments.length === 0) {
        segments.push({ text: cleanText, bold: false });
      }
      
      // Renderizar alternando estilos
      let lineY = currentY;
      segments.forEach(seg => {
        const lines = pdf.splitTextToSize(seg.text, contentWidth);
        pdf.setFont('DejaVuSans', seg.bold ? 'bold' : 'normal');
        pdf.text(lines, margin, lineY);
        lineY += lines.length * 5;
      });
      
      currentY = lineY + 4;
      break;

    case 'referencias':
      // Adicionar espaço antes das referências
      if (currentY + 20 > pageHeight - margin) {
        pdf.addPage();
        currentY = margin;
      }
      
      // Título com cor roxa
      pdf.setFontSize(14);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(63, 45, 175); // Roxo
      pdf.text('Referencias Bibliograficas', margin, currentY);
      currentY += 8;
      
      // Linha decorativa com gradiente
      const refLineSegments = 15;
      const refLineWidth = contentWidth * 0.5;
      const refSegmentWidth = refLineWidth / refLineSegments;
      
      for (let i = 0; i < refLineSegments; i++) {
        const ratio = i / refLineSegments;
        const r = Math.round(255 - (255 - 63) * ratio);
        const g = Math.round(70 - (70 - 45) * ratio);
        const b = Math.round(130 + (175 - 130) * ratio);
        
        pdf.setDrawColor(r, g, b);
        pdf.setLineWidth(0.6);
        pdf.line(
          margin + (i * refSegmentWidth),
          currentY,
          margin + ((i + 1) * refSegmentWidth),
          currentY
        );
      }
      
      currentY += 6;
      
      // Lista de referências
      pdf.setFontSize(9);
      pdf.setFont('DejaVuSans', 'normal');
      pdf.setTextColor(60, 60, 60);
      
      bloco.itens?.forEach((ref: string, index: number) => {
        const estimatedHeight = Math.ceil(ref.length / 80) * 4 + 3;
        if (currentY + estimatedHeight > pageHeight - margin - 15) {
          pdf.addPage();
          currentY = margin;
        }
        
        // Número da referência em rosa
        pdf.setFont('DejaVuSans', 'bold');
        pdf.setTextColor(255, 70, 130); // Rosa
        pdf.text(`[${index + 1}]`, margin, currentY);
        
        // Texto da referência
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setTextColor(60, 60, 60);
        const refLines = pdf.splitTextToSize(ref, contentWidth - 12);
        pdf.text(refLines, margin + 12, currentY);
        currentY += refLines.length * 4 + 3;
      });
      
      currentY += 5;
      break;
  }

  return currentY;
};

// FUNÇÃO: Detectar ícone de post-it
const getPostItIcon = (texto: string): string => {
  const lower = texto.toLowerCase();
  if (lower.includes('atenção') || lower.includes('cuidado')) return '⚠️';
  if (lower.includes('dica')) return '💡';
  if (lower.includes('pense') || lower.includes('reflexão')) return '🤔';
  if (lower.includes('aplicação') || lower.includes('prática')) return '🌍';
  return '💡';
};
