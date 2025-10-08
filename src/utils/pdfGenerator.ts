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
  yPosition += 18;

  // Process content
  doc.setTextColor(50, 50, 50); // Dark gray for better readability
  doc.setFontSize(12); // Professional 12pt font
  doc.setFont('helvetica', 'normal');

  // Preprocess mathematical notation
  const preprocessMathNotation = (text: string): string => {
    return text
      // Convert common superscripts
      .replace(/\^2/g, '²')
      .replace(/\^3/g, '³')
      .replace(/V2/g, 'V²')
      .replace(/V_entrada2/g, 'V²entrada')
      .replace(/V_saida2/g, 'V²saida')
      .replace(/m2/g, 'm²')
      .replace(/s2/g, 's²')
      // Convert common subscripts (using combining characters)
      .replace(/m_dot/g, 'ṁ')
      .replace(/Q_liquido/g, 'Q̇líquido')
      .replace(/W_liquido/g, 'Ẇ́líquido')
      .replace(/W_eixo/g, 'Ẇ́eixo')
      .replace(/h_entrada/g, 'hentrada')
      .replace(/h_saida/g, 'hsaída')
      // Improve formula readability
      .replace(/\s*([+\-=])\s*/g, ' $1 '); // Add spaces around operators
  };

  const lines = content.split('\n').map(line => preprocessMathNotation(line));
  
  lines.forEach((line) => {
    // Check if we need a new page
    if (yPosition > pageHeight - footerHeight - 20) {
      addFooter(pageCount, 0);
      doc.addPage();
      pageCount++;
      isFirstPage = false;
      yPosition = margin + 5;
    }

    // Handle markdown headers with improved styling and proper wrapping
    // Check if line starts with # (must be first character or after whitespace)
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('###')) {
      yPosition += 3; // Extra spacing before subsection
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(110, 89, 165);
      const headerText = trimmedLine.replace(/^###\s*/, '');
      const headerLines = doc.splitTextToSize(headerText, contentWidth);
      headerLines.forEach((hLine: string) => {
        doc.text(hLine, margin, yPosition);
        yPosition += 7;
      });
      yPosition += 1;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
    } else if (trimmedLine.startsWith('##') && !trimmedLine.startsWith('###')) {
      yPosition += 5; // Extra spacing before section
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(110, 89, 165);
      const headerText = trimmedLine.replace(/^##\s*/, '');
      const headerLines = doc.splitTextToSize(headerText, contentWidth);
      headerLines.forEach((hLine: string) => {
        doc.text(hLine, margin, yPosition);
        yPosition += 8;
      });
      // Add subtle underline for sections
      doc.setDrawColor(236, 72, 153);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, margin + 40, yPosition);
      yPosition += 2;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
    } else if (trimmedLine.startsWith('#') && !trimmedLine.startsWith('##')) {
      yPosition += 8; // Extra spacing before main title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(110, 89, 165);
      const headerText = trimmedLine.replace(/^#\s*/, '');
      const headerLines = doc.splitTextToSize(headerText, contentWidth);
      headerLines.forEach((hLine: string) => {
        doc.text(hLine, margin, yPosition);
        yPosition += 10;
      });
      yPosition += 2;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
    }
    // Handle regular text with bold support and citations
    else if (line.trim()) {
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

        // Check if line contains mathematical formulas (equations with = or extensive use of subscripts/superscripts)
        const lineText = segments.map(s => s.text).join('');
        const isMathFormula = /[=²³⁰¹⁴⁵⁶⁷⁸⁹ṁ]/.test(lineText) || 
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
            // Citations - smaller superscript style
            doc.setFontSize(9);
            doc.setTextColor(110, 89, 165);
            doc.text(segment.text, xPosition, yPosition - 1);
            xPosition += doc.getTextWidth(segment.text) + 1;
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

        yPosition += 7;
      });
    }
    // Empty line - add consistent spacing
    else {
      yPosition += 5;
    }
  });

  // Update all footers with correct total pages
  const totalPages = pageCount;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  // Save the PDF
  const fileName = `relatorio-${title.substring(0, 30).replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.pdf`;
  doc.save(fileName);
};
