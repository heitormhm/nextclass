import jsPDF from 'jspdf';

interface PDFOptions {
  content: string;
  title: string;
  logoSvg?: string;
}

export const generateReportPDF = ({ content, title }: PDFOptions): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;
  const contentWidth = pageWidth - (2 * margin);
  const footerHeight = 15;
  let yPosition = margin;

  // Helper function to add header (only on first page with logo)
  const addHeader = (isFirstPage: boolean = false) => {
    if (isFirstPage) {
      // Add NextClass branding at top of first page
      doc.setFillColor(110, 89, 165); // Purple background
      doc.rect(0, 10, pageWidth, 18, 'F');
      
      // Add NextClass text logo
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('NextClass', pageWidth / 2, 19, { align: 'center' });
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Pesquisa Aprofundada com IA', pageWidth / 2, 24, { align: 'center' });
    }
  };

  // Helper function to add footer
  const addFooter = (pageNum: number, totalPages: number) => {
    const footerY = pageHeight - 8;
    
    // Pink elegant bar at bottom
    doc.setFillColor(236, 72, 153);
    doc.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    doc.text('Gerado por NextClass AI', margin, footerY);
    doc.text(`${pageNum}`, pageWidth / 2, footerY, { align: 'center' });
    
    const currentDate = new Date().toLocaleDateString('pt-PT', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    doc.text(currentDate, pageWidth - margin, footerY, { align: 'right' });
  };

  let pageCount = 1;
  let isFirstPage = true;
  addHeader(isFirstPage);

  // Add title on first page with proper wrapping
  doc.setTextColor(110, 89, 165); // Purple color
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  yPosition = 45;
  
  // Use maxWidth to ensure proper line breaking
  const titleLines = doc.splitTextToSize(title, contentWidth - 20);
  titleLines.forEach((line: string) => {
    doc.text(line, pageWidth / 2, yPosition, { 
      align: 'center',
      maxWidth: contentWidth - 20 
    });
    yPosition += 10;
  });

  // Add decorative line under title
  doc.setDrawColor(236, 72, 153);
  doc.setLineWidth(1.5);
  doc.line(margin + 20, yPosition + 2, pageWidth - margin - 20, yPosition + 2);
  yPosition += 10;

  // Extract H2 titles for table of contents
  const extractH2Titles = (content: string): string[] => {
    const h2Pattern = /^##\s+(\d+\.\s+)?(.+)$/gm;
    const titles: string[] = [];
    let match;
    while ((match = h2Pattern.exec(content)) !== null) {
      titles.push(match[2].trim());
    }
    return titles;
  };

  // Fase 6: Visual index will be added after preprocessing

  // Process content
  doc.setTextColor(50, 50, 50); // Dark gray for better readability
  doc.setFontSize(12); // Professional 12pt font
  doc.setFont('helvetica', 'normal');

  // Fase 1: Clean unwanted content
  const cleanContent = (content: string): string => {
    return content
      // Remove AI introductory phrases
      .replace(/^(Com certeza|Claro|Segue o relatório|Certamente|Perfeito|Ótimo)\.?.*?[\n\r]+/gm, '')
      // Remove empty lines after removal
      .replace(/^\s*[\n\r]+/gm, '');
  };

  // Fase 4: Preprocess citations and mathematical notation
  const preprocessCitationsAndMath = (content: string): { text: string; references: string[] } => {
    const references: string[] = [];
    
    // Extract and number citations
    let processedText = content.replace(/\[(\d+)\]/g, (match, num) => {
      return match; // Keep numbered citations as-is
    });
    
    // Improve mathematical notation
    processedText = processedText
      // Convert "U, "H, "S, "G to ΔU, ΔH, ΔS, ΔG
      .replace(/"([UHSGATVP])\b/g, 'Δ$1')
      .replace(/\bDelta\s*([UHSGATVP])/g, 'Δ$1')
      
      // Greek symbols
      .replace(/\\Delta\s*/g, 'Δ')
      .replace(/\\delta/g, 'δ')
      .replace(/\\theta/g, 'θ')
      .replace(/\\pi/g, 'π')
      .replace(/\\rho/g, 'ρ')
      .replace(/\\sigma/g, 'σ')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\gamma/g, 'γ')
      .replace(/\\eta/g, 'η')
      .replace(/\\mu/g, 'μ')
      
      // Subscripts and superscripts
      .replace(/\^2/g, '²')
      .replace(/\^3/g, '³')
      .replace(/\^-1/g, '⁻¹')
      .replace(/P_1/g, 'P₁')
      .replace(/P_2/g, 'P₂')
      .replace(/V_1/g, 'V₁')
      .replace(/V_2/g, 'V₂')
      .replace(/T_1/g, 'T₁')
      .replace(/T_2/g, 'T₂')
      .replace(/H_1/g, 'H₁')
      .replace(/H_2/g, 'H₂')
      .replace(/S_1/g, 'S₁')
      .replace(/S_2/g, 'S₂')
      
      // Remove quotes around variables
      .replace(/"([A-Z][₀₁₂₃₄₅₆₇₈₉]?)"/g, '$1')
      .replace(/"([A-Z])/g, '$1')
      .replace(/([A-Z₀₁₂₃₄₅₆₇₈₉])"/g, '$1')
      
      // Improve spacing in equations
      .replace(/([=+\-×÷><])/g, ' $1 ')
      .replace(/\s+/g, ' '); // Normalize multiple spaces
    
    return { text: processedText, references };
  };

  const { text: preprocessedContent, references } = preprocessCitationsAndMath(cleanContent(content));
  
  // Correção 5: Validate content is not empty
  if (!preprocessedContent || preprocessedContent.trim().length < 100) {
    console.error('❌ Conteúdo vazio ou muito curto após preprocessamento:', preprocessedContent.length, 'caracteres');
    console.error('Conteúdo original tinha:', content.length, 'caracteres');
    return;
  }
  
  console.log('✅ Conteúdo preprocessado:', preprocessedContent.length, 'caracteres');
  
  // Correção 1: Extract index AFTER preprocessing
  const sectionTitles = extractH2Titles(preprocessedContent);
  console.log('✅ Títulos extraídos:', sectionTitles.length);
  
  if (sectionTitles.length > 0) {
    yPosition += 6;
    
    // Background box for index
    const indexHeight = (sectionTitles.length * 6) + 15;
    doc.setFillColor(250, 248, 255); // Very light purple
    doc.roundedRect(margin - 5, yPosition - 3, contentWidth + 10, indexHeight, 3, 3, 'F');
    
    // Subtle border
    doc.setDrawColor(110, 89, 165);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin - 5, yPosition - 3, contentWidth + 10, indexHeight, 3, 3, 'S');
    
    // Title with icon
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(110, 89, 165);
    doc.text('📑 Conteúdo', margin, yPosition + 3);
    yPosition += 10;
    
    // Decorative line
    doc.setDrawColor(236, 72, 153);
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 70);
    
    // Icons by section type
    const sectionIcons = ['📖', '🔬', '⚙️', '💡', '🚀', '🎯', '📚'];
    
    sectionTitles.forEach((title, index) => {
      const icon = sectionIcons[index] || '•';
      doc.text(`${icon} ${index + 1}. ${title}`, margin + 3, yPosition);
      yPosition += 6;
    });
    
    yPosition += 8;
  } else {
    yPosition += 8;
  }
  
  // Preprocess individual lines for additional math notation
  const preprocessMathNotation = (text: string): string => {
    return text
      .replace(/m_dot/g, 'ṁ')
      .replace(/Q_liquido/g, 'Q̇líquido')
      .replace(/W_liquido/g, 'Ẇ́líquido');
  };

  const lines = preprocessedContent.split('\n').map(line => preprocessMathNotation(line));
  
  // Correção 2: Add debug logs
  console.log('✅ Total de linhas para processar:', lines.length);
  
  // Correção 3: Track first H1 to avoid skipping all H1s
  let firstH1Rendered = false;
  
  lines.forEach((line, lineIndex) => {
    // Log progress every 50 lines
    if (lineIndex % 50 === 0) {
      console.log(`📝 Processando linha ${lineIndex}/${lines.length}`);
    }
    // Check if we need a new page
    if (yPosition > pageHeight - footerHeight - 20) {
      addFooter(pageCount, 0);
      doc.addPage();
      pageCount++;
      isFirstPage = false;
      yPosition = margin + 5;
    }

    // Fase 2 & 3: Handle markdown headers with correct hierarchy detection
    const trimmedLine = line.trim();
    
    // Check H3 first (###)
    if (trimmedLine.match(/^###\s+/)) {
      yPosition += 8; // Increased spacing
      doc.setFontSize(15); // Increased from 14
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(110, 89, 165);
      
      // Larger circular marker
      doc.setFillColor(236, 72, 153);
      doc.circle(margin - 4, yPosition - 2, 2.5, 'F'); // Increased radius to 2.5
      
      const headerText = trimmedLine.replace(/^###\s*/, '');
      
      // Background shadow behind text
      const textWidth = doc.getTextWidth(headerText);
      doc.setFillColor(250, 245, 255); // Very light purple
      doc.roundedRect(margin + 2, yPosition - 6, textWidth + 6, 9, 1, 1, 'F');
      
      // Contextual icons
      const lowerHeader = headerText.toLowerCase();
      if (lowerHeader.includes('aplicaç') || lowerHeader.includes('prática')) {
        // More visible lightbulb icon
        doc.setDrawColor(236, 72, 153);
        doc.setLineWidth(0.8);
        doc.circle(margin - 10, yPosition - 2, 2.5, 'S');
        doc.line(margin - 10, yPosition + 1, margin - 10, yPosition + 3);
      } else if (lowerHeader.includes('importante') || lowerHeader.includes('atenção') || lowerHeader.includes('nota')) {
        // More prominent alert icon
        doc.setFillColor(255, 193, 7); // Stronger yellow
        doc.circle(margin - 10, yPosition - 2, 3, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('!', margin - 10.5, yPosition + 0.5);
        doc.setFontSize(15);
        doc.setTextColor(110, 89, 165);
      }
      
      // Render text
      const headerLines = doc.splitTextToSize(headerText, contentWidth - 10);
      headerLines.forEach((hLine: string) => {
        doc.text(hLine, margin + 5, yPosition);
        yPosition += 8;
      });
      
      // Longer and more visible underline
      doc.setDrawColor(236, 72, 153);
      doc.setLineWidth(0.5);
      doc.line(margin + 5, yPosition + 1, margin + 80, yPosition + 1); // Increased from 60 to 80
      yPosition += 6;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
    }
    // Check H2 next (## but not ###)
    else if (trimmedLine.match(/^##\s+/) && !trimmedLine.startsWith('###')) {
      yPosition += 10;
      doc.setFontSize(15); // Reduced from 16
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(110, 89, 165);
      
      // Capture numbering like "2.1." or "2."
      const headerMatch = trimmedLine.match(/^##\s+(\d+\.?\d*\.?\s+)?(.+)$/);
      const headerNumber = headerMatch ? headerMatch[1]?.trim() : '';
      const headerText = headerMatch ? headerMatch[2] : trimmedLine.replace(/^##\s+/, '');
      
      // Render number in dark gray (not pink)
      if (headerNumber) {
        doc.setTextColor(80, 80, 80);
        doc.text(headerNumber, margin, yPosition);
        const numWidth = doc.getTextWidth(headerNumber);
        
        // Render text next to number
        doc.setTextColor(110, 89, 165);
        doc.text(headerText, margin + numWidth + 2, yPosition);
      } else {
        doc.text(headerText, margin, yPosition);
      }
      
      yPosition += 9;
      
      // Elegant underline
      doc.setDrawColor(236, 72, 153);
      doc.setLineWidth(0.6);
      doc.line(margin, yPosition, margin + 40, yPosition);
      yPosition += 6;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
    }
    // Check H1 last (# but not ## or ###)
    else if (trimmedLine.match(/^#\s+[^#]/) && !trimmedLine.startsWith('##')) {
      // H1 only for main numbered sections (# 1. Introduction)
      const match = trimmedLine.match(/^#\s+(\d+)\.\s*(.+)/);
      
      if (match) {
        const sectionNumber = match[1];
        const headerText = match[2];
        
        console.log('🔍 H1 detectado:', headerText);
        
        // Correção 3: Only skip the FIRST H1 if it's a duplicate of the title
        const isDuplicateTitle = headerText.toLowerCase().trim() === title.toLowerCase().trim();
        const shouldSkip = isDuplicateTitle && !firstH1Rendered;
        
        if (!shouldSkip) {
          firstH1Rendered = true;
          console.log('✅ Renderizando H1:', headerText);
          
          yPosition += 14;
          
          // Large decorative number in pink
          doc.setFontSize(36);
          doc.setTextColor(236, 72, 153);
          doc.setFont('helvetica', 'bold');
          doc.text(sectionNumber, margin, yPosition);
          yPosition += 12;
          
          // Section title in purple
          doc.setFontSize(18);
          doc.setTextColor(110, 89, 165);
          const headerLines = doc.splitTextToSize(headerText, contentWidth);
          headerLines.forEach((hLine: string) => {
            doc.text(hLine, margin, yPosition);
            yPosition += 10;
          });
          yPosition += 4;
        } else {
          console.log('⏭️ Pulando H1 duplicado:', headerText);
        }
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
    }
    // Correção 4: Check for important equations BEFORE buildLines
    // Handle regular text with bold support and citations
    else if (line.trim()) {
      // First check if this is an important equation
      const cleanText = trimmedLine.replace(/\[\d+\]/g, '').trim();
      const hasEquals = cleanText.includes('=');
      const hasVariables = /[ΔUHSGPVT][₀₁₂₃₄₅₆₇₈₉]?/.test(cleanText) || 
                            /[A-Z]{1,2}[₀₁₂₃₄₅₆₇₈₉]/.test(cleanText);
      const isShort = cleanText.split(/\s+/).length < 20;
      const noVerbs = !/\b(é|são|está|estão|foi|foram|será|serão)\b/i.test(cleanText);
      
      const isImportantEquation = hasEquals && hasVariables && isShort && noVerbs;
      
      // Render important equations in highlighted box
      if (isImportantEquation) {
        console.log('🧮 Equação importante detectada:', cleanText.substring(0, 50));
        
        // Check for page break
        if (yPosition > pageHeight - footerHeight - 30) {
          addFooter(pageCount, 0);
          doc.addPage();
          pageCount++;
          isFirstPage = false;
          yPosition = margin + 5;
        }
        
        yPosition += 6;
        
        // Mathematical icon
        doc.setFontSize(16);
        doc.setTextColor(110, 89, 165);
        doc.text('≡', margin - 8, yPosition + 4);
        
        // Background box with gradient effect (simulated)
        doc.setFillColor(248, 248, 252); // Very light blue
        doc.roundedRect(margin - 3, yPosition - 4, contentWidth + 6, 18, 2, 2, 'F');
        
        // Stronger purple border
        doc.setDrawColor(110, 89, 165);
        doc.setLineWidth(0.8);
        doc.roundedRect(margin - 3, yPosition - 4, contentWidth + 6, 18, 2, 2, 'S');
        
        // Render centered bold equation
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text(cleanText, pageWidth / 2, yPosition + 5, { align: 'center' });
        
        yPosition += 22;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(50, 50, 50);
        
        return; // Skip this line in further processing
      }
      
      // Parse line into segments with formatting information
      interface TextSegment {
        text: string;
        bold: boolean;
        citation: boolean;
      }

      const parseSegments = (text: string): TextSegment[] => {
        const segments: TextSegment[] = [];
        const parts = text.split(/(\*\*.*?\*\*|\[\d+\])/g);
        
        parts.forEach((part) => {
          if (!part) return;
          
          if (part.startsWith('**') && part.endsWith('**')) {
            segments.push({
              text: part.replace(/\*\*/g, ''),
              bold: true,
              citation: false
            });
          } else if (part.match(/\[\d+\]/)) {
            segments.push({
              text: part,
              bold: false,
              citation: true
            });
          } else {
            segments.push({
              text: part,
              bold: false,
              citation: false
            });
          }
        });
        
        return segments;
      };

      // Build lines that fit within contentWidth
      const buildLines = (segments: TextSegment[]): TextSegment[][] => {
        const lines: TextSegment[][] = [];
        let currentLine: TextSegment[] = [];
        let currentWidth = 0;

        // Fase 5: Improved equation detection (checking only, rendering moved outside)
        const lineText = segments.map(s => s.text).join('');
        const isMathFormula = /[=²³⁰¹⁴⁵⁶⁷⁸⁹ṁΔ]/.test(lineText) || 
                              lineText.includes('->') || 
                              lineText.includes('∑') ||
                              /\b[A-Z]_[a-z]+/.test(lineText);

        segments.forEach((segment) => {
          // For math formulas, try to keep them together more aggressively
          const splitPattern = isMathFormula ? /(\s+)/ : /(\s+)/;
          const words = segment.text.split(splitPattern);
          
          words.forEach((word) => {
            if (!word) return;
            
            // Calculate width for this word with correct font
            doc.setFont('helvetica', segment.bold ? 'bold' : 'normal');
            doc.setFontSize(segment.citation ? 9 : 12);
            const wordWidth = doc.getTextWidth(word);
            
            // For math formulas, be more lenient with line width
            const effectiveWidth = isMathFormula ? contentWidth * 1.05 : contentWidth;
            
            // Check if adding this word exceeds the line width
            if (currentWidth + wordWidth > effectiveWidth && currentLine.length > 0) {
              // For math formulas, only break at specific points
              const canBreak = !isMathFormula || 
                               word.trim() === '' || 
                               /^[,;]/.test(word) ||
                               currentLine.length > 15; // Allow break if line is very long
              
              if (canBreak) {
                // Start new line
                lines.push(currentLine);
                currentLine = [];
                currentWidth = 0;
                
                // Don't start a line with whitespace
                if (word.trim()) {
                  currentLine.push({
                    text: word,
                    bold: segment.bold,
                    citation: segment.citation
                  });
                  currentWidth = wordWidth;
                }
              } else {
                // Keep adding to current line even if it slightly exceeds
                currentLine.push({
                  text: word,
                  bold: segment.bold,
                  citation: segment.citation
                });
                currentWidth += wordWidth;
              }
            } else {
              // Add to current line
              currentLine.push({
                text: word,
                bold: segment.bold,
                citation: segment.citation
              });
              currentWidth += wordWidth;
            }
            
            // Reset to normal font
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);
          });
        });

        // Add remaining line
        if (currentLine.length > 0) {
          lines.push(currentLine);
        }

        return lines;
      };

      // Parse and build lines
      const segments = parseSegments(line);
      const wrappedLines = buildLines(segments);

      // Render each line
      wrappedLines.forEach((lineSegments) => {
        // Check for page break
        if (yPosition > pageHeight - footerHeight - 20) {
          addFooter(pageCount, 0);
          doc.addPage();
          pageCount++;
          isFirstPage = false;
          yPosition = margin + 5;
        }

        let xPosition = margin;

        // Render each segment in the line
        lineSegments.forEach((segment) => {
          if (!segment.text.trim() && segment.text !== ' ') return;

          if (segment.citation) {
            // Citations - smaller superscript style with subtle background
            doc.setFillColor(250, 248, 255); // Very light purple
            const citationWidth = doc.getTextWidth(segment.text);
            doc.rect(xPosition - 0.5, yPosition - 4.5, citationWidth + 1, 5, 'F');
            
            doc.setFontSize(9);
            doc.setTextColor(110, 89, 165);
            doc.text(segment.text, xPosition, yPosition - 1);
            xPosition += citationWidth + 2;
            doc.setFontSize(12);
            doc.setTextColor(50, 50, 50);
          } else {
            // Regular or bold text
            doc.setFont('helvetica', segment.bold ? 'bold' : 'normal');
            doc.text(segment.text, xPosition, yPosition);
            xPosition += doc.getTextWidth(segment.text);
            doc.setFont('helvetica', 'normal');
          }
        });

        yPosition += 8; // Increased from 7 for better readability
      });
    }
    // Empty line - add consistent spacing
    else {
      yPosition += 6; // Increased from 5
    }
  });

  // Add References section if there are citations
  if (references.length > 0) {
    // Check if we need a new page
    if (yPosition > pageHeight - footerHeight - 100) {
      addFooter(pageCount, 0);
      doc.addPage();
      pageCount++;
      yPosition = margin + 5;
    }
    
    // Section title
    yPosition += 10;
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(110, 89, 165);
    doc.text('Referências Bibliográficas', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    
    // List references
    references.forEach((ref, index) => {
      if (yPosition > pageHeight - footerHeight - 20) {
        addFooter(pageCount, 0);
        doc.addPage();
        pageCount++;
        yPosition = margin + 5;
      }
      
      const refText = `[${index + 1}] ${ref}`;
      const refLines = doc.splitTextToSize(refText, contentWidth - 10);
      
      refLines.forEach((line: string) => {
        doc.text(line, margin + 5, yPosition);
        yPosition += 6;
      });
      
      yPosition += 2; // Space between references
    });
  }

  // Update all footers with correct total pages
  const totalPages = pageCount;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  // Save the PDF
  const fileName = `relatorio-${title.substring(0, 30).replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.pdf`;
  doc.save(fileName);
}
