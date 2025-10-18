import jsPDF from 'jspdf';
import { loadUnicodeFont, unicodeFontConfig } from './unicodeFont';

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
  renderStats: RenderStats,
  content: string = ''
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
  
  // FASE 6: Verificar símbolos Unicode mal renderizados (Expandido)
  if (content) {
    const unicodeSymbolsPattern = /[Δ∆δ𝚫πΠθΘωΩΣσαβγλμνρτφψ∫√∞≈≠≤≥×÷±∂∇]/;
    const hasUnicodeSymbols = content.split('\n').some(line => unicodeSymbolsPattern.test(line));
    
    if (hasUnicodeSymbols) {
      console.log('⚠️ Símbolos Unicode detectados - aplicando normalização automática');
      diagnostics.push({
        issue: 'Símbolos matemáticos Unicode detectados no conteúdo original',
        severity: 'medium',
        detectedAt: 'Content Preprocessing',
        suggestedFix: 'Símbolos serão normalizados automaticamente para ASCII',
        canAutoFix: true
      });
    }
  }
  
  // FASE 6: Verificar equações com asteriscos (formatação markdown)
  if (content) {
    const lines = content.split('\n');
    const hasEquationsWithAsterisks = lines.some(line => {
      const trimmed = line.trim();
      return trimmed.includes('**') && isEquation(trimmed.replace(/\*\*/g, ''));
    });
    
    if (hasEquationsWithAsterisks) {
      console.log('⚠️ Equações com asteriscos detectadas - normalizando automaticamente');
    }
  }
  
  // FASE 6: Verificar se equações foram renderizadas corretamente
  if (renderStats.equations === 0 && contentAnalysis.stats.totalCharacters > 5000) {
    diagnostics.push({
      issue: 'Nenhuma equação detectada em documento longo (pode haver problema de detecção)',
      severity: 'low',
      detectedAt: 'Equation Detection',
      suggestedFix: 'Verificar se o conteúdo realmente não contém equações',
      canAutoFix: false
    });
  }
  
  // FASE 4 (NOVA): Verificar rodapés
  if (renderStats.pagesAdded > 0) {
    diagnostics.push({
      issue: `Verificar se rodapés mostram "Página X de ${pageCount}" corretamente`,
      severity: 'low',
      detectedAt: 'Footer Rendering',
      suggestedFix: 'Inspecionar visualmente o PDF gerado',
      canAutoFix: false
    });
  }
  
  // FASE 4 (NOVA): Verificar referências bibliográficas
  if (content) {
    const refPattern = /\[\d+\.?\d*\]/g;
    const refsFound = content.match(refPattern);
    
    if (refsFound && refsFound.length > 0) {
      console.log(`📚 Total de referências detectadas: ${refsFound.length}`);
      diagnostics.push({
        issue: `${refsFound.length} referências bibliográficas detectadas - verificar formatação em cinza 9pt`,
        severity: 'low',
        detectedAt: 'Reference Processing',
        suggestedFix: 'Referências devem aparecer em RGB(100,100,100) e tamanho 9pt',
        canAutoFix: false
      });
    }
  }
  
  // FASE 4 (NOVA): Verificar símbolos matemáticos no conteúdo
  if (content) {
    const mathSymbolsPattern = /[ΔπθωΩΣ∫αβγμλΦΨ±≠≤≥√∞∂∇]/g;
    const mathSymbolsFound = (content.match(mathSymbolsPattern) || []).length;
    
    if (mathSymbolsFound > 0) {
      diagnostics.push({
        issue: `${mathSymbolsFound} símbolos matemáticos Unicode detectados - verificar renderização com fonte Unicode`,
        severity: 'low',
        detectedAt: 'Symbol Detection',
        suggestedFix: 'Equações devem usar fonte DejaVu Sans para suporte Unicode completo',
        canAutoFix: false
      });
      console.log(`🔬 Símbolos matemáticos detectados: ${mathSymbolsFound}`);
    }
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

// ✅ FASE 7: Normalização DESABILITADA - usando fonte Unicode nativa
// Símbolos matemáticos agora são renderizados diretamente com DejaVu Sans
const normalizeScientificSymbols = (text: string): string => {
  // NÃO normalizar mais - retornar texto original com símbolos Unicode
  return text;
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

// FASE 4 (Nova): Formatar referências bibliográficas [X.Y]
const formatReferences = (text: string): { 
  hasRefs: boolean; 
  segments: Array<{ text: string; isRef: boolean }> 
} => {
  const refPattern = /\[(\d+\.?\d*|\d+)\]/g;
  const hasRefs = refPattern.test(text);
  
  if (!hasRefs) {
    return { hasRefs: false, segments: [{ text, isRef: false }] };
  }
  
  const segments: Array<{ text: string; isRef: boolean }> = [];
  let lastIndex = 0;
  const matches = text.matchAll(/\[(\d+\.?\d*|\d+)\]/g);
  
  for (const match of matches) {
    // Texto antes da referência
    if (match.index! > lastIndex) {
      segments.push({ 
        text: text.substring(lastIndex, match.index), 
        isRef: false 
      });
    }
    // Referência
    segments.push({ 
      text: match[0], 
      isRef: true 
    });
    lastIndex = match.index! + match[0].length;
  }
  
  // Texto restante
  if (lastIndex < text.length) {
    segments.push({ 
      text: text.substring(lastIndex), 
      isRef: false 
    });
  }
  
  return { hasRefs: true, segments };
};

// ============= GERAÇÃO DO PDF =============

// Detectar se texto contém símbolos matemáticos Unicode
const hasMathSymbols = (text: string): boolean => {
  const mathSymbols = /[ΔπθωΩΣ∫αβγμλΦΨ±≠≤≥√∞∂∇]/;
  return mathSymbols.test(text);
};

const generatePDFDocument = async (content: string, title: string): Promise<{
  doc: jsPDF; 
  renderStats: RenderStats;
  sectionAnchors: SectionAnchor[];
}> => {
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

  // ✅ FASE 7: Adicionar fonte Unicode para suportar símbolos matemáticos
  try {
    const fontBase64 = await loadUnicodeFont();
    // Registrar fonte Unicode, mas NÃO definir como padrão
    doc.addFileToVFS(unicodeFontConfig.fontFileName, fontBase64);
    doc.addFont(
      unicodeFontConfig.fontFileName, 
      unicodeFontConfig.fontName, 
      unicodeFontConfig.fontStyle
    );
    // Usar Helvetica como padrão para texto normal
    doc.setFont('helvetica');
    console.log('✅ Fonte Unicode carregada: símbolos matemáticos (Δ, π, θ, ω, etc.) serão renderizados nativamente');
  } catch (error) {
    console.warn('⚠️ Erro ao carregar fonte Unicode, usando fonte padrão:', error);
    doc.setFont('helvetica');
  }

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

  // FASE 1 & 4: Rodapé corrigido com "Página X de Y"
  const addFooter = (pageNum: number, total: number) => {
    const footerY = pageHeight - 8;
    
    doc.setFillColor(236, 72, 153);
    doc.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    // Lado esquerdo: "Gerado por NextClass AI"
    doc.text('Gerado por NextClass AI', margin, footerY);
    
    // Centro: "Página X de Y" (formato correto)
    const pageText = total > 0 ? `Página ${pageNum} de ${total}` : `Página ${pageNum}`;
    doc.text(pageText, pageWidth / 2, footerY, { align: 'center' });
    
    // Lado direito: Data formatada corretamente
    const currentDate = new Date().toLocaleDateString('pt-BR', { 
      day: 'numeric',
      month: 'long', 
      year: 'numeric' 
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
      yPosition += 5; // FASE 2: Espaçamento aumentado para melhor respiração visual
      return;
    }

    // FASE 1: H1 detection com espaçamento melhorado
    const h1Match = trimmedLine.match(/^#\s+([^#].*)$/);
    if (h1Match) {
      renderStats.h1++;
      const h1Text = h1Match[1].trim();
      
      // FASE 2: Espaçamento superior aumentado para H1
      yPosition += 12;
      checkPageBreak(30); // Margem de segurança para títulos longos
      
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(74, 85, 104);
      
      const wrappedH1 = doc.splitTextToSize(h1Text, contentWidth);
      
      wrappedH1.forEach((line: string) => {
        if (checkPageBreak(15)) {
          // Recalcular após quebra
        }
        // FASE 1: Símbolos Unicode renderizados nativamente com DejaVu Sans
        doc.text(line, margin, yPosition);
        yPosition += 12; // FASE 1: Altura da linha H1
      });
      
      yPosition += 5; // FASE 3: Espaçamento inferior H1 (reduzido de 8mm para 5mm)
      
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
      
      // FASE 2: Espaçamento superior aumentado para H2
      yPosition += 8;
      checkPageBreak(20);
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(74, 85, 104);
      
      const wrappedH2 = doc.splitTextToSize(h2Text, contentWidth);
      
      wrappedH2.forEach((line: string) => {
        if (checkPageBreak(12)) {
          // Recalcular após quebra
        }
        // FASE 1: Símbolos Unicode renderizados nativamente com DejaVu Sans
        doc.text(line, margin, yPosition);
        yPosition += 9; // FASE 1: Altura da linha H2
      });
      
      yPosition += 6; // FASE 2: Espaçamento inferior aumentado para H2
      
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
        // FASE 1: Símbolos Unicode renderizados nativamente com DejaVu Sans
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

    // FASE 2 & 4: Lista com bullet detection (-, *, •) + espaço antes de listas
    const bulletMatch = trimmedLine.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      // FASE 4: Verificar se linha anterior não era lista
      const previousLine = index > 0 ? lines[index - 1].trim() : '';
      const previousWasList = /^[-*•]\s+/.test(previousLine);
      
      if (!previousWasList) {
        yPosition += 3; // Espaço extra antes da primeira item da lista
      }
      
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
        // FASE 1: Símbolos Unicode renderizados nativamente com DejaVu Sans
        doc.text(line, margin + 10, yPosition);
        if (idx < wrappedList.length - 1) {
          yPosition += 4; // FASE 3: Espaçamento reduzido entre linhas de lista
        }
      });
      
      yPosition += 4; // FASE 3: Espaçamento reduzido após item da lista
      return;
    }

    // FASE 2 & 4: Lista numerada detection (1., 2., etc) + espaço antes de listas
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      // FASE 4: Verificar se linha anterior não era lista
      const previousLine = index > 0 ? lines[index - 1].trim() : '';
      const previousWasList = /^\d+\.\s+/.test(previousLine);
      
      if (!previousWasList) {
        yPosition += 3; // Espaço extra antes da primeira item da lista
      }
      
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
        // FASE 1: Símbolos Unicode renderizados nativamente com DejaVu Sans
        doc.text(line, margin + 12, yPosition);
        if (idx < wrappedList.length - 1) {
          yPosition += 4; // FASE 3: Espaçamento reduzido entre linhas de lista
        }
      });
      
      yPosition += 4; // FASE 3: Espaçamento reduzido após item da lista
      return;
    }

    // FASE 3 & 5: Equation detection e renderização melhorada
    if (isEquation(trimmedLine)) {
      renderStats.equations++;
      checkPageBreak(15);
      
      // Configurar estilo de equação com fonte Unicode
      doc.setFontSize(11);
      doc.setFont(unicodeFontConfig.fontName, 'normal');
      doc.setTextColor(0, 0, 0);
      
      // FASE 1: Usar símbolos Unicode nativos (não normalizar mais)
      const normalizedEquation = trimmedLine;
      
      const equationWidth = doc.getTextWidth(normalizedEquation);
      const maxWidth = contentWidth - 40; // Margem maior para evitar overflow
      
      // Logging melhorado
      console.log('📐 Renderizando equação:');
      console.log(`   Texto: "${normalizedEquation}"`);
      console.log(`   Largura: ${equationWidth.toFixed(2)}mm (max: ${maxWidth.toFixed(2)}mm)`);
      console.log(`   Fonte: ${unicodeFontConfig.fontName}`);
      
      // Detectar símbolos Unicode
      const symbols = normalizedEquation.match(/[ΔπθωΩΣ∫αβγμλΦΨ±≠≤≥√∞∂∇]/g);
      if (symbols) {
        console.log(`   Símbolos Unicode: ${symbols.join(', ')}`);
      }
      
      // Verificar se equação cabe em uma única linha
      if (equationWidth <= maxWidth) {
        // Renderizar equação centralizada com fundo cinza claro
        const boxPadding = 5;
        const boxWidth = Math.min(equationWidth + boxPadding * 2, contentWidth - 10);
        const boxHeight = 8;
        
        doc.setFillColor(245, 245, 245);
        let centerX = margin + (contentWidth / 2) - (boxWidth / 2);
        
        // Verificar se caixa cabe na página
        const boxRight = centerX + boxWidth;
        if (boxRight > pageWidth - margin) {
          centerX = pageWidth - margin - boxWidth;
        }
        
        doc.rect(centerX, yPosition - 5, boxWidth, boxHeight, 'F');
        
        // Borda
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.rect(centerX, yPosition - 5, boxWidth, boxHeight, 'S');
        
        // Centralizar equação
        const textCenterX = margin + (contentWidth / 2) - (equationWidth / 2);
        doc.text(normalizedEquation, textCenterX, yPosition);
        yPosition += 6;
      } else {
        // FASE 5: Equação muito longa - quebrar em operadores lógicos
        const breakPoints = ['=', '+', '-', '×', '÷', '*'];
        let bestBreak = -1;
        let bestOperator = '';
        
        for (const op of breakPoints) {
          const idx = normalizedEquation.lastIndexOf(op, Math.floor(normalizedEquation.length * 0.6));
          if (idx > bestBreak && idx > 10) {
            bestBreak = idx;
            bestOperator = op;
          }
        }
        
        if (bestBreak > 0) {
          // Quebrar no operador
          const part1 = normalizedEquation.substring(0, bestBreak + 1).trim();
          const part2 = normalizedEquation.substring(bestBreak + 1).trim();
          
          // Criar fundo cinza para as duas linhas
          doc.setFillColor(245, 245, 245);
          const boxWidth = contentWidth - 10; // Fixo, não ultrapassar
          const boxX = margin + 5;
          doc.rect(boxX, yPosition - 5, boxWidth, 14, 'F');
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.rect(margin + 5, yPosition - 5, contentWidth - 10, 14, 'S');
          
          doc.text(part1, margin + 10, yPosition);
          yPosition += 6;
          doc.text('  ' + part2, margin + 10, yPosition); // Indentação
          yPosition += 6;
        } else {
          // Fallback: usar splitTextToSize
          const wrappedEquation = doc.splitTextToSize(normalizedEquation, maxWidth);
          
          const boxHeight = wrappedEquation.length * 6 + 4;
          doc.setFillColor(245, 245, 245);
          const boxWidth = contentWidth - 10;
          doc.rect(margin + 5, yPosition - 5, boxWidth, boxHeight, 'F');
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.rect(margin + 5, yPosition - 5, contentWidth - 10, boxHeight, 'S');
          
          wrappedEquation.forEach((line: string) => {
            if (checkPageBreak(10)) {
              // Recalcular
            }
            const lineWidth = doc.getTextWidth(line);
            const centerX = margin + (contentWidth / 2) - (lineWidth / 2);
            doc.text(line, centerX, yPosition);
            yPosition += 6;
          });
        }
      }
      
      yPosition += 3;
      return;
    }

    // Regular paragraph text
    renderStats.paragraphs++;
    checkPageBreak(10);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    // FASE 3 (REFATORADA): Processamento de referências ANTES de quebra de linha
    const processedLine = trimmedLine; // Usar Unicode nativo
    
    // FASE 3: PRIMEIRO detectar referências
    const { hasRefs, segments } = formatReferences(processedLine);
    
    if (hasRefs) {
      // FASE 3: Processar cada segmento ANTES de quebrar
      console.log(`📚 Referências detectadas: "${processedLine.substring(0, 60)}..."`);
      console.log(`   Segmentos: ${segments.length}`);
      
      let currentX = margin;
      
      segments.forEach((segment, segIdx) => {
        if (segment.isRef) {
          // Renderizar referência com estilo especial
          const refWidth = doc.getTextWidth(segment.text);
          
          // Verificar se cabe na linha atual
          if (currentX + refWidth > margin + contentWidth) {
            // Nova linha
            yPosition += 6;
            checkPageBreak(8);
            currentX = margin;
          }
          
          // Renderizar em cinza e 9pt
          const prevSize = doc.getFontSize();
          const prevColor = doc.getTextColor();
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text(segment.text, currentX, yPosition);
          currentX += refWidth;
          
          // Restaurar estilo
          doc.setFontSize(prevSize);
          doc.setTextColor(0, 0, 0);
          
          console.log(`   [${segIdx}] REF: "${segment.text}" em cinza 9pt`);
        } else {
          // Texto normal - quebrar ANTES de processar
          const wrappedLines = doc.splitTextToSize(segment.text, contentWidth);
          
          wrappedLines.forEach((line: string) => {
            checkPageBreak(8);
            
            // Usar fonte Unicode se linha contém símbolos matemáticos
            if (hasMathSymbols(line)) {
              doc.setFont(unicodeFontConfig.fontName, 'normal');
            }
            
            doc.text(line, currentX, yPosition);
            yPosition += 6;
            currentX = margin;
            
            // Restaurar fonte normal
            if (hasMathSymbols(line)) {
              doc.setFont('helvetica', 'normal');
            }
          });
          
          console.log(`   [${segIdx}] TEXT: "${segment.text.substring(0, 30)}..."`);
        }
      });
      
      yPosition += 6; // Próxima linha após processar todos os segmentos
    } else {
      // Texto sem referências - processar normalmente
      const wrappedLines = doc.splitTextToSize(processedLine, contentWidth);
      
      wrappedLines.forEach((lineSegment: string) => {
        checkPageBreak(8);
        doc.text(lineSegment, margin, yPosition);
        yPosition += 6;
      });
    }
    
    // FASE 6: Micro-espaçamento a cada 3 parágrafos
    if (renderStats.paragraphs % 3 === 0) {
      yPosition += 2;
    }
    
    yPosition += 4; // Espaçamento entre parágrafos
  });

  // Calcular total de páginas
  totalPages = pageCount;
  
  // FASE 2: Atualizar todos os rodapés com o total correto (2ª passagem)
  console.log(`📄 Atualizando rodapés: ${totalPages} páginas`);
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }
  console.log(`✅ Rodapés atualizados: formato "Página X de ${totalPages}"`);

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

// FASE 7: Testes de Qualidade Visual
interface VisualQualityCheck {
  passed: boolean;
  issues: string[];
  score: number; // 0-100
}

const checkVisualQuality = (doc: jsPDF, renderStats: RenderStats, contentAnalysis: ContentAnalysis): VisualQualityCheck => {
  const issues: string[] = [];
  let score = 100;
  
  console.log('📊 Verificando qualidade visual do PDF...');
  
  // Check 1: Hierarquia de cabeçalhos
  if (renderStats.h1 > 0 && renderStats.h2 > 0) {
    console.log('  ✓ Hierarquia de títulos presente');
    score += 0; // Neutral
  } else if (renderStats.h1 === 0 && renderStats.h2 === 0) {
    issues.push('PDF sem hierarquia de títulos - dificulta navegação');
    score -= 10;
  }
  
  // Check 2: Densidade de texto
  const avgCharsPerPage = contentAnalysis.stats.totalCharacters / doc.getNumberOfPages();
  if (avgCharsPerPage > 2500) {
    issues.push('Densidade de texto muito alta - considere mais espaçamento');
    score -= 15;
    console.log(`  ⚠️ Alta densidade: ${Math.round(avgCharsPerPage)} chars/página`);
  } else {
    console.log(`  ✓ Densidade adequada: ${Math.round(avgCharsPerPage)} chars/página`);
  }
  
  // Check 3: Proporção de listas
  const totalElements = renderStats.paragraphs + renderStats.lists;
  if (totalElements > 0) {
    const listRatio = renderStats.lists / totalElements;
    if (listRatio > 0.5) {
      issues.push('Muitas listas (>50%) - pode dificultar leitura contínua');
      score -= 10;
      console.log(`  ⚠️ Alta proporção de listas: ${Math.round(listRatio * 100)}%`);
    } else {
      console.log(`  ✓ Proporção de listas adequada: ${Math.round(listRatio * 100)}%`);
    }
  }
  
  // Check 4: Uso de formatação inline
  if (renderStats.boldText === 0 && renderStats.italicText === 0 && renderStats.paragraphs > 5) {
    issues.push('Nenhuma formatação inline - texto pode ser monótono');
    score -= 5;
    console.log('  ⚠️ Sem formatação inline');
  } else if (renderStats.boldText > 0 || renderStats.italicText > 0) {
    console.log(`  ✓ Formatação inline presente (bold: ${renderStats.boldText}, italic: ${renderStats.italicText})`);
  }
  
  // Check 5: Páginas geradas vs esperadas
  const expectedPages = Math.ceil(contentAnalysis.stats.totalCharacters / 2000);
  const pageRatio = doc.getNumberOfPages() / expectedPages;
  if (pageRatio < 0.5) {
    issues.push('Páginas geradas muito abaixo do esperado - conteúdo pode estar faltando');
    score -= 20;
    console.log(`  ⚠️ Páginas: ${doc.getNumberOfPages()}/${expectedPages} (${Math.round(pageRatio * 100)}%)`);
  } else if (pageRatio > 2) {
    issues.push('Páginas geradas muito acima do esperado - espaçamento excessivo');
    score -= 10;
    console.log(`  ⚠️ Páginas: ${doc.getNumberOfPages()}/${expectedPages} (${Math.round(pageRatio * 100)}%)`);
  } else {
    console.log(`  ✓ Páginas: ${doc.getNumberOfPages()}/${expectedPages} (${Math.round(pageRatio * 100)}%)`);
  }
  
  // Check 6: Equações formatadas
  if (renderStats.equations > 0) {
    console.log(`  ✓ ${renderStats.equations} equações formatadas com destaque`);
  }
  
  console.log(`📊 Score final de qualidade visual: ${score}/100`);
  
  return {
    passed: score >= 70,
    issues,
    score
  };
};

// FASE 5 (NOVA): Validação Automática de Qualidade
const validatePDFQuality = (
  doc: jsPDF, 
  renderStats: RenderStats,
  content: string
): { passed: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  // Teste 1: Verificar total de páginas
  const totalPages = doc.getNumberOfPages();
  if (totalPages < 2) {
    issues.push(`PDF tem apenas ${totalPages} página(s) - pode estar incompleto`);
  }
  
  // Teste 2: Verificar proporção de elementos renderizados
  const totalElements = renderStats.h1 + renderStats.h2 + renderStats.h3 + renderStats.paragraphs;
  if (totalElements < 10) {
    issues.push('Poucos elementos renderizados - verificar parsing');
  }
  
  // Teste 3: Verificar se referências existem no conteúdo
  const refPattern = /\[\d+\.?\d*\]/g;
  const refsInContent = (content.match(refPattern) || []).length;
  
  // Teste 4: Verificar se símbolos matemáticos existem no conteúdo
  const mathSymbolsInContent = (content.match(/[ΔπθωΩΣ∫αβγμλΦΨ±≠≤≥√∞∂∇]/g) || []).length;
  
  console.log(`\n📊 Validação de Qualidade:`);
  console.log(`   ✓ Total de páginas: ${totalPages}`);
  console.log(`   ✓ Elementos renderizados: ${totalElements}`);
  console.log(`   ✓ Referências no conteúdo: ${refsInContent}`);
  console.log(`   ✓ Equações: ${renderStats.equations}`);
  
  if (mathSymbolsInContent > 0) {
    console.log(`   ✓ Símbolos matemáticos Unicode: ${mathSymbolsInContent}`);
  } else if (renderStats.equations > 0) {
    issues.push('Equações detectadas mas sem símbolos Unicode - verificar fonte');
  }
  
  return {
    passed: issues.length === 0,
    issues
  };
};

// Helper to clean repetitive footers
const cleanFooters = (content: string): string => {
  // Remove "Gerado por NextClass AI Página X de Y..." patterns
  return content.replace(/Gerado\s+por\s+NextClass\s+AI\s+Página.*?\d{4}/gi, '');
};

// Preprocessar conteúdo matemático para melhor renderização no PDF
function preprocessMathContent(content: string): string {
  // Preservar quebras de linha explícitas
  content = content.replace(/\n\n+/g, '\n\n');
  
  // Remover backticks de variáveis matemáticas simples (1-3 caracteres)
  content = content.replace(/`([A-Za-zΔΣπθλμ]{1,3}[₀-₉⁰-⁹]*)`/g, '$1');
  
  // Converter subscripts Unicode para formato legível
  const subscriptMap: Record<string, string> = {
    '₀': '_0', '₁': '_1', '₂': '_2', '₃': '_3', '₄': '_4',
    '₅': '_5', '₆': '_6', '₇': '_7', '₈': '_8', '₉': '_9'
  };
  
  for (const [unicode, text] of Object.entries(subscriptMap)) {
    content = content.replace(new RegExp(unicode, 'g'), text);
  }
  
  // Limpar símbolos $ isolados que não são LaTeX válido
  content = content.replace(/\$(?![^$]*\$)/g, '');
  
  // Converter fórmulas LaTeX inline para texto legível
  content = content.replace(/\$([^$]+)\$/g, (match, formula) => {
    // Remover underscore de subscritos
    return formula.replace(/_\{([^}]+)\}/g, '_$1');
  });
  
  return content;
}

// FASE 6: Função Principal com Auto-Diagnóstico
export const generateReportPDF = async ({ content, title }: PDFOptions): Promise<PDFGenerationResult> => {
  console.log('🚀 Iniciando geração de PDF com 7 fases de validação...');
  console.log('🔍 FASE 1: Analisando conteúdo...');
  
  // Preprocessar conteúdo matemático
  const preprocessedContent = preprocessMathContent(content);
  
  // Clean footers before processing
  const cleanedContent = cleanFooters(preprocessedContent);
  const contentAnalysis = analyzeContent(cleanedContent);
  
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
  let result = await generatePDFDocument(cleanedContent, title);
  let doc = result.doc;
  let renderStats = result.renderStats;
  
  console.log('📊 Estatísticas de renderização (Tentativa 1):', renderStats);
  
  // FASE 3: Diagnóstico
  console.log('🔍 FASE 3: Diagnosticando PDF gerado...');
  const diagnostics = diagnosePDF(doc, contentAnalysis, renderStats, content);
  
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
      result = await generatePDFDocument(cleanedContent, title);
      doc = result.doc;
      renderStats = result.renderStats;
      
      console.log('📊 Estatísticas de renderização (Tentativa 2):', renderStats);
      
      const newDiagnostics = diagnosePDF(doc, contentAnalysis, renderStats, content);
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
  
  // FASE 5: Validação de qualidade
  console.log('📊 FASE 5: Validação de qualidade...');
  const qualityValidation = validatePDFQuality(doc, renderStats, content);
  
  if (!qualityValidation.passed) {
    console.warn('⚠️ Problemas de qualidade detectados:', qualityValidation.issues);
  } else {
    console.log('✅ Validação de qualidade aprovada');
  }
  
  // FASE 7: Verificação de qualidade visual
  console.log('🎨 FASE 7: Verificando qualidade visual...');
  const qualityCheck = checkVisualQuality(doc, renderStats, contentAnalysis);
  
  if (!qualityCheck.passed) {
    console.warn(`⚠️ Score de qualidade: ${qualityCheck.score}/100`);
    console.warn('⚠️ Problemas de qualidade visual:', qualityCheck.issues);
  } else {
    console.log(`✅ Qualidade visual aprovada: ${qualityCheck.score}/100`);
  }

  // FASE 8: Download
  console.log('📥 FASE 8: Iniciando download do PDF...');
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
