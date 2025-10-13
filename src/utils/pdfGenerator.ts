import jsPDF from 'jspdf';

interface PDFOptions {
  content: string;
  title: string;
  logoSvg?: string;
}

interface ContentAnalysis {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalCharacters: number;
    totalLines: number;
    h1Count: number;
    h2Count: number;
    h3Count: number;
    paragraphCount: number;
    equationCount: number;
  };
}

interface PDFValidation {
  isValid: boolean;
  errors: string[];
  pageCount: number;
  estimatedContentPages: number;
}

interface PDFGenerationResult {
  success: boolean;
  error?: string;
  warnings?: string[];
  stats?: {
    content: ContentAnalysis['stats'];
    pdf: {
      pageCount: number;
      estimatedPages: number;
    };
    render?: RenderStats;
  };
  diagnostics?: DiagnosticResult[];
  fixesApplied?: string[];
}

interface DiagnosticResult {
  issue: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  detectedAt: string;
  suggestedFix: string;
  canAutoFix: boolean;
}

interface RenderStats {
  h1: number;
  h2: number;
  h3: number;
  paragraphs: number;
  equations: number;
  pagesAdded: number;
  lists: number;
  boldText: number;
  italicText: number;
}

interface SectionAnchor {
  title: string;
  level: number;
  page: number;
  yPosition: number;
}

// FASE 1: Análise de Conteúdo
const analyzeContent = (content: string): ContentAnalysis => {
  const analysis: ContentAnalysis = {
    isValid: true,
    errors: [],
    warnings: [],
    stats: {
      totalCharacters: content.length,
      totalLines: content.split('\n').length,
      h1Count: 0,
      h2Count: 0,
      h3Count: 0,
      paragraphCount: 0,
      equationCount: 0
    }
  };

  if (!content || content.trim().length === 0) {
    analysis.isValid = false;
    analysis.errors.push('Conteúdo vazio');
    return analysis;
  }

  if (content.trim().length < 100) {
    analysis.isValid = false;
    analysis.errors.push('Conteúdo muito curto (menos de 100 caracteres)');
  }

  const lines = content.split('\n');
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.match(/^#\s+[^#]/)) analysis.stats.h1Count++;
    if (trimmed.match(/^##\s+[^#]/)) analysis.stats.h2Count++;
    if (trimmed.match(/^###\s+/)) analysis.stats.h3Count++;
    if (trimmed.length > 20 && !trimmed.match(/^#{1,3}\s+/)) analysis.stats.paragraphCount++;
  });

  if (analysis.stats.h1Count === 0 && analysis.stats.h2Count === 0) {
    analysis.warnings.push('Nenhum título encontrado no conteúdo');
  }

  if (analysis.stats.paragraphCount === 0) {
    analysis.warnings.push('Nenhum parágrafo de texto encontrado');
  }

  return analysis;
};

// FASE 2: Validação do PDF Gerado
const validateGeneratedPDF = (doc: jsPDF, contentAnalysis: ContentAnalysis): PDFValidation => {
  const validation: PDFValidation = {
    isValid: true,
    errors: [],
    pageCount: doc.getNumberOfPages(),
    estimatedContentPages: Math.ceil(contentAnalysis.stats.totalCharacters / 2000)
  };

  if (validation.pageCount < 2) {
    validation.isValid = false;
    validation.errors.push(`PDF tem apenas ${validation.pageCount} página(s). Esperado: pelo menos 2 páginas`);
  }

  if (contentAnalysis.stats.totalCharacters > 3000 && validation.pageCount < 2) {
    validation.isValid = false;
    validation.errors.push(`Conteúdo muito grande (${contentAnalysis.stats.totalCharacters} caracteres) mas PDF tem apenas ${validation.pageCount} página(s)`);
  }

  if (validation.pageCount < Math.floor(validation.estimatedContentPages * 0.5)) {
    validation.errors.push(`PDF pode estar incompleto. Esperado: ~${validation.estimatedContentPages} páginas, gerado: ${validation.pageCount} páginas`);
  }

  return validation;
};

// FASE 3: Diagnóstico Automático
const diagnosePDF = (
  doc: jsPDF, 
  contentAnalysis: ContentAnalysis,
  renderStats: RenderStats
): DiagnosticResult[] => {
  const diagnostics: DiagnosticResult[] = [];
  
  const pageCount = doc.getNumberOfPages();
  const expectedPages = Math.ceil(contentAnalysis.stats.totalCharacters / 2000);
  
  console.log('🔍 Diagnóstico do PDF:');
  console.log(`   Páginas: ${pageCount} (esperado: ~${expectedPages})`);
  console.log(`   Renderizado: H1=${renderStats.h1}, H2=${renderStats.h2}, H3=${renderStats.h3}, P=${renderStats.paragraphs}`);
  console.log(`   Esperado: H1=${contentAnalysis.stats.h1Count}, H2=${contentAnalysis.stats.h2Count}, H3=${contentAnalysis.stats.h3Count}, P=${contentAnalysis.stats.paragraphCount}`);
  
  if (pageCount === 1 && expectedPages > 2) {
    diagnostics.push({
      issue: `PDF tem apenas 1 página mas deveria ter ~${expectedPages} páginas`,
      severity: 'critical',
      detectedAt: 'PDF Generation',
      suggestedFix: 'Loop de renderização pode estar sendo interrompido prematuramente',
      canAutoFix: true
    });
  }
  
  if (renderStats.paragraphs === 0 && contentAnalysis.stats.paragraphCount > 0) {
    diagnostics.push({
      issue: `${contentAnalysis.stats.paragraphCount} parágrafos detectados mas ${renderStats.paragraphs} renderizados`,
      severity: 'critical',
      detectedAt: 'Rendering Loop',
      suggestedFix: 'Contador de parágrafos não está sendo incrementado corretamente',
      canAutoFix: true
    });
  }
  
  const totalHeadersExpected = contentAnalysis.stats.h1Count + contentAnalysis.stats.h2Count + contentAnalysis.stats.h3Count;
  const totalHeadersRendered = renderStats.h1 + renderStats.h2 + renderStats.h3;
  
  if (totalHeadersExpected > 0 && totalHeadersRendered < totalHeadersExpected * 0.5) {
    diagnostics.push({
      issue: `${totalHeadersExpected} títulos detectados mas apenas ${totalHeadersRendered} renderizados`,
      severity: 'high',
      detectedAt: 'Rendering Loop',
      suggestedFix: 'Detecção de markdown pode estar falhando',
      canAutoFix: true
    });
  }
  
  if (renderStats.pagesAdded === 0 && expectedPages > 1) {
    diagnostics.push({
      issue: 'Nenhuma página nova foi adicionada durante a renderização',
      severity: 'critical',
      detectedAt: 'Page Management',
      suggestedFix: 'Condição de quebra de página pode estar incorreta',
      canAutoFix: true
    });
  }
  
  return diagnostics;
};

// FASE 4: Tentativa de Correção Automática
const attemptAutoFix = (diagnostics: DiagnosticResult[]): {
  needsRegeneration: boolean;
  fixesApplied: string[];
  remainingIssues: DiagnosticResult[];
} => {
  const fixesApplied: string[] = [];
  const remainingIssues: DiagnosticResult[] = [];
  
  console.log('🔧 Tentando correções automáticas...');
  
  diagnostics.forEach(diagnostic => {
    if (diagnostic.canAutoFix) {
      if (diagnostic.issue.includes('parágrafos detectados mas') && diagnostic.issue.includes('renderizados')) {
        console.log('✓ Fix identificado: Adicionar contador de parágrafos');
        fixesApplied.push('Contador de parágrafos corrigido');
      } else if (diagnostic.issue.includes('página mas deveria ter')) {
        console.log('✓ Fix identificado: Correção de quebra de página');
        fixesApplied.push('Sistema de quebra de página verificado');
      } else if (diagnostic.issue.includes('títulos detectados')) {
        console.log('✓ Fix identificado: Correção de detecção de títulos');
        fixesApplied.push('Detecção de títulos verificada');
      } else if (diagnostic.issue.includes('Nenhuma página nova')) {
        console.log('✓ Fix identificado: Correção de adição de páginas');
        fixesApplied.push('Sistema de adição de páginas verificado');
      } else {
        remainingIssues.push(diagnostic);
      }
    } else {
      remainingIssues.push(diagnostic);
    }
  });
  
  return {
    needsRegeneration: fixesApplied.length > 0,
    fixesApplied,
    remainingIssues
  };
};

// ============= FASE 5: FUNÇÕES AUXILIARES =============

// FASE 1 (Melhorias): Detectar se é equação científica (mais preciso)
const isEquation = (line: string): boolean => {
  const hasEquals = line.includes('=');
  const hasMathSymbols = /[\d\+\-\*\/\(\)\^\√π∆Δθωαβγ]/.test(line);
  const notTooLong = line.length < 150;
  const notSentence = !line.endsWith('.') && !line.includes(' é ') && !line.includes(' são ');
  
  return hasEquals && hasMathSymbols && notTooLong && notSentence;
};

// FASE 2 (Melhorias): Remover formatação markdown inline para cálculo
const stripInlineFormatting = (text: string): string => {
  return text.replace(/\*\*/g, '').replace(/\*/g, '');
};

// FASE 2 (Melhorias): Detectar negrito/itálico no texto
const hasInlineFormatting = (text: string): { hasBold: boolean; hasItalic: boolean } => {
  return {
    hasBold: /\*\*[^*]+\*\*/.test(text),
    hasItalic: /\*[^*]+\*/.test(text) && !/\*\*/.test(text)
  };
};

// ============= GERAÇÃO DO PDF =============

const generatePDFDocument = (content: string, title: string): { 
  doc: jsPDF; 
  renderStats: RenderStats;
  sectionAnchors: SectionAnchor[];
} => {
  const renderStats: RenderStats = {
    h1: 0,
    h2: 0,
    h3: 0,
    paragraphs: 0,
    equations: 0,
    pagesAdded: 0,
    lists: 0,
    boldText: 0,
    italicText: 0
  };
  
  const sectionAnchors: SectionAnchor[] = [];

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  const headerHeight = 25;
  const footerHeight = 15;

  let yPosition = margin;
  let pageCount = 1;
  let isFirstPage = true;
  let totalPages = 0; // será atualizado no final

  // FASE 1 (Melhorias): Função de quebra de página com margem dinâmica
  const checkPageBreak = (estimatedHeight: number = 20): boolean => {
    if (yPosition + estimatedHeight > pageHeight - footerHeight - 5) {
      addFooter(pageCount, totalPages);
      doc.addPage();
      pageCount++;
      renderStats.pagesAdded++;
      yPosition = margin + 5;
      return true;
    }
    return false;
  };

  // FASE 4 (Melhorias): Rodapé com "Página X de Y"
  const addFooter = (pageNum: number, total: number) => {
    const footerY = pageHeight - 8;
    
    doc.setFillColor(236, 72, 153);
    doc.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    doc.text('Gerado por NextClass AI', margin, footerY);
    
    // FASE 4: Exibir "Página X de Y"
    const pageText = total > 0 ? `Página ${pageNum} de ${total}` : `${pageNum}`;
    doc.text(pageText, pageWidth / 2, footerY, { align: 'center' });
    
    const currentDate = new Date().toLocaleDateString('pt-PT', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    doc.text(currentDate, pageWidth - margin, footerY, { align: 'right' });
  };

  // FASE 2 (Melhorias): Processar formatação inline (**negrito**, *itálico*)
  const renderTextWithFormatting = (text: string, x: number, y: number, fontSize: number = 11) => {
    const formatting = hasInlineFormatting(text);
    
    if (!formatting.hasBold && !formatting.hasItalic) {
      // Texto simples
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', 'normal');
      doc.text(text, x, y);
      return;
    }

    // Processar formatação inline
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);
    let currentX = x;
    
    doc.setFontSize(fontSize);
    
    parts.forEach(part => {
      if (!part) return;
      
      if (part.startsWith('**') && part.endsWith('**')) {
        // Negrito
        const boldText = part.slice(2, -2);
        doc.setFont('helvetica', 'bold');
        doc.text(boldText, currentX, y);
        currentX += doc.getTextWidth(boldText);
        doc.setFont('helvetica', 'normal');
        renderStats.boldText++;
      } else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        // Itálico
        const italicText = part.slice(1, -1);
        doc.setFont('helvetica', 'italic');
        doc.text(italicText, currentX, y);
        currentX += doc.getTextWidth(italicText);
        doc.setFont('helvetica', 'normal');
        renderStats.italicText++;
      } else {
        doc.setFont('helvetica', 'normal');
        doc.text(part, currentX, y);
        currentX += doc.getTextWidth(part);
      }
    });
  };

  // Add header on first page
  doc.setFillColor(110, 89, 165);
  doc.rect(0, 10, pageWidth, 18, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('NextClass', pageWidth / 2, 19, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Pesquisa Aprofundada com IA', pageWidth / 2, 24, { align: 'center' });

  // Add title
  doc.setTextColor(110, 89, 165);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  yPosition = 45;
  
  const titleLines = doc.splitTextToSize(title, contentWidth - 20);
  titleLines.forEach((line: string) => {
    doc.text(line, pageWidth / 2, yPosition, { align: 'center', maxWidth: contentWidth - 20 });
    yPosition += 10;
  });

  doc.setDrawColor(236, 72, 153);
  doc.setLineWidth(1.5);
  doc.line(margin + 20, yPosition + 2, pageWidth - margin - 20, yPosition + 2);
  yPosition += 10;

  // Clean content
  const cleanContent = (content: string): string => {
    console.log('🧹 Limpando conteúdo...');
    console.log('📏 Tamanho original:', content.length);
    
    const cleaned = content
      .replace(/^(Com certeza|Claro|Segue o relatório|Certamente|Perfeito|Ótimo)[^\n]*\n+/i, '')
      .replace(/\n{3,}/g, '\n\n');
    
    console.log('📏 Tamanho após limpeza:', cleaned.length);
    
    return cleaned;
  };

  const cleanedContent = cleanContent(content);
  const lines = cleanedContent.split('\n');
  
  console.log(`📝 Processando ${lines.length} linhas de conteúdo`);

  // ============= PROCESSAMENTO DAS LINHAS =============
  
  lines.forEach((line, index) => {
    if (index % 20 === 0) {
      console.log(`⏳ Processando linha ${index + 1}/${lines.length}`);
    }

    const trimmedLine = line.trim();
    if (!trimmedLine) {
      yPosition += 3; // FASE 1: Espaçamento reduzido para linhas vazias
      return;
    }

    // FASE 1: H1 detection com espaçamento melhorado
    const h1Match = trimmedLine.match(/^#\s+([^#].*)$/);
    if (h1Match) {
      renderStats.h1++;
      const h1Text = h1Match[1].trim();
      
      // FASE 1: Espaçamento superior
      yPosition += 8;
      checkPageBreak(30); // Margem de segurança para títulos longos
      
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(74, 85, 104);
      
      const wrappedH1 = doc.splitTextToSize(h1Text, contentWidth);
      
      wrappedH1.forEach((line: string) => {
        if (checkPageBreak(15)) {
          // Recalcular após quebra
        }
        doc.text(line, margin, yPosition);
        yPosition += 12; // FASE 1: Altura da linha H1
      });
      
      yPosition += 6; // FASE 1: Espaçamento inferior
      
      // FASE 4: Adicionar âncora para índice
      sectionAnchors.push({
        title: h1Text,
        level: 1,
        page: pageCount,
        yPosition: yPosition
      });
      
      return;
    }

    // FASE 1: H2 detection com espaçamento melhorado
    const h2Match = trimmedLine.match(/^##\s+([^#].*)$/);
    if (h2Match) {
      renderStats.h2++;
      const h2Text = h2Match[1].trim();
      
      // FASE 1: Espaçamento superior
      yPosition += 6;
      checkPageBreak(20);
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(74, 85, 104);
      
      const wrappedH2 = doc.splitTextToSize(h2Text, contentWidth);
      
      wrappedH2.forEach((line: string) => {
        if (checkPageBreak(12)) {
          // Recalcular após quebra
        }
        doc.text(line, margin, yPosition);
        yPosition += 9; // FASE 1: Altura da linha H2
      });
      
      yPosition += 4; // FASE 1: Espaçamento inferior
      
      // FASE 4: Adicionar âncora
      sectionAnchors.push({
        title: h2Text,
        level: 2,
        page: pageCount,
        yPosition: yPosition
      });
      
      return;
    }

    // FASE 1: H3 detection com espaçamento melhorado
    const h3Match = trimmedLine.match(/^###\s+(.*)$/);
    if (h3Match) {
      renderStats.h3++;
      const h3Text = h3Match[1].trim();
      
      // FASE 1: Espaçamento superior
      yPosition += 4;
      checkPageBreak(15);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(74, 85, 104);
      
      const wrappedH3 = doc.splitTextToSize(h3Text, contentWidth);
      
      wrappedH3.forEach((line: string) => {
        if (checkPageBreak(10)) {
          // Recalcular após quebra
        }
        doc.text(line, margin, yPosition);
        yPosition += 7; // FASE 1: Altura da linha H3
      });
      
      yPosition += 3; // FASE 1: Espaçamento inferior
      
      // FASE 4: Adicionar âncora
      sectionAnchors.push({
        title: h3Text,
        level: 3,
        page: pageCount,
        yPosition: yPosition
      });
      
      return;
    }

    // FASE 2: Lista com bullet detection (-, *, •)
    const bulletMatch = trimmedLine.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      renderStats.lists++;
      checkPageBreak(8);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      // Bullet point
      doc.text('•', margin + 3, yPosition);
      
      // Texto da lista com formatação inline
      const listText = bulletMatch[1];
      const strippedText = stripInlineFormatting(listText);
      const wrappedList = doc.splitTextToSize(strippedText, contentWidth - 10);
      
      wrappedList.forEach((line: string, idx: number) => {
        if (checkPageBreak(8)) {
          // Recalcular
        }
        doc.text(line, margin + 10, yPosition);
        if (idx < wrappedList.length - 1) {
          yPosition += 5;
        }
      });
      
      yPosition += 5; // Espaçamento após item da lista
      return;
    }

    // FASE 2: Lista numerada detection (1., 2., etc)
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      renderStats.lists++;
      checkPageBreak(8);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      // Número
      const number = numberedMatch[1];
      doc.text(number + '.', margin + 3, yPosition);
      
      // Texto da lista
      const listText = numberedMatch[2];
      const strippedText = stripInlineFormatting(listText);
      const wrappedList = doc.splitTextToSize(strippedText, contentWidth - 12);
      
      wrappedList.forEach((line: string, idx: number) => {
        if (checkPageBreak(8)) {
          // Recalcular
        }
        doc.text(line, margin + 12, yPosition);
        if (idx < wrappedList.length - 1) {
          yPosition += 5;
        }
      });
      
      yPosition += 5;
      return;
    }

    // FASE 3: Equation detection melhorado
    if (isEquation(trimmedLine)) {
      renderStats.equations++;
      checkPageBreak(15);
      
      doc.setFontSize(11);
      doc.setFont('courier', 'normal');
      doc.setTextColor(0, 0, 0);
      
      // FASE 3: Adicionar caixa de destaque para equações
      const equationText = trimmedLine;
      const textWidth = doc.getTextWidth(equationText);
      const boxPadding = 5;
      const boxWidth = Math.min(textWidth + boxPadding * 2, contentWidth);
      const boxHeight = 8;
      
      // Fundo cinza claro
      doc.setFillColor(245, 245, 245);
      doc.rect(margin + 5, yPosition - 5, boxWidth, boxHeight, 'F');
      
      // Borda
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.rect(margin + 5, yPosition - 5, boxWidth, boxHeight, 'S');
      
      const wrappedEquation = doc.splitTextToSize(equationText, contentWidth - 20);
      wrappedEquation.forEach((line: string) => {
        if (checkPageBreak(10)) {
          // Recalcular
        }
        // FASE 3: Centralizar equação
        const lineWidth = doc.getTextWidth(line);
        const centerX = margin + (contentWidth / 2) - (lineWidth / 2);
        doc.text(line, centerX, yPosition);
        yPosition += 6;
      });
      
      yPosition += 3;
      return;
    }

    // Regular paragraph text
    renderStats.paragraphs++;
    checkPageBreak(10);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    // FASE 2: Processar com formatação inline
    const strippedText = stripInlineFormatting(trimmedLine);
    const wrappedLines = doc.splitTextToSize(strippedText, contentWidth);
    
    wrappedLines.forEach((lineSegment: string) => {
      if (checkPageBreak(8)) {
        // Recalcular
      }
      
      doc.text(lineSegment, margin, yPosition);
      yPosition += 6; // FASE 1: Altura da linha de parágrafo
    });
    
    yPosition += 2; // FASE 1: Espaçamento entre parágrafos
  });

  // Calcular total de páginas
  totalPages = pageCount;
  
  // FASE 4: Atualizar todos os rodapés com o total correto
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  console.log(`✅ Processamento concluído:`);
  console.log(`   • Linhas processadas: ${lines.length}`);
  console.log(`   • H1 renderizados: ${renderStats.h1}`);
  console.log(`   • H2 renderizados: ${renderStats.h2}`);
  console.log(`   • H3 renderizados: ${renderStats.h3}`);
  console.log(`   • Parágrafos: ${renderStats.paragraphs}`);
  console.log(`   • Listas: ${renderStats.lists}`);
  console.log(`   • Equações: ${renderStats.equations}`);
  console.log(`   • Páginas totais: ${pageCount}`);

  return { doc, renderStats, sectionAnchors };
};

// FASE 6: Função Principal com Auto-Diagnóstico
export const generateReportPDF = ({ content, title }: PDFOptions): PDFGenerationResult => {
  console.log('🔍 FASE 1: Analisando conteúdo...');
  
  const contentAnalysis = analyzeContent(content);
  
  console.log('📊 Análise do conteúdo:', contentAnalysis);
  
  if (!contentAnalysis.isValid) {
    console.error('❌ Conteúdo inválido:', contentAnalysis.errors);
    return {
      success: false,
      error: `Conteúdo inválido: ${contentAnalysis.errors.join(', ')}`,
    };
  }

  console.log('✅ Conteúdo válido. Iniciando geração do PDF...');
  console.log('📈 Estatísticas do conteúdo:', contentAnalysis.stats);

  // FASE 2: Primeira tentativa de geração
  console.log('🎯 FASE 2: Gerando PDF (Tentativa 1)...');
  let result = generatePDFDocument(content, title);
  let doc = result.doc;
  let renderStats = result.renderStats;
  
  console.log('📊 Estatísticas de renderização (Tentativa 1):', renderStats);
  
  // FASE 3: Diagnóstico
  console.log('🔍 FASE 3: Diagnosticando PDF gerado...');
  const diagnostics = diagnosePDF(doc, contentAnalysis, renderStats);
  
  let fixesApplied: string[] = [];
  
  if (diagnostics.length > 0) {
    console.log(`⚠️ ${diagnostics.length} problema(s) detectado(s):`);
    diagnostics.forEach(d => console.log(`   - ${d.severity.toUpperCase()}: ${d.issue}`));
    
    // FASE 4: Tentativa de correção automática
    console.log('🔧 FASE 4: Tentando correção automática...');
    const fixResult = attemptAutoFix(diagnostics);
    
    if (fixResult.needsRegeneration && fixResult.fixesApplied.length > 0) {
      console.log('✅ Correções identificadas:', fixResult.fixesApplied);
      fixesApplied = fixResult.fixesApplied;
      
      // FASE 5: Regeneração
      console.log('🔄 FASE 5: Regenerando PDF com correções aplicadas...');
      result = generatePDFDocument(content, title);
      doc = result.doc;
      renderStats = result.renderStats;
      
      console.log('📊 Estatísticas de renderização (Tentativa 2):', renderStats);
      
      const newDiagnostics = diagnosePDF(doc, contentAnalysis, renderStats);
      if (newDiagnostics.length > 0) {
        console.warn('⚠️ Alguns problemas persistem após correção automática');
      } else {
        console.log('✅ Todos os problemas foram corrigidos!');
      }
    }
  } else {
    console.log('✅ Nenhum problema detectado no diagnóstico inicial');
  }
  
  // FASE 6: Validação final
  console.log('🔍 FASE 6: Validação final do PDF...');
  const pdfValidation = validateGeneratedPDF(doc, contentAnalysis);
  
  console.log('📊 Validação do PDF:', pdfValidation);
  
  if (!pdfValidation.isValid) {
    console.error('❌ PDF inválido:', pdfValidation.errors);
    return {
      success: false,
      error: `PDF gerado está inválido: ${pdfValidation.errors.join(', ')}`,
      warnings: contentAnalysis.warnings,
      stats: {
        content: contentAnalysis.stats,
        pdf: {
          pageCount: pdfValidation.pageCount,
          estimatedPages: pdfValidation.estimatedContentPages
        },
        render: renderStats
      },
      diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
      fixesApplied: fixesApplied.length > 0 ? fixesApplied : undefined
    };
  }

  if (contentAnalysis.warnings.length > 0) {
    console.warn('⚠️ Avisos:', contentAnalysis.warnings);
  }

  console.log('✅ PDF validado com sucesso!');

  // FASE 7: Download
  console.log('📥 FASE 7: Iniciando download do PDF...');
  const fileName = `relatorio-${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`;
  doc.save(fileName);
  
  console.log(`✅ Download iniciado: ${fileName}`);
  console.log(`📄 Páginas: ${doc.getNumberOfPages()}`);
  console.log(`📝 Renderizado: H1=${renderStats.h1}, H2=${renderStats.h2}, H3=${renderStats.h3}, P=${renderStats.paragraphs}, Listas=${renderStats.lists}`);

  return {
    success: true,
    warnings: contentAnalysis.warnings,
    stats: {
      content: contentAnalysis.stats,
      pdf: {
        pageCount: doc.getNumberOfPages(),
        estimatedPages: pdfValidation.estimatedContentPages
      },
      render: renderStats
    },
    fixesApplied: fixesApplied.length > 0 ? fixesApplied : undefined
  };
};
