import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface PrintOptions {
  lectureTitle: string;
  teacherName?: string;
  date?: string;
}

export const printMaterialDidatico = async (
  elementId: string,
  options: PrintOptions
): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Elemento não encontrado');
  }

  // Clone o elemento para não afetar a UI
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Aplicar estilos para impressão
  clone.style.width = '210mm'; // A4 width
  clone.style.padding = '20mm';
  clone.style.backgroundColor = 'white';
  clone.style.color = '#000000';
  
  // Remover elementos interativos
  clone.querySelectorAll('button, input, textarea').forEach(el => el.remove());
  
  // Forçar cores nos callouts para impressão
  clone.querySelectorAll('[data-callout-type]').forEach(el => {
    const calloutEl = el as HTMLElement;
    calloutEl.style.breakInside = 'avoid';
    calloutEl.style.pageBreakInside = 'avoid';
    (calloutEl.style as any).webkitPrintColorAdjust = 'exact';
    calloutEl.style.printColorAdjust = 'exact';
  });

  // Adicionar ao documento temporariamente (fora da tela)
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  document.body.appendChild(clone);

  try {
    // Gerar canvas
    const canvas = await html2canvas(clone, {
      scale: 2, // Alta qualidade
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 794, // A4 width in pixels (210mm)
      windowHeight: 1123, // A4 height in pixels (297mm)
    });

    // Criar PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageHeight = 297; // A4 height in mm
    let heightLeft = imgHeight;
    let position = 0;

    // Adicionar header na primeira página
    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.text(options.lectureTitle, 10, 10);
    if (options.teacherName) {
      pdf.text(`Prof. ${options.teacherName}`, 10, 15);
    }
    if (options.date) {
      pdf.text(options.date, 10, 20);
    }

    // Adicionar imagem
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 25, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Adicionar páginas extras se necessário
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Salvar PDF
    const fileName = `${options.lectureTitle.replace(/[^a-z0-9]/gi, '_')}_MaterialDidatico.pdf`;
    pdf.save(fileName);
  } finally {
    // Remover clone
    document.body.removeChild(clone);
  }
};
