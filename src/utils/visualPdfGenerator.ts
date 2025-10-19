import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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

// FASE 2: Função para sanitizar markdown
const sanitizeMarkdown = (text: string): { cleanText: string; hasBold: boolean } => {
  let cleanText = text;
  let hasBold = false;
  
  // Detectar e preservar marcadores de negrito **texto**
  if (cleanText.includes('**')) {
    hasBold = true;
  }
  
  // Remover hashtags de títulos se aparecerem no texto
  cleanText = cleanText.replace(/^#{1,4}\s+/gm, '');
  
  return { cleanText, hasBold };
};

// FASE 4: Função para detectar e converter markdown residual
const detectAndConvertMarkdown = (bloco: ContentBlock): ContentBlock => {
  const texto = bloco.texto || '';
  
  // Detectar se texto começa com hashtags
  const h2Match = texto.match(/^##\s+(.+)/);
  const h3Match = texto.match(/^###\s+(.+)/);
  const h4Match = texto.match(/^####\s+(.+)/);
  
  if (h2Match) {
    return { tipo: 'h2', texto: h2Match[1].trim() };
  } else if (h3Match) {
    return { tipo: 'h3', texto: h3Match[1].trim() };
  } else if (h4Match) {
    return { tipo: 'h4', texto: h4Match[1].trim() };
  }
  
  return bloco;
};

// Função auxiliar para converter Blob para Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]); // Remover prefixo data:
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Função para detectar símbolos matemáticos

const convertSVGtoPNG = async (svgString: string, width: number, height: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Validar entrada
    if (!svgString || svgString.length < 100) {
      reject(new Error('SVG string inválida ou vazia'));
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      try {
        // Criar canvas para renderizar em alta resolução (2x para qualidade)
        const canvas = document.createElement('canvas');
        const scaleFactor = 2;
        canvas.width = width * scaleFactor;
        canvas.height = height * scaleFactor;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context não disponível'));
          return;
        }
        
        // Fundo branco (importante para transparência)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Desenhar SVG no canvas
        ctx.scale(scaleFactor, scaleFactor);
        ctx.drawImage(img, 0, 0, width, height);
        
        const pngBase64 = canvas.toDataURL('image/png', 1.0);
        
        // VALIDAR Base64 gerado
        if (!pngBase64 || !pngBase64.startsWith('data:image/png')) {
          reject(new Error('Conversão PNG Base64 falhou'));
          return;
        }
        
        console.log('✅ SVG convertido para PNG:', pngBase64.substring(0, 50) + '...');
        resolve(pngBase64);
        
      } catch (error) {
        reject(new Error(`Erro ao processar canvas: ${error}`));
      }
    };
    
    img.onerror = (error) => {
      reject(new Error(`Falha ao carregar SVG: ${error}`));
    };
    
    // Converter SVG para Data URL
    try {
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      img.src = url;
      
      // Timeout de segurança (5 segundos)
      setTimeout(() => {
        reject(new Error('Timeout ao carregar SVG (5s)'));
      }, 5000);
      
    } catch (error) {
      reject(new Error(`Erro ao criar Blob do SVG: ${error}`));
    }
  });
};

export const generateVisualPDF = async (options: VisualPDFOptions): Promise<PDFResult> => {
  // FASE 6: Contador de órfãos evitados
  let orphansAvoided = 0;
  
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
  let fullPageImagesCount = 0; // FASE 4: Rastrear imagens em full-page
  let pageBreaksPreventedForText = 0; // FASE 6: Quebras de página evitadas
  let lastBlockWasFullPage = false; // FASE 1: Controlar páginas após full-page images
  let lastImageBottom = 0; // FASE 3: Tracking de posição de imagens
  const warnings: string[] = [];

  try {
    console.log('🎨 [VisualPDF] Iniciando geração com fontes nativas jsPDF...');
    
    // Criar PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Sistema de fontes nativas (100% compatíveis)
    const fonts = {
      title: { family: 'helvetica', weight: 'bold' as const },
      heading: { family: 'helvetica', weight: 'bold' as const },
      body: { family: 'helvetica', weight: 'normal' as const },
      bodyBold: { family: 'helvetica', weight: 'bold' as const },
      footer: { family: 'times', weight: 'italic' as const }
    };

    // Helper global para aplicar fontes
    const applyFont = (type: 'title' | 'heading' | 'body' | 'bodyBold' | 'footer') => {
      const font = fonts[type];
      pdf.setFont(font.family, font.weight);
    };

    console.log('📊 Configuração de fontes:');
    console.log('  - Sistema: Fontes nativas jsPDF (Helvetica, Times)');
    console.log('  - Estabilidade: 100%');
    
    // Dimensões da página
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (2 * margin);
    let currentY = margin;

    // FASE 1: Função para detectar se imagem merece página dedicada
    const shouldUseDedicatedPage = (
      imageHeight: number,
      aspectRatio: number,
      currentY: number,
      bloco: ContentBlock,
      availableSpace: number
    ): boolean => {
      
      const isLargeImage = imageHeight > 120; // REDUZIDO: 150mm → 120mm
      const isMediumImage = imageHeight > 80; // NOVO: imagens médias
      const isVerticalImage = aspectRatio > 1.3; // REDUZIDO: 1.5 → 1.3
      const isComplexDiagram = [
        'fluxograma',
        'mapa_mental',
        'diagrama',
        'grafico' // ADICIONADO: gráficos também
      ].includes(bloco.tipo) || !!bloco.definicao_mermaid;
      
      // NOVO: Calcular ocupação percentual
      const imageOccupancy = imageHeight / availableSpace;
      const isHighOccupancy = imageOccupancy > 0.4; // > 40% do espaço
      
      // NOVA DECISÃO: MUITO MAIS AGRESSIVA
      const decision: boolean = (
        // Critério 1: Imagem grande OU espaço limitado
        (isLargeImage) ||
        
        // Critério 2: Imagem média + diagrama complexo
        (isMediumImage && isComplexDiagram) ||
        
        // Critério 3: Imagem muito vertical
        (isVerticalImage) ||
        
        // Critério 4: NOVO - Alta ocupação (>40%)
        (isHighOccupancy && imageHeight > 60) ||
        
        // Critério 5: NOVO - Pouco espaço disponível (<150mm)
        (availableSpace < 150 && imageHeight > 70) ||
        
        // Critério 6: NOVO - Já estamos no meio/final da página
        (currentY > 100 && imageHeight > 80)
      );
      
      console.log('🔍 Análise AGRESSIVA de imagem:', {
        tipo: bloco.tipo,
        alturaImagem: `${imageHeight.toFixed(1)}mm`,
        espacoDisponivel: `${availableSpace.toFixed(1)}mm`,
        ocupacao: `${(imageOccupancy * 100).toFixed(1)}%`,
        posicaoAtual: `${currentY.toFixed(1)}mm`,
        aspectRatio: aspectRatio.toFixed(2),
        criterios: {
          isLargeImage,
          isMediumImage,
          isComplexDiagram,
          isVerticalImage,
          isHighOccupancy,
          currentYPosition: currentY > 100
        },
        decisao: decision ? '📄 FULL-PAGE' : '📝 INLINE'
      });
      
      return decision;
    };

    // FASE 1: Função para pré-calcular altura de texto
    const estimateTextBlockHeight = (
      pdf: jsPDF,
      bloco: ContentBlock,
      contentWidth: number
    ): number => {
      const processedBloco = detectAndConvertMarkdown(bloco);
      
      switch (processedBloco.tipo) {
        case 'h2':
          pdf.setFontSize(16);
          const h2Lines = pdf.splitTextToSize(processedBloco.texto || '', contentWidth);
          return h2Lines.length * 7 + 8; // Altura + linha decorativa + espaço
          
        case 'h3':
          pdf.setFontSize(13);
          const h3Lines = pdf.splitTextToSize(processedBloco.texto || '', contentWidth);
          return h3Lines.length * 6 + 6; // Altura + linha decorativa
          
        case 'h4':
          pdf.setFontSize(11);
          const h4Lines = pdf.splitTextToSize(processedBloco.texto || '', contentWidth);
          return h4Lines.length * 5 + 5;
          
        case 'paragrafo':
          pdf.setFontSize(11);
          const { cleanText } = sanitizeMarkdown(processedBloco.texto || '');
          const lines = pdf.splitTextToSize(cleanText, contentWidth);
          return lines.length * 6.5 + 5;
          
        case 'referencias':
          let refHeight = 20; // Título + linha decorativa
          bloco.itens?.forEach((ref: string) => {
            const estimatedLines = Math.ceil(ref.length / 80);
            refHeight += estimatedLines * 4 + 3;
          });
          return refHeight;
          
        default:
          return 15; // Fallback
      }
    };

    // FASE 2: Algoritmo inteligente de quebra de linha (anti-órfão) + proteção de palavras em negrito
    const smartTextSplit = (
      pdf: jsPDF,
      text: string,
      maxWidth: number,
      preserveWords?: string[] // FASE 2: Palavras que não devem ser quebradas (negrito)
    ): string[] => {
      const protectedWords = preserveWords || [];
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = pdf.getTextWidth(testLine);
        
        if (testWidth > maxWidth && currentLine) {
          // FASE 2: Verificar se palavra é protegida (negrito)
          const isProtectedWord = protectedWords.some(pw => word.includes(pw));
          
          if (isProtectedWord && pdf.getTextWidth(word) < maxWidth * 0.9) {
            // Palavra protegida não cabe na linha atual, mover linha inteira
            lines.push(currentLine);
            currentLine = word;
            console.log('🛡️ Palavra em negrito protegida:', word);
            continue;
          }
          
          // Verificar se próxima palavra é curta (< 10 letras) e é a última
          const nextWord = words[i + 1];
          const isLastWord = i === words.length - 1;
          const nextIsOrphan = nextWord && nextWord.length < 10 && i === words.length - 2;
          
          if (nextIsOrphan) {
            // Forçar quebra anterior para evitar órfão
            const wordsInLine = currentLine.split(' ');
            if (wordsInLine.length > 2) {
              // Mover última palavra da linha atual para próxima linha
              const lastWordInLine = wordsInLine.pop();
              lines.push(wordsInLine.join(' '));
              currentLine = `${lastWordInLine} ${word}`;
              orphansAvoided++;
              console.log('🔧 Órfão evitado:', nextWord);
              continue;
            }
          }
          
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      return lines;
    };

    // FASE 3: Renderizar linha justificada com verificação de espaçamento excessivo
    const renderJustifiedLine = (
      pdf: jsPDF,
      text: string,
      x: number,
      y: number,
      maxWidth: number,
      isLastLine: boolean = false
    ): void => {
      if (isLastLine || text.trim().split(' ').length === 1) {
        // Última linha ou palavra única: alinhar à esquerda
        pdf.text(text, x, y);
        return;
      }
      
      const words = text.trim().split(' ');
      const totalTextWidth = words.reduce((sum, word) => sum + pdf.getTextWidth(word), 0);
      const totalSpaceWidth = maxWidth - totalTextWidth;
      const spaceWidth = totalSpaceWidth / (words.length - 1);
      
      // CORREÇÃO 3: Aumentar limite de 8mm para 12mm e adicionar fallback gradual
      if (spaceWidth > 12) {
        // Tentar comprimir linha levemente
        const compressionFactor = 0.95;
        const compressedWidth = maxWidth * compressionFactor;
        
        if (totalTextWidth < compressedWidth) {
          // Renderizar com compressão leve
          const adjustedSpaceWidth = (compressedWidth - totalTextWidth) / (words.length - 1);
          
          let xPos = x;
          words.forEach((word) => {
            pdf.text(word, xPos, y);
            xPos += pdf.getTextWidth(word) + adjustedSpaceWidth;
          });
          console.log('🔧 Linha comprimida para melhorar justificação');
          return;
        }
        
        // Se não funcionar, alinhar à esquerda
        console.log('⚠️ Espaçamento excessivo detectado, usando alinhamento à esquerda');
        pdf.text(text, x, y);
        return;
      }
      
      let currentX = x;
      words.forEach((word) => {
        pdf.text(word, currentX, y);
        currentX += pdf.getTextWidth(word) + spaceWidth;
      });
    };

    // FASE 2: Função para renderizar imagem em página dedicada (Full-Page Mode)
    const renderImageFullPage = (
      pdf: jsPDF,
      imageData: { base64: string; width: number; height: number },
      pageWidth: number,
      pageHeight: number,
      margin: number
    ): void => {
      // Criar nova página dedicada
      pdf.addPage();
      stats.totalPages++;
      fullPageImagesCount++;
      console.log('📄 Página dedicada criada para imagem grande (Full-Page Mode)');
      
      // Calcular dimensões máximas disponíveis
      const maxWidth = (pageWidth - 2 * margin) * 0.90; // 90% da largura (respiro visual)
      const maxHeight = (pageHeight - 2 * margin) * 0.85; // 85% da altura (sem invadir rodapé)
      
      let finalWidth = imageData.width;
      let finalHeight = imageData.height;
      
      // Escalar proporcionalmente para caber
      const widthRatio = maxWidth / imageData.width;
      const heightRatio = maxHeight / imageData.height;
      const scaleFactor = Math.min(widthRatio, heightRatio);
      
      finalWidth = imageData.width * scaleFactor;
      finalHeight = imageData.height * scaleFactor;
      
      // Centralizar vertical E horizontal
      const xPosition = (pageWidth - finalWidth) / 2;
      const yPosition = (pageHeight - finalHeight) / 2;
      
      // Renderizar imagem
      pdf.addImage(
        imageData.base64,
        imageData.base64.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG',
        xPosition,
        yPosition,
        finalWidth,
        finalHeight
      );
      
      // FASE 5: Legenda discreta (opcional)
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(145, 127, 251); // Roxo claro
      pdf.text(
        'Imagem otimizada para visualização completa',
        pageWidth / 2,
        yPosition + finalHeight + 8,
        { align: 'center' }
      );
      
      console.log(`✅ Imagem full-page: ${finalWidth.toFixed(1)}mm x ${finalHeight.toFixed(1)}mm (centralizada)`);
    };

    // FASE 1: CABEÇALHO COM LOGO SVG NEXTCLASS CENTRALIZADA
    const logoY = currentY;
    
    // Logo SVG completo da NextClass
    const nextclassLogoSVG = `<svg width="188" height="27" viewBox="0 0 188 27" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7.54727 18.4206C7.54727 18.5996 7.54727 18.7786 7.54727 18.9602C7.54727 21.1368 7.54727 23.316 7.54727 25.4925C7.54727 25.9084 7.57945 25.9057 7.12366 25.9031C4.88763 25.9031 2.6516 25.9031 0.41825 25.9031C0 25.9031 0 25.9505 0 25.4925C0 18.6891 0 11.8883 0 5.08483C0 4.69531 0.00536218 4.68742 0.383396 4.68742C2.37813 4.68742 4.37286 4.69531 6.36759 4.67689C6.69469 4.67426 6.81533 4.83217 6.95475 5.05851C8.60094 7.72725 10.2525 10.3934 11.9014 13.0568C11.9872 13.1963 12.0461 13.3542 12.2204 13.4832C12.333 13.3042 12.2874 13.12 12.2874 12.9516C12.2901 10.4039 12.2874 7.85359 12.2874 5.30591C12.2874 5.2059 12.2982 5.10326 12.2874 5.00324C12.258 4.76374 12.3464 4.65847 12.6011 4.68479C12.754 4.70058 12.9095 4.68742 13.065 4.68742C15.1294 4.68742 17.1912 4.68742 19.2556 4.68742C19.4245 4.68742 19.5988 4.65847 19.7757 4.72163C19.8776 4.83217 19.8294 4.97166 19.8294 5.09799C19.832 11.883 19.8294 18.6707 19.8294 25.4557C19.8294 25.9452 19.8722 25.9031 19.3414 25.9031C17.3976 25.9031 15.4538 25.8952 13.5127 25.911C13.2017 25.911 13.0194 25.8189 12.8424 25.5715C11.2177 23.3107 9.58222 21.0578 7.94675 18.8049C7.84755 18.668 7.74567 18.5364 7.64647 18.4022C7.61162 18.4101 7.57408 18.4154 7.53923 18.4233L7.54727 18.4206Z" fill="#170F49"/>
<path d="M22.7917 4.73198C22.9419 4.65566 23.0974 4.68724 23.2502 4.68724C27.7571 4.68724 32.264 4.68724 36.7709 4.68724C36.8728 4.68724 36.9774 4.68724 37.0792 4.68724C37.2321 4.68724 37.2884 4.76356 37.283 4.90832C37.2776 5.12677 37.283 5.34785 37.283 5.56629C37.283 7.0691 37.283 8.57192 37.283 10.0747C37.283 10.4564 37.275 10.4642 36.8835 10.4642C34.8888 10.4642 32.8914 10.4642 30.8966 10.4642C30.776 10.4642 30.6554 10.4695 30.5347 10.4642C30.3631 10.4564 30.288 10.5248 30.2907 10.7011C30.2988 11.2407 30.2961 11.7828 30.2907 12.3224C30.2907 12.475 30.3578 12.5329 30.5052 12.5277C30.6259 12.5224 30.7465 12.5277 30.8672 12.5277C32.4678 12.5277 34.0657 12.5277 35.6663 12.5277C36.0443 12.5277 36.0658 12.4829 36.0658 12.9093C36.0631 14.5805 36.0631 16.2518 36.0658 17.9257C36.0658 18.331 36.0712 18.3073 35.669 18.3073C34.0174 18.3073 32.3659 18.3073 30.7143 18.3073C30.2988 18.3073 30.2961 18.3126 30.2934 18.7179C30.2907 19.0547 30.2934 19.3943 30.2934 19.7311C30.2934 20.1522 30.2639 20.1286 30.7251 20.1286C32.3766 20.1286 34.0282 20.1286 35.6797 20.1286C36.0926 20.1286 36.5055 20.1259 36.9184 20.1286C37.275 20.1338 37.283 20.1365 37.283 20.4918C37.2857 21.8419 37.283 23.1947 37.283 24.5449C37.283 24.916 37.2776 25.2871 37.283 25.6582C37.2857 25.8266 37.2321 25.9108 37.0498 25.9029C36.9291 25.895 36.8085 25.9029 36.6878 25.9029C32.2318 25.9029 27.7759 25.9029 23.3226 25.9029C22.6496 25.9029 22.7542 25.9793 22.7542 25.3397C22.7542 18.6363 22.7542 11.9328 22.7542 5.22678C22.7542 5.06097 22.7193 4.8899 22.7863 4.72935L22.7917 4.73198Z" fill="#170F49"/>
<path d="M61.1748 4.73667C61.3571 4.65245 61.5314 4.68666 61.7003 4.68666C66.4485 4.68666 71.1967 4.68666 75.9422 4.68666C76.5884 4.68666 76.4972 4.64982 76.4972 5.22357C76.4999 6.79481 76.4972 8.36342 76.4972 9.93466C76.4972 10.5163 76.5481 10.4663 75.9315 10.4663C74.9502 10.4663 73.9716 10.4663 72.9903 10.4663C72.6043 10.4663 72.5989 10.4716 72.5989 10.8506C72.5989 12.9455 72.5989 15.0379 72.5989 17.1329C72.5989 19.8674 72.5989 22.6046 72.5989 25.3391C72.5989 25.4576 72.5935 25.576 72.5989 25.6944C72.6069 25.8471 72.5372 25.9076 72.3871 25.9024C72.3013 25.8997 72.2155 25.9024 72.1297 25.9024C69.9285 25.9024 67.7274 25.9024 65.5235 25.9024C64.9926 25.9024 65.0597 25.9497 65.0597 25.4418C65.0597 20.6807 65.0597 15.917 65.0597 11.1559C65.0597 11.0558 65.0597 10.9532 65.0597 10.8532C65.0543 10.4742 65.0516 10.4689 64.6629 10.4663C63.6467 10.4637 62.6333 10.4663 61.6172 10.4663C61.1587 10.4663 61.1533 10.4637 61.1533 10.0399C61.1533 8.35026 61.1533 6.66321 61.1533 4.97354C61.1533 4.89195 61.1667 4.81036 61.1721 4.73667H61.1748Z" fill="#170F49"/>
<path d="M49.1664 21.8763C48.5819 22.5843 48.1207 23.3765 47.5926 24.124C47.2199 24.6503 46.8606 25.1872 46.5067 25.7241C46.3861 25.9084 46.2547 26.0084 46.0107 26.0005C43.638 25.9321 41.2679 25.8768 38.8951 25.8136C38.8629 25.8136 38.8308 25.7926 38.7879 25.7794C38.7342 25.5952 38.8763 25.4689 38.9541 25.332C40.6887 22.2053 42.4261 19.0812 44.1634 15.9546C44.2037 15.8809 44.2385 15.8019 44.2921 15.7361C44.52 15.444 44.4771 15.1808 44.2948 14.8623C42.9301 12.4805 41.5842 10.0854 40.2356 7.69567C39.7021 6.75345 39.1739 5.8086 38.6484 4.87691C38.7664 4.7111 38.9165 4.76374 39.0452 4.76111C41.4019 4.72163 43.7559 4.69005 46.1126 4.64794C46.3646 4.64267 46.5121 4.69005 46.6703 4.93481C47.48 6.1876 48.3325 7.41406 49.1717 8.64842C49.279 8.81949 49.3835 8.9932 49.4961 9.16164C50.7509 11.0303 52.011 12.8963 53.2577 14.7702C53.6599 15.3755 53.676 15.1545 53.2658 15.7624C51.9949 17.6416 50.7133 19.5129 49.4398 21.3894C49.3353 21.5421 49.2039 21.6816 49.1717 21.8737L49.1664 21.8763Z" fill="url(#paint0_linear_2102_8238)"/>
<path d="M49.1664 21.8763C49.1985 21.6842 49.3293 21.5445 49.4339 21.3919C50.7074 19.5153 51.9916 17.6441 53.2598 15.7649C53.6727 15.1543 53.6539 15.378 53.2518 14.7727C52.005 12.8988 50.7449 11.0327 49.4902 9.1641C49.3776 8.99566 49.273 8.82195 49.1658 8.65088C50.0103 7.40073 50.8736 6.15848 51.6887 4.8899C51.8281 4.67409 51.9434 4.63724 52.1498 4.63987C52.8201 4.65303 53.4904 4.6583 54.1606 4.66883C55.898 4.69514 57.6353 4.7241 59.37 4.75041C59.4665 4.75041 59.5657 4.75831 59.6649 4.76357C59.673 4.9636 59.563 5.0794 59.4907 5.20573C57.6782 8.42191 55.8658 11.6407 54.0373 14.849C53.8577 15.1648 53.847 15.3938 54.0266 15.7175C55.8336 18.9363 57.6219 22.1683 59.4156 25.395C59.4799 25.5108 59.5389 25.6266 59.5952 25.7345C59.488 25.845 59.3807 25.8108 59.2842 25.8135C57.016 25.8714 54.7451 25.9187 52.4769 25.9924C52.115 26.0056 51.9273 25.8793 51.7396 25.5976C51.0077 24.4949 50.2543 23.4079 49.5089 22.313C49.4044 22.1604 49.3105 21.9972 49.1631 21.8788L49.1664 21.8763Z" fill="#170F49"/>
<path d="M103.493 3.76966L91.9323 0.142819C91.3253 -0.0476064 90.6746 -0.0476064 90.0677 0.142819L78.5066 3.76966C77.8311 3.98158 77.8311 4.93767 78.5066 5.1496L83.3175 6.65882V10.5C88.4391 8.21518 93.5607 8.21518 98.6824 10.5V6.65882L103.493 5.1496C104.169 4.93767 104.169 3.98158 103.493 3.76966Z" fill="url(#paint1_linear_2102_8238)"/>
<path d="M102.453 9.47526L102.157 6.15525L101.431 6.38125L101.156 9.47528C101.355 9.3946 101.576 9.34614 101.807 9.34614C102.039 9.34614 102.254 9.39455 102.453 9.47526Z" fill="url(#paint2_linear_2102_8238)"/>
<path d="M102.933 11.0124C102.933 10.3895 102.428 9.8845 101.805 9.8845C101.182 9.8845 100.677 10.3895 100.677 11.0124C100.677 11.2629 100.762 11.492 100.9 11.6791L100.462 14.2367C101.52 14.3115 102.461 13.7485 103.149 14.2367L102.711 11.6791C102.849 11.492 102.933 11.2629 102.933 11.0124Z" fill="url(#paint3_linear_2102_8238)"/>
<path d="M91.6565 26.4761C89.9907 26.4761 88.4438 26.2183 87.0159 25.7026C85.6078 25.1672 84.3782 24.4135 83.3271 23.4418C82.2959 22.47 81.4927 21.3198 80.9176 19.991C80.3424 18.6623 80.0549 17.1947 80.0549 15.5884C80.0549 13.982 80.3424 12.5144 80.9176 11.1857C81.4927 9.85694 82.2959 8.70669 83.3271 7.73493C84.3782 6.76316 85.6078 6.01947 87.0159 5.50384C88.4438 4.96838 89.9907 4.70065 91.6565 4.70065C93.6992 4.70065 95.5039 5.05762 97.0706 5.77157C98.6572 6.48552 99.9661 7.51678 100.997 8.86534L96.5649 12.8218C95.9501 12.0484 95.2659 11.4534 94.5123 11.0369C93.7785 10.6006 92.9456 10.3825 92.0135 10.3825C91.2797 10.3825 90.6154 10.5015 90.0204 10.7395C89.4254 10.9774 88.9098 11.3245 88.4735 11.7806C88.057 12.2368 87.7298 12.7921 87.4918 13.4465C87.2538 14.0811 87.1349 14.7951 87.1349 15.5884C87.1349 16.3816 87.2538 17.1055 87.4918 17.7599C87.7298 18.3946 88.057 18.9399 88.4735 19.3961C88.9098 19.8522 89.4254 20.1993 90.0204 20.4373C90.6154 20.6752 91.2797 20.7942 92.0135 20.7942C92.9456 20.7942 93.7785 20.586 94.5123 20.1695C95.2659 19.7332 95.9501 19.1283 96.5649 18.3549L100.997 22.3114C99.9661 23.6401 98.6572 24.6714 97.0706 25.4051C95.5039 26.1191 93.6992 26.4761 91.6565 26.4761Z" fill="#170F49"/>
<path d="M104.214 26.0001V5.17661H111.235V20.5562H120.635V26.0001H104.214Z" fill="#170F49"/>
<path d="M121.794 26.0001L130.897 5.17661H137.798L146.901 26.0001H139.643L132.92 8.50837H135.656L128.933 26.0001H121.794ZM127.208 22.3709L128.993 17.3137H138.572L140.357 22.3709H127.208Z" fill="#170F49"/>
<path d="M156.976 26.4761C155.23 26.4761 153.545 26.2777 151.918 25.8811C150.292 25.4845 148.954 24.9688 147.902 24.3342L150.163 19.2176C151.155 19.7927 152.256 20.2588 153.465 20.6157C154.695 20.9529 155.885 21.1215 157.035 21.1215C157.709 21.1215 158.235 21.0818 158.612 21.0025C159.008 20.9033 159.296 20.7744 159.474 20.6157C159.653 20.4373 159.742 20.229 159.742 19.991C159.742 19.6142 159.534 19.3168 159.117 19.0986C158.701 18.8804 158.146 18.702 157.452 18.5631C156.777 18.4045 156.034 18.2458 155.22 18.0872C154.407 17.9087 153.584 17.6806 152.751 17.403C151.938 17.1253 151.185 16.7584 150.491 16.3023C149.816 15.8462 149.271 15.2512 148.854 14.5174C148.438 13.7638 148.23 12.8317 148.23 11.7211C148.23 10.4321 148.587 9.26198 149.301 8.21089C150.034 7.13997 151.115 6.2872 152.543 5.65258C153.991 5.01796 155.786 4.70065 157.928 4.70065C159.336 4.70065 160.724 4.84939 162.092 5.14686C163.461 5.44434 164.69 5.90048 165.781 6.51526L163.669 11.6021C162.638 11.0865 161.636 10.6998 160.664 10.442C159.712 10.1842 158.78 10.0553 157.868 10.0553C157.194 10.0553 156.658 10.1148 156.262 10.2337C155.865 10.3527 155.577 10.5114 155.399 10.7097C155.24 10.908 155.161 11.1262 155.161 11.3642C155.161 11.7211 155.369 12.0087 155.786 12.2268C156.202 12.4252 156.748 12.5937 157.422 12.7326C158.116 12.8714 158.87 13.0201 159.683 13.1788C160.516 13.3374 161.339 13.5556 162.152 13.8332C162.965 14.1109 163.708 14.4778 164.383 14.9339C165.077 15.39 165.632 15.985 166.049 16.7188C166.465 17.4526 166.673 18.3648 166.673 19.4556C166.673 20.7248 166.306 21.8949 165.573 22.9658C164.859 24.0169 163.788 24.8697 162.36 25.5241C160.932 26.1588 159.137 26.4761 156.976 26.4761Z" fill="#170F49"/>
<path d="M177.717 26.4761C175.971 26.4761 174.286 26.2777 172.659 25.8811C171.033 25.4845 169.695 24.9688 168.643 24.3342L170.904 19.2176C171.896 19.7927 172.997 20.2588 174.206 20.6157C175.436 20.9529 176.626 21.1215 177.776 21.1215C178.45 21.1215 178.976 21.0818 179.353 21.0025C179.749 20.9033 180.037 20.7744 180.215 20.6157C180.394 20.4373 180.483 20.229 180.483 19.991C180.483 19.6142 180.275 19.3168 179.858 19.0986C179.442 18.8804 178.887 18.702 178.193 18.5631C177.518 18.4045 176.775 18.2458 175.961 18.0872C175.148 17.9087 174.325 17.6806 173.492 17.403C172.679 17.1253 171.926 16.7584 171.232 16.3023C170.557 15.8462 170.012 15.2512 169.595 14.5174C169.179 13.7638 168.971 12.8317 168.971 11.7211C168.971 10.4321 169.328 9.26198 170.042 8.21089C170.775 7.13997 171.856 6.2872 173.284 5.65258C174.732 5.01796 176.527 4.70065 178.668 4.70065C180.077 4.70065 181.465 4.84939 182.833 5.14686C184.202 5.44434 185.431 5.90048 186.522 6.51526L184.41 11.6021C183.379 11.0865 182.377 10.6998 181.405 10.442C180.453 10.1842 179.521 10.0553 178.609 10.0553C177.935 10.0553 177.399 10.1148 177.003 10.2337C176.606 10.3527 176.318 10.5114 176.14 10.7097C175.981 10.908 175.902 11.1262 175.902 11.3642C175.902 11.7211 176.11 12.0087 176.527 12.2268C176.943 12.4252 177.488 12.5937 178.163 12.7326C178.857 12.8714 179.611 13.0201 180.424 13.1788C181.257 13.3374 182.08 13.5556 182.893 13.8332C183.706 14.1109 184.449 14.4778 185.124 14.9339C185.818 15.39 186.373 15.985 186.79 16.7188C187.206 17.4526 187.414 18.3648 187.414 19.4556C187.414 20.7248 187.047 21.8949 186.314 22.9658C185.6 24.0169 184.529 24.8697 183.101 25.5241C181.673 26.1588 179.878 26.4761 177.717 26.4761Z" fill="#170F49"/>
<defs>
<linearGradient id="paint0_linear_2102_8238" x1="93.7072" y1="0" x2="93.7072" y2="26.4761" gradientUnits="userSpaceOnUse">
<stop stop-color="#FF71A0"/>
<stop offset="1" stop-color="#FF4682"/>
</linearGradient>
<linearGradient id="paint1_linear_2102_8238" x1="-73.0666" y1="-81.0886" x2="217.195" y2="-41.1772" gradientUnits="userSpaceOnUse">
<stop stop-color="#3F2DAF"/>
<stop offset="1" stop-color="#917FFB"/>
</linearGradient>
<linearGradient id="paint2_linear_2102_8238" x1="93.7072" y1="0" x2="93.7072" y2="26.4761" gradientUnits="userSpaceOnUse">
<stop stop-color="#FF71A0"/>
<stop offset="1" stop-color="#FF4682"/>
</linearGradient>
<linearGradient id="paint3_linear_2102_8238" x1="93.7072" y1="0" x2="93.7072" y2="26.4761" gradientUnits="userSpaceOnUse">
<stop stop-color="#FF71A0"/>
<stop offset="1" stop-color="#FF4682"/>
</linearGradient>
</defs>
</svg>`;
    
    // FASE 1: Converter SVG para PNG de ALTA qualidade (4x resolução)
    const logoWidthPx = 188 * 4; // 752px para qualidade 4K
    const logoHeightPx = 27 * 4;  // 108px
    const logoWidth = 40; // FASE 1: Logo reduzida (ANTES: 70mm, AGORA: 40mm = -43%)
    const logoHeight = logoWidth * (27 / 188); // ~5.7mm altura
    
  try {
    const logoPNG = await convertSVGtoPNG(nextclassLogoSVG, logoWidthPx, logoHeightPx);
    
    // FASE 1: LOGO CENTRALIZADA NO TOPO
    const logoX = (pageWidth - logoWidth) / 2;
    pdf.addImage(logoPNG, 'PNG', logoX, logoY, logoWidth, logoHeight);
    
    console.log('✅ Logo NextClass centralizada (40mm) no topo da página');
    
  } catch (error) {
    console.error('❌ Erro ao renderizar logo:', error);
    warnings.push('Logo NextClass não foi adicionada ao PDF');
    
    // FALLBACK: Continuar sem logo
    console.log('⚠️ Continuando geração do PDF sem logo...');
  }
    
    currentY = logoY + logoHeight + 10; // FASE 1: Espaço maior após logo
    
    // FASE 1: TÍTULO CENTRALIZADO ABAIXO DA LOGO
    pdf.setFontSize(18); // FASE 1: Reduzido de 22pt para 18pt
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(63, 45, 175); // Roxo escuro
    const titleLines = pdf.splitTextToSize(options.title, contentWidth);
    pdf.text(titleLines, pageWidth / 2, currentY, { align: 'center' });
    
    currentY += titleLines.length * 8; // Espaço proporcional ao número de linhas

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

    // FASE 1: Subtítulo com data em rosa (fonte maior)
    pdf.setFontSize(10); // FASE 1: Aumentado de 9pt para 10pt (+11%)
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(255, 70, 130); // Rosa
    const date = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    pdf.text(`Gerado por NextClass AI  •  ${date}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    // PROCESSAR CADA BLOCO
    let lastBlockWasImage = false; // CORREÇÃO 4: Rastrear blocos de imagem para ajustar espaçamento
    
    for (let i = 0; i < options.structuredData.conteudo.length; i++) {
      const bloco = options.structuredData.conteudo[i];
      const strategy = RENDER_STRATEGIES[bloco.tipo] || { renderAsImage: false };

      console.log(`📦 [VisualPDF] Processando bloco ${i + 1}/${options.structuredData.conteudo.length}: ${bloco.tipo}`);

      // FASE 1: Garantir espaço após full-page images
      if (lastBlockWasFullPage && currentY < margin + 50) {
        pdf.addPage();
        stats.totalPages++;
        currentY = margin;
        lastBlockWasFullPage = false;
        console.log('✅ Full-page finalizado, forçando nova página para próximo bloco');
      }

      // FASE 4: Keep-Together para Títulos + Parágrafos
      if (!strategy.renderAsImage && ['h2', 'h3', 'h4'].includes(bloco.tipo)) {
        // Lookahead: verificar se próximo bloco é parágrafo
        const nextBloco = options.structuredData.conteudo[i + 1];
        if (nextBloco && nextBloco.tipo === 'paragrafo') {
          const titleHeight = estimateTextBlockHeight(pdf, bloco, contentWidth);
          const paragraphHeight = estimateTextBlockHeight(pdf, nextBloco, contentWidth);
          const combinedHeight = titleHeight + paragraphHeight;
          const availableSpace = pageHeight - margin - currentY - 20;
          
          if (combinedHeight > availableSpace) {
            // Criar nova página para manter título + parágrafo juntos
            pdf.addPage();
            stats.totalPages++;
            currentY = margin;
            pageBreaksPreventedForText++;
            console.log('📄 Keep-Together: Nova página para título + parágrafo');
          }
        }
      }

      // FASE 1: Pré-calcular altura de texto ANTES de renderizar
      if (!strategy.renderAsImage) {
        const estimatedHeight = estimateTextBlockHeight(pdf, bloco, contentWidth);
        const availableSpace = pageHeight - margin - currentY - 20;
        
        if (estimatedHeight > availableSpace && currentY > margin + 50) {
          // Criar nova página ANTES de renderizar texto
          pdf.addPage();
          stats.totalPages++;
          currentY = margin;
          pageBreaksPreventedForText++;
          console.log('📄 Nova página criada ANTES de renderizar texto');
        }
      }

      if (strategy.renderAsImage) {
        // CAPTURAR COMO IMAGEM
        const imageData = await captureBlockAsImage(bloco, contentWidth);
        
        if (imageData) {
          const estimatedImageHeight = (imageData.height / imageData.width) * contentWidth * 0.7;
          const spaceAvailable = pageHeight - margin - currentY;
          
          // PROTEÇÃO DE EMERGÊNCIA: Verificar se HÁ ESPAÇO REAL
          const MINIMUM_SPACE_REQUIRED = 30; // 30mm mínimo (5 linhas de texto)
          
          // Se não há nem 30mm de espaço, FORÇAR nova página
          if (spaceAvailable < MINIMUM_SPACE_REQUIRED) {
            pdf.addPage();
            stats.totalPages++;
            currentY = margin;
            console.log(`🚨 EMERGÊNCIA: Nova página forçada (apenas ${spaceAvailable.toFixed(1)}mm disponível)`);
          }
          
          // DECISÃO: Full-Page ou Inline?
          const useFullPage = shouldUseDedicatedPage(
            estimatedImageHeight,
            imageData.height / imageData.width,
            currentY,
            bloco,
            pageHeight - margin - currentY
          );
          
          if (useFullPage) {
            // Sempre começar full-page em página nova
            if (currentY > margin + 10) { // Se já há conteúdo na página
              pdf.addPage();
              stats.totalPages++;
              currentY = margin;
              console.log('📄 Nova página para Full-Page Mode');
            }
          } else {
            // INLINE: Verificar se REALMENTE cabe
            const FOOTER_SAFE_ZONE = 25; // AUMENTADO: 20mm → 25mm
            const actualSpace = pageHeight - margin - currentY - FOOTER_SAFE_ZONE;
            
            if (estimatedImageHeight > actualSpace && actualSpace < 80) {
              // Não cabe de forma legível: nova página
              pdf.addPage();
              stats.totalPages++;
              currentY = margin;
              console.log(`📄 Nova página: imagem inline não cabe (precisa ${estimatedImageHeight.toFixed(1)}mm, tem ${actualSpace.toFixed(1)}mm)`);
            }
          }
          
          // FASE 3: Prevenir órfão visual (texto isolado antes de imagem grande)
          
          if (i > 0 && estimatedImageHeight > 80) {
            const previousBlock = options.structuredData.conteudo[i - 1];
            const linesOnCurrentPage = (currentY - margin) / 6.5;
            
            // CORREÇÃO 1: Incluir títulos na verificação de órfão visual
            if ((previousBlock.tipo === 'paragrafo' || 
                 previousBlock.tipo === 'h2' || 
                 previousBlock.tipo === 'h3' || 
                 previousBlock.tipo === 'h4') && 
                linesOnCurrentPage < 3 && linesOnCurrentPage > 0.5) {
              // Criar nova página e re-renderizar parágrafo
              pdf.addPage();
              stats.totalPages++;
              const oldY = currentY;
              currentY = margin;
              
              // Re-renderizar parágrafo anterior
              currentY = addTextBlockToPDF(
                pdf, previousBlock, currentY, margin, contentWidth, 
                pageWidth, pageHeight, smartTextSplit, renderJustifiedLine
              );
              
              console.log(`🛡️ Órfão visual evitado: ${linesOnCurrentPage.toFixed(1)} linhas movidas para nova página`);
            }
          }
          // FASE 2: Calcular dimensões otimizadas baseadas em aspectRatio
          const aspectRatio = imageData.height / imageData.width;
          let imageWidth: number;
          
          // FASE 2: Tamanho variável baseado em tipo de imagem
          if (aspectRatio < 0.7) {
            // Imagens horizontais (diagramas, gráficos)
            imageWidth = contentWidth * 0.85;
          } else if (aspectRatio > 1.3) {
            // Imagens verticais (fluxogramas)
            imageWidth = contentWidth * 0.60;
          } else {
            // Imagens quadradas (post-its, caixas)
            imageWidth = contentWidth * 0.70;
          }
          
          let imageHeight = (imageData.height / imageData.width) * imageWidth;
          let xPosition = margin + (contentWidth - imageWidth) / 2; // FASE 2: Sempre centralizar

          const FOOTER_SAFE_ZONE = 20; // 15mm rodapé + 5mm buffer
          const availableSpace = pageHeight - margin - currentY - FOOTER_SAFE_ZONE;
          
          // FASE 3: DECISÃO INTELIGENTE - Full-Page vs Normal
          if (shouldUseDedicatedPage(imageHeight, aspectRatio, currentY, bloco, availableSpace)) {
            // MODO FULL-PAGE: Página dedicada para legibilidade máxima
            renderImageFullPage(
              pdf,
              imageData,
              pageWidth,
              pageHeight,
              margin
            );
            
            // FASE 1: SEMPRE forçar nova página após full-page (ZERO aproveitamento de espaço)
            pdf.addPage();
            stats.totalPages++;
            currentY = margin;
            lastImageBottom = pageHeight; // FASE 3: Marcar que última imagem ocupou página inteira
            lastBlockWasFullPage = true;
            
            console.log('✅ Full-page finalizado, forçando nova página para próximo bloco');
            console.log('📊 Estatística: Imagem renderizada em Full-Page Mode');
            
          } else {
            // MODO NORMAL: Renderizar na página atual
            
            // FASE 5: Detecção inteligente de espaço para imagens
            const maxImageHeight = pageHeight - margin - currentY - FOOTER_SAFE_ZONE;
            const needsNewPage = availableSpace < (imageHeight * 0.5); // < 50% da altura original
            
            if (needsNewPage && currentY > margin + 30) {
              // Criar nova página se espaço < 50% da altura original
              pdf.addPage();
              stats.totalPages++;
              currentY = margin;
              console.log('📄 Nova página para imagem (espaço insuficiente)');
            } else if (imageHeight > maxImageHeight && maxImageHeight > 80) {
              // Redimensionar APENAS se ainda couber de forma legível (min 80mm)
              const scaleFactor = maxImageHeight / imageHeight;
              imageHeight = maxImageHeight;
              imageWidth = imageWidth * scaleFactor;
              xPosition = margin + (contentWidth - imageWidth) / 2; // Re-centralizar
              console.log('📐 Imagem ajustada para caber na página (Modo Normal)');
            }
            
            // Verificar quebra de página final
            if (currentY + imageHeight > pageHeight - margin - FOOTER_SAFE_ZONE) {
              pdf.addPage();
              stats.totalPages++;
              currentY = margin;
              console.log('📄 Nova página criada (Modo Normal)');
            }
            
            // Renderizar imagem
            pdf.addImage(
              imageData.base64,
              imageData.base64.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG',
              xPosition,
              currentY,
              imageWidth,
              imageHeight
            );
            
            // FASE 2: Espaçamento MASSIVO após imagens inline (+40%)
            let imageSpacing = 20; // AUMENTADO: 15mm → 20mm
            if (imageHeight > 100) {
              imageSpacing = 35; // AUMENTADO: 25mm → 35mm
            } else if (imageHeight > 60) {
              imageSpacing = 28; // AUMENTADO: 20mm → 28mm
            }
            
            // Detectar diagramas técnicos e adicionar espaço extra
            const isDiagram = bloco.tipo === 'fluxograma' || 
                              bloco.tipo === 'diagrama' || 
                              bloco.tipo === 'mapa_mental' ||
                              (bloco.tipo === 'componente_react' && bloco.texto?.includes('mermaid'));
            
            if (isDiagram) {
              imageSpacing += 15; // AUMENTADO: +10mm → +15mm
              console.log('📊 Espaçamento extra aplicado: diagrama técnico (+15mm)');
            }
            
            // Se imagem foi redimensionada, adicionar buffer extra
            const originalHeight = (imageData.height / imageData.width) * imageWidth;
            const wasResized = Math.abs(imageHeight - originalHeight) > 5;
            if (wasResized) {
              imageSpacing += 10; // AUMENTADO: +8mm → +10mm
              console.log('🔧 Espaçamento extra: imagem redimensionada (+10mm)');
            }
            
            currentY += imageHeight + imageSpacing;
            lastImageBottom = currentY; // FASE 3: Registrar onde imagem terminou
            lastBlockWasImage = true;
            
            console.log(`✅ Imagem inline: ${imageWidth.toFixed(1)}mm x ${imageHeight.toFixed(1)}mm (espaçamento: ${imageSpacing}mm)`);
            console.log(`📍 Posição atual: ${currentY.toFixed(1)}mm | Última imagem: ${lastImageBottom.toFixed(1)}mm`);
          }

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
        
        // FASE 4: DETECÇÃO PROATIVA de colisão ANTES de renderizar texto
        const MINIMUM_DISTANCE_FROM_IMAGE = 25; // 25mm de buffer de segurança
        
        if (lastBlockWasImage && lastImageBottom > 0) {
          const distanceFromImage = currentY - lastImageBottom;
          
          if (distanceFromImage < MINIMUM_DISTANCE_FROM_IMAGE) {
            pdf.addPage();
            stats.totalPages++;
            currentY = margin;
            lastImageBottom = 0; // Reset após nova página
            console.log(`🚨 COLISÃO EVITADA: Texto estava a ${distanceFromImage.toFixed(1)}mm da imagem (mínimo: ${MINIMUM_DISTANCE_FROM_IMAGE}mm)`);
          }
        }
        
        // CORREÇÃO 4: Passar flag lastBlockWasImage para ajustar espaçamento
        (bloco as any).__lastBlockWasImage = lastBlockWasImage;
        
        currentY = addTextBlockToPDF(
          pdf, 
          bloco, 
          currentY, 
          margin, 
          contentWidth, 
          pageWidth, 
          pageHeight,
          smartTextSplit,
          renderJustifiedLine
        );
        stats.nativeTextBlocks++;
        
        // Reset flag após renderizar texto
        lastBlockWasImage = false;

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
      
      // FASE 3: Número da página (centro, roxo) - Fonte maior
      pdf.setFontSize(10); // FASE 3: Aumentado de 9pt para 10pt (+11%)
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(63, 45, 175); // Roxo
      pdf.text(
        `Pagina ${i} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      
      // FASE 3: Nome do documento (esquerda, rosa) - Fonte maior
      pdf.setFontSize(9); // FASE 3: Aumentado de 7pt para 9pt (+29%)
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(255, 70, 130); // Rosa
      const truncatedTitle = options.title.substring(0, 40) + (options.title.length > 40 ? '...' : '');
      pdf.text(truncatedTitle, margin, pageHeight - 10);
      
      // FASE 3: "NextClass AI" (direita, roxo claro) - Fonte maior
      pdf.setFontSize(9); // FASE 3: Aumentado de 7pt para 9pt (+29%)
      pdf.setTextColor(145, 127, 251); // Roxo claro
      pdf.text('NextClass AI', pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    // Download
    const fileName = `${options.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.pdf`;
    pdf.save(fileName);

    stats.captureTime = Date.now() - startTime;
    console.log('✅ [VisualPDF] Geração concluída em', stats.captureTime, 'ms');
    if (fullPageImagesCount > 0) {
      console.log(`🖼️ Imagens em Full-Page Mode: ${fullPageImagesCount}`);
    }
    // FASE 6: Estatísticas de qualidade
    if (pageBreaksPreventedForText > 0) {
      console.log(`📄 Quebras de página evitadas: ${pageBreaksPreventedForText}`);
    }
    if (orphansAvoided > 0) {
      console.log(`🔧 Órfãos corrigidos: ${orphansAvoided}`);
    }

    return {
      success: true,
      stats: {
        ...stats,
        fullPageImages: fullPageImagesCount,
        pageBreaksPreventedForText,
        orphansAvoided
      } as any,
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

    // FASE 2: Resolução adaptativa (10 pixels por mm)
    const targetPxWidth = Math.round(maxWidth * 10); // 10px por mm para alta qualidade
    const resizedCanvas = resizeCanvas(canvas, targetPxWidth);
    
    // FASE 2: PNG para diagramas (preserva texto), JPEG para fotos
    const isDiagram = bloco.tipo.includes('diagrama') || bloco.tipo.includes('fluxograma') || 
                      bloco.tipo.includes('mapa_mental') || bloco.tipo === 'grafico';
    const hasTransparency = bloco.tipo === 'post_it' || bloco.tipo === 'componente_react';
    const base64 = isDiagram || hasTransparency ? 
                   resizedCanvas.toDataURL('image/png', 0.92) : 
                   compressImage(resizedCanvas, false);

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
  pageHeight: number,
  smartTextSplit: (pdf: jsPDF, text: string, maxWidth: number, preserveWords?: string[]) => string[],
  renderJustifiedLine: (pdf: jsPDF, text: string, x: number, y: number, maxWidth: number, isLastLine?: boolean) => void
): number => {
  pdf.setTextColor(0, 0, 0);

  // FASE 4: Aplicar conversão automática de markdown residual
  const processedBloco = detectAndConvertMarkdown(bloco);
  
  // CORREÇÃO 4: Receber flag lastBlockWasImage como parâmetro
  const isAfterImage = (bloco as any).__lastBlockWasImage || false;

  switch (processedBloco.tipo) {
    case 'h2':
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(63, 45, 175); // Roxo escuro
      
      // CORREÇÃO 4: Espaçamento adaptativo antes de H2 (maior após imagens)
      const h2Spacing = isAfterImage ? 15 : 10; // +5mm após imagem
      currentY += h2Spacing;
      if (isAfterImage) {
        console.log('📐 Espaçamento aumentado: H2 após imagem (+5mm)');
      }
      
      const h2Lines = pdf.splitTextToSize(processedBloco.texto || '', contentWidth);
      pdf.text(h2Lines, margin, currentY);
      
      const h2Height = h2Lines.length * 7;
      currentY += h2Height;
      
      // FASE 5: Linha rosa decorativa mais espessa
      pdf.setDrawColor(255, 70, 130); // Rosa
      pdf.setLineWidth(1.2); // ANTES: 0.8, AGORA: 1.2mm (50% mais espesso)
      const underlineLength = Math.min(pdf.getTextWidth(processedBloco.texto || '') + 5, 80);
      pdf.line(margin, currentY, margin + underlineLength, currentY); // Linha proporcional ao texto
      currentY += 8; // FASE 4: Aumentado de 6mm para 8mm (dobro do espaço)
      break;

    case 'h3':
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(145, 127, 251); // Roxo claro
      
      // CORREÇÃO 4: Espaçamento adaptativo antes de H3 (maior após imagens)
      const h3SpacingBefore = isAfterImage ? 12 : 8; // +4mm após imagem
      currentY += h3SpacingBefore;
      if (isAfterImage) {
        console.log('📐 Espaçamento aumentado: H3 após imagem (+4mm)');
      }
      
      const h3Lines = pdf.splitTextToSize(processedBloco.texto || '', contentWidth);
      pdf.text(h3Lines, margin, currentY);
      
      const h3Height = h3Lines.length * 6;
      currentY += h3Height;
      
      // FASE 5: Linha roxa decorativa mais visível
      pdf.setDrawColor(145, 127, 251); // Roxo claro
      pdf.setLineWidth(0.8); // ANTES: 0.5, AGORA: 0.8mm
      const h3UnderlineLength = Math.min(pdf.getTextWidth(processedBloco.texto || '') + 3, 60);
      pdf.line(margin, currentY, margin + h3UnderlineLength, currentY);
      currentY += 6;
      break;

    case 'h4':
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 113, 160); // Rosa claro
      const h4Lines = pdf.splitTextToSize(processedBloco.texto || '', contentWidth);
      pdf.text(h4Lines, margin, currentY);
      currentY += h4Lines.length * 5 + 5; // FASE 4: Aumentado de 4mm para 5mm
      break;

    case 'paragrafo':
      pdf.setFontSize(11);
      pdf.setTextColor(40, 40, 40);
      
      // FASE 2: Sanitizar markdown antes de processar
      const { cleanText: sanitizedText, hasBold: hasMarkdown } = sanitizeMarkdown(processedBloco.texto || '');
      
      // FASE 1: Estimativa PRECISA de altura para parágrafos com negrito (simulação dry-run)
      let estimatedLines: number;
      
      if (hasMarkdown) {
        // NOVO: Simulação precisa de quebra de linhas considerando largura de negrito
        const words: Array<{text: string, bold: boolean}> = [];
        const keywordPattern = /\*\*(.*?)\*\*/g;
        const parts = sanitizedText.split(keywordPattern);
        
        parts.forEach((part, index) => {
          if (!part) return;
          const isBold = index % 2 === 1;
          part.split(' ').filter(w => w.trim()).forEach(word => {
            words.push({ text: word, bold: isBold });
          });
        });
        
        // Simular quebra de linhas (dry-run)
        pdf.setFontSize(11);
        let simulatedLines = 1;
        let currentLineWidth = 0;
        const spaceWidth = pdf.getTextWidth(' ');
        
        words.forEach(word => {
          pdf.setFont('helvetica', word.bold ? 'bold' : 'normal');
          const wordWidth = pdf.getTextWidth(word.text);
          const nextWidth = currentLineWidth + wordWidth + (currentLineWidth > 0 ? spaceWidth : 0);
          
          if (nextWidth > contentWidth) {
            simulatedLines++;
            currentLineWidth = wordWidth;
          } else {
            currentLineWidth = nextWidth;
          }
        });
        
        estimatedLines = simulatedLines;
        console.log(`📏 Estimativa precisa: ${estimatedLines} linhas (texto com negrito)`);
      } else {
        estimatedLines = smartTextSplit(pdf, sanitizedText, contentWidth * 1.05).length;
      }
      
      const totalParagraphHeight = estimatedLines * 6.5 + 11; // linhas + espaço pós-parágrafo
      
      // Se parágrafo NÃO CABE completamente, criar nova página ANTES
      if (currentY + totalParagraphHeight + 20 > pageHeight - margin) {
        pdf.addPage();
        currentY = margin;
        console.log('📄 Nova página: parágrafo completo protegido do rodapé');
      }
      
      if (hasMarkdown) {
        // CORREÇÃO 1: Renderização inline palavra por palavra para evitar isolamento
        const words: Array<{text: string, bold: boolean}> = [];
        
        // Parser palavra por palavra mantendo negrito
        const keywordPattern = /\*\*(.*?)\*\*/g;
        const parts = sanitizedText.split(keywordPattern);
        
        parts.forEach((part, index) => {
          if (!part) return;
          
          // Índices ímpares são conteúdo entre **
          const isBold = index % 2 === 1;
          
          part.split(' ').filter(w => w.trim()).forEach(word => {
            words.push({ text: word, bold: isBold });
          });
        });
        
        // Renderizar palavra por palavra com quebra de linha inteligente
        let lineY = currentY;
        let lineX = margin;
        let currentLineWords: typeof words = [];
        let currentLineWidth = 0;
        
        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          pdf.setFont('helvetica', word.bold ? 'bold' : 'normal');
          const wordWidth = pdf.getTextWidth(word.text);
          const spaceWidth = pdf.getTextWidth(' ');
          
          const nextWidth = currentLineWidth + wordWidth + (currentLineWords.length > 0 ? spaceWidth : 0);
          
          if (nextWidth > contentWidth && currentLineWords.length > 0) {
            // FASE 1: Verificação de rodapé ANTES de renderizar linha
            const lineHeight = 6.5;
            if (lineY + lineHeight + 20 > pageHeight - margin) {
              pdf.addPage();
              lineY = margin;
              console.log('📄 Nova página: texto próximo ao rodapé (renderização inline)');
            }
            
            // Quebra de linha: renderizar linha atual
            let x = margin;
            currentLineWords.forEach((w) => {
              pdf.setFont('helvetica', w.bold ? 'bold' : 'normal');
              pdf.text(w.text, x, lineY);
              x += pdf.getTextWidth(w.text) + spaceWidth;
            });
            
            // Nova linha
            lineY += lineHeight;
            currentLineWords = [word];
            currentLineWidth = wordWidth;
          } else {
            currentLineWords.push(word);
            currentLineWidth = nextWidth;
          }
        }
        
        // Renderizar última linha
        if (currentLineWords.length > 0) {
          // FASE 1: Verificação de rodapé para última linha
          const lineHeight = 6.5;
          if (lineY + lineHeight + 20 > pageHeight - margin) {
            pdf.addPage();
            lineY = margin;
            console.log('📄 Nova página: última linha próxima ao rodapé');
          }
          
          let x = margin;
          currentLineWords.forEach(w => {
            pdf.setFont('helvetica', w.bold ? 'bold' : 'normal');
            pdf.text(w.text, x, lineY);
            x += pdf.getTextWidth(w.text) + pdf.getTextWidth(' ');
          });
        }
        
        currentY = lineY + 11; // Espaço após parágrafo
        console.log('✅ Parágrafo com negrito renderizado inline');
      } else {
        // FASE 2 + FASE 3: Usar smartTextSplit + justificação para parágrafos sem negrito
        pdf.setFont('helvetica', 'normal');
        // CORREÇÃO 3: Aumentar tolerância de 2% para 5% para melhor justificação
        const lines = smartTextSplit(pdf, sanitizedText, contentWidth * 1.05);
        console.log('📏 Linha expandida para justificação (+5%)');
        
        lines.forEach((line, index) => {
          // FASE 1: Verificação de rodapé ANTES de cada linha
          const lineHeight = 6.5;
          if (currentY + lineHeight + 20 > pageHeight - margin) {
            pdf.addPage();
            currentY = margin;
            console.log('📄 Nova página: texto próximo ao rodapé (justificado)');
          }
          
          const isLastLine = index === lines.length - 1;
          renderJustifiedLine(pdf, line, margin, currentY, contentWidth, isLastLine);
          currentY += lineHeight;
        });
        
        currentY += 5;
      }
      break;

    case 'referencias':
      // Adicionar espaço antes das referências
      if (currentY + 20 > pageHeight - margin) {
        pdf.addPage();
        currentY = margin;
      }
      
      // Título com cor roxa
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
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
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(60, 60, 60);
      
      bloco.itens?.forEach((ref: string, index: number) => {
        const estimatedHeight = Math.ceil(ref.length / 80) * 4 + 3;
        if (currentY + estimatedHeight > pageHeight - margin - 15) {
          pdf.addPage();
          currentY = margin;
        }
        
        // Número da referência em rosa
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 70, 130); // Rosa
        pdf.text(`[${index + 1}]`, margin, currentY);
        
        // Texto da referência
        pdf.setFont('helvetica', 'normal');
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
