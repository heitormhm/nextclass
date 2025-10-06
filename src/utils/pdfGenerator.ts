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
      // Process bold text (**text**) and citations [1]
      const parts = line.split(/(\*\*.*?\*\*|\[\d+\])/g);
      let xPosition = margin;
      
      parts.forEach((part) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          doc.setFont('helvetica', 'bold');
          const boldText = part.replace(/\*\*/g, '');
          const textLines = doc.splitTextToSize(boldText, contentWidth - (xPosition - margin));
          textLines.forEach((textLine: string, index: number) => {
            if (yPosition > pageHeight - footerHeight - 20) {
              addFooter(pageCount, 0);
              doc.addPage();
              pageCount++;
              isFirstPage = false;
              yPosition = margin + 5;
              xPosition = margin;
            }
            doc.text(textLine, xPosition, yPosition);
            if (index < textLines.length - 1) {
              yPosition += 7; // Line spacing
              xPosition = margin;
            } else {
              xPosition += doc.getTextWidth(textLine);
            }
          });
          doc.setFont('helvetica', 'normal');
        } else if (part.match(/\[\d+\]/)) {
          // Style citations in a smaller, superscript-like format
          doc.setFontSize(9);
          doc.setTextColor(110, 89, 165);
          doc.text(part, xPosition, yPosition - 1); // Slightly raised
          xPosition += doc.getTextWidth(part) + 1;
          doc.setFontSize(12);
          doc.setTextColor(50, 50, 50);
        } else if (part.trim()) {
          const textLines = doc.splitTextToSize(part, contentWidth - (xPosition - margin));
          textLines.forEach((textLine: string, index: number) => {
            if (yPosition > pageHeight - footerHeight - 20) {
              addFooter(pageCount, 0);
              doc.addPage();
              pageCount++;
              isFirstPage = false;
              yPosition = margin + 5;
              xPosition = margin;
            }
            doc.text(textLine, xPosition, yPosition);
            if (index < textLines.length - 1) {
              yPosition += 7; // Line spacing
              xPosition = margin;
            } else {
              xPosition += doc.getTextWidth(textLine);
            }
          });
        }
      });
      yPosition += 7; // Paragraph spacing
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
