import jsPDF from 'jspdf';

interface PDFOptions {
  content: string;
  title: string;
  logoSvg: string;
}

export const generateReportPDF = ({ content, title, logoSvg }: PDFOptions): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  const footerHeight = 15;
  const headerHeight = 25;

  // Helper function to add header with logo to each page
  const addHeader = (pageNumber: number) => {
    // Add logo (simplified as text for now - SVG rendering in jsPDF requires additional setup)
    doc.setFontSize(16);
    doc.setTextColor(23, 15, 73); // NextClass brand color
    doc.setFont('helvetica', 'bold');
    doc.text('NextClass', margin, 15);
    
    // Add decorative line
    doc.setDrawColor(255, 70, 130); // Pink brand color
    doc.setLineWidth(0.5);
    doc.line(margin, headerHeight - 5, pageWidth - margin, headerHeight - 5);
  };

  // Helper function to add footer to each page
  const addFooter = (pageNumber: number, totalPages: number) => {
    const footerY = pageHeight - 10;
    
    // Pink footer bar
    doc.setFillColor(255, 113, 160); // Pink brand color
    doc.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');
    
    // Page number
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Página ${pageNumber} de ${totalPages}`,
      pageWidth / 2,
      footerY,
      { align: 'center' }
    );
    
    // NextClass branding
    doc.text('Gerado por NextClass', pageWidth - margin, footerY, { align: 'right' });
  };

  // Parse content and format
  const lines = content.split('\n');
  let currentY = headerHeight + 10;
  let pageNumber = 1;

  // Add first page header
  addHeader(pageNumber);

  // Add title
  doc.setFontSize(18);
  doc.setTextColor(23, 15, 73);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(title, contentWidth);
  doc.text(titleLines, margin, currentY);
  currentY += titleLines.length * 8 + 10;

  // Process content
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  for (const line of lines) {
    // Check if we need a new page
    if (currentY > pageHeight - footerHeight - 20) {
      addFooter(pageNumber, 1); // Will update total pages later
      doc.addPage();
      pageNumber++;
      addHeader(pageNumber);
      currentY = headerHeight + 10;
    }

    if (!line.trim()) {
      currentY += 5;
      continue;
    }

    // Handle headers
    if (line.startsWith('###')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      const headerText = line.replace(/^###\s*/, '');
      const headerLines = doc.splitTextToSize(headerText, contentWidth);
      doc.text(headerLines, margin, currentY);
      currentY += headerLines.length * 7 + 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      continue;
    }

    if (line.startsWith('##')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      const headerText = line.replace(/^##\s*/, '');
      const headerLines = doc.splitTextToSize(headerText, contentWidth);
      doc.text(headerLines, margin, currentY);
      currentY += headerLines.length * 8 + 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      continue;
    }

    if (line.startsWith('#')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      const headerText = line.replace(/^#\s*/, '');
      const headerLines = doc.splitTextToSize(headerText, contentWidth);
      doc.text(headerLines, margin, currentY);
      currentY += headerLines.length * 9 + 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      continue;
    }

    // Handle bold text
    if (line.includes('**')) {
      const parts = line.split('**');
      let xOffset = margin;
      
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) {
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setFont('helvetica', 'normal');
        }
        
        const partLines = doc.splitTextToSize(parts[i], contentWidth - (xOffset - margin));
        if (partLines.length > 0) {
          doc.text(partLines[0], xOffset, currentY);
          xOffset += doc.getTextWidth(partLines[0]);
          
          // Handle remaining lines
          for (let j = 1; j < partLines.length; j++) {
            currentY += 6;
            if (currentY > pageHeight - footerHeight - 20) {
              addFooter(pageNumber, 1);
              doc.addPage();
              pageNumber++;
              addHeader(pageNumber);
              currentY = headerHeight + 10;
            }
            doc.text(partLines[j], margin, currentY);
          }
        }
      }
      doc.setFont('helvetica', 'normal');
      currentY += 6;
      continue;
    }

    // Regular text
    const textLines = doc.splitTextToSize(line, contentWidth);
    doc.text(textLines, margin, currentY);
    currentY += textLines.length * 6 + 3;
  }

  // Update all footers with correct total pages
  const totalPages = pageNumber;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  // Save the PDF
  const fileName = `relatorio-${title.substring(0, 30).replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`;
  doc.save(fileName);
};
