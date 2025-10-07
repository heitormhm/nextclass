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

  const lines = content.split('\n');
  
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
    if (line.startsWith('###')) {
      yPosition += 3; // Extra spacing before subsection
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(110, 89, 165);
      const headerText = line.replace(/^###\s*/, '');
      doc.text(headerText, margin, yPosition, { maxWidth: contentWidth });
      yPosition += 8;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
    } else if (line.startsWith('##')) {
      yPosition += 5; // Extra spacing before section
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(110, 89, 165);
      const headerText = line.replace(/^##\s*/, '');
      doc.text(headerText, margin, yPosition, { maxWidth: contentWidth });
      // Add subtle underline for sections
      doc.setDrawColor(236, 72, 153);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition + 2, margin + 40, yPosition + 2);
      yPosition += 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
    } else if (line.startsWith('#')) {
      yPosition += 8; // Extra spacing before main title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(110, 89, 165);
      const headerText = line.replace(/^#\s*/, '');
      doc.text(headerText, margin, yPosition, { maxWidth: contentWidth });
      yPosition += 12;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
    }
    // Handle regular text with bold support and citations
    else if (line.trim()) {
      // Check if line has formatting (bold or citations)
      const hasFormatting = /(\*\*.*?\*\*|\[\d+\])/.test(line);
      
      if (!hasFormatting) {
        // Simple text without formatting - use full width wrapping
        const wrappedLines = doc.splitTextToSize(line, contentWidth);
        wrappedLines.forEach((wrappedLine: string) => {
          if (yPosition > pageHeight - footerHeight - 20) {
            addFooter(pageCount, 0);
            doc.addPage();
            pageCount++;
            isFirstPage = false;
            yPosition = margin + 5;
          }
          doc.text(wrappedLine, margin, yPosition);
          yPosition += 7;
        });
      } else {
        // Text with formatting - wrap first, then apply formatting per line
        // Remove formatting temporarily to get proper text wrapping
        const plainText = line.replace(/\*\*/g, '');
        const wrappedLines = doc.splitTextToSize(plainText, contentWidth);
        
        // Now apply formatting to each wrapped line
        wrappedLines.forEach((wrappedLine: string) => {
          if (yPosition > pageHeight - footerHeight - 20) {
            addFooter(pageCount, 0);
            doc.addPage();
            pageCount++;
            isFirstPage = false;
            yPosition = margin + 5;
          }
          
          // Find which parts of the original line are in this wrapped line
          // Split by formatting markers
          const parts = line.split(/(\*\*.*?\*\*|\[\d+\])/g);
          let currentPos = 0;
          let xPosition = margin;
          
          parts.forEach((part) => {
            if (!part) return;
            
            if (part.startsWith('**') && part.endsWith('**')) {
              const boldText = part.replace(/\*\*/g, '');
              // Check if this bold text appears in current wrapped line
              const plainLinePos = plainText.indexOf(boldText, currentPos);
              if (plainLinePos >= 0 && plainLinePos < currentPos + wrappedLine.length) {
                doc.setFont('helvetica', 'bold');
                doc.text(boldText, xPosition, yPosition);
                xPosition += doc.getTextWidth(boldText);
                doc.setFont('helvetica', 'normal');
                currentPos = plainLinePos + boldText.length;
              }
            } else if (part.match(/\[\d+\]/)) {
              // Citations - render in smaller superscript style
              doc.setFontSize(9);
              doc.setTextColor(110, 89, 165);
              doc.text(part, xPosition, yPosition - 1);
              xPosition += doc.getTextWidth(part) + 1;
              doc.setFontSize(12);
              doc.setTextColor(50, 50, 50);
            } else {
              // Regular text segment
              const plainPart = part.trim();
              if (plainPart) {
                const plainLinePos = plainText.indexOf(plainPart, currentPos);
                if (plainLinePos >= 0 && plainLinePos < currentPos + wrappedLine.length) {
                  doc.text(plainPart, xPosition, yPosition);
                  xPosition += doc.getTextWidth(plainPart);
                  currentPos = plainLinePos + plainPart.length;
                }
              }
            }
          });
          
          yPosition += 7;
        });
      }
    }
    // Empty line
    else {
      yPosition += 4;
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
