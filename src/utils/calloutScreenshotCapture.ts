import html2canvas from 'html2canvas';

export interface CalloutScreenshot {
  type: string;
  blob: Blob;
  timestamp: number;
  dimensions: {
    width: number;
    height: number;
  };
  dataUrl?: string;
}

export interface CalloutDocumentation {
  markdown: string;
  html: string;
  json: CalloutScreenshot[];
}

/**
 * Captura screenshot de um único elemento de callout
 */
export const captureCalloutScreenshot = async (
  calloutElement: HTMLElement,
  calloutType: string
): Promise<CalloutScreenshot> => {
  try {
    console.log(`[Screenshot] Capturing callout: ${calloutType}`);
    
    // Captura o elemento com alta qualidade
    const canvas = await html2canvas(calloutElement, {
      scale: 2, // 2x para melhor qualidade
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true,
      windowWidth: calloutElement.scrollWidth,
      windowHeight: calloutElement.scrollHeight,
      scrollX: 0,
      scrollY: 0,
    });

    // Converte para blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create blob'));
        },
        'image/png',
        1.0
      );
    });

    // Gera data URL para preview
    const dataUrl = canvas.toDataURL('image/png', 1.0);

    const screenshot: CalloutScreenshot = {
      type: calloutType,
      blob,
      dataUrl,
      timestamp: Date.now(),
      dimensions: {
        width: canvas.width,
        height: canvas.height,
      },
    };

    console.log(`[Screenshot] ✅ Captured ${calloutType}: ${canvas.width}x${canvas.height}px`);
    return screenshot;
  } catch (error) {
    console.error(`[Screenshot] ❌ Failed to capture ${calloutType}:`, error);
    throw error;
  }
};

/**
 * Captura todos os callouts dentro de um container
 */
export const captureAllCallouts = async (
  containerSelector: string = '.material-didatico-content'
): Promise<CalloutScreenshot[]> => {
  try {
    console.log('[Screenshot] Starting capture of all callouts...');
    
    // Aguarda renderização completa
    await new Promise(resolve => setTimeout(resolve, 500));

    const container = document.querySelector(containerSelector);
    if (!container) {
      throw new Error(`Container not found: ${containerSelector}`);
    }

    // Localiza todos os elementos com data-callout-type
    const calloutElements = container.querySelectorAll<HTMLElement>('[data-callout-type]');
    
    if (calloutElements.length === 0) {
      console.warn('[Screenshot] No callouts found in container');
      return [];
    }

    console.log(`[Screenshot] Found ${calloutElements.length} callouts to capture`);

    const screenshots: CalloutScreenshot[] = [];

    // Captura cada callout sequencialmente para evitar problemas de renderização
    for (const element of Array.from(calloutElements)) {
      const calloutType = element.getAttribute('data-callout-type') || 'unknown';
      
      try {
        const screenshot = await captureCalloutScreenshot(element, calloutType);
        screenshots.push(screenshot);
      } catch (error) {
        console.error(`[Screenshot] Failed to capture ${calloutType}, continuing...`, error);
      }
      
      // Pequeno delay entre capturas
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`[Screenshot] ✅ Successfully captured ${screenshots.length}/${calloutElements.length} callouts`);
    return screenshots;
  } catch (error) {
    console.error('[Screenshot] ❌ Failed to capture callouts:', error);
    throw error;
  }
};

/**
 * Faz download de um único screenshot
 */
export const downloadSingleScreenshot = (screenshot: CalloutScreenshot) => {
  const url = URL.createObjectURL(screenshot.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `callout-${screenshot.type}-${screenshot.timestamp}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  console.log(`[Screenshot] Downloaded: ${link.download}`);
};

/**
 * Faz download de todos os screenshots
 */
export const downloadCalloutScreenshots = (screenshots: CalloutScreenshot[]) => {
  if (screenshots.length === 0) {
    console.warn('[Screenshot] No screenshots to download');
    return;
  }

  console.log(`[Screenshot] Downloading ${screenshots.length} screenshots...`);

  screenshots.forEach((screenshot, index) => {
    // Delay progressivo para evitar bloqueio do navegador
    setTimeout(() => {
      downloadSingleScreenshot(screenshot);
    }, index * 300);
  });

  console.log('[Screenshot] ✅ Download initiated for all screenshots');
};

/**
 * Gera documentação Markdown dos callouts capturados
 */
export const generateCalloutDocumentation = (screenshots: CalloutScreenshot[]): string => {
  if (screenshots.length === 0) {
    return '# Documentação de Callouts\n\nNenhum callout foi capturado.';
  }

  const timestamp = new Date().toISOString();
  
  let markdown = `# 📸 Documentação de Callouts\n\n`;
  markdown += `**Data de captura:** ${new Date(screenshots[0].timestamp).toLocaleString('pt-BR')}\n\n`;
  markdown += `**Total de callouts:** ${screenshots.length}\n\n`;
  markdown += `---\n\n`;

  screenshots.forEach((screenshot, index) => {
    markdown += `## ${index + 1}. ${screenshot.type}\n\n`;
    markdown += `- **Tipo:** \`${screenshot.type}\`\n`;
    markdown += `- **Dimensões:** ${screenshot.dimensions.width}x${screenshot.dimensions.height}px\n`;
    markdown += `- **Arquivo:** \`callout-${screenshot.type}-${screenshot.timestamp}.png\`\n`;
    markdown += `\n![${screenshot.type}](./callout-${screenshot.type}-${screenshot.timestamp}.png)\n\n`;
    markdown += `---\n\n`;
  });

  markdown += `\n\n## 📊 Resumo\n\n`;
  markdown += `Total de callouts documentados: **${screenshots.length}**\n\n`;
  
  // Agrupa por tipo
  const typeCount = screenshots.reduce((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  markdown += `### Distribuição por tipo:\n\n`;
  Object.entries(typeCount).forEach(([type, count]) => {
    markdown += `- **${type}:** ${count}\n`;
  });

  console.log('[Screenshot] Generated documentation markdown');
  return markdown;
};

/**
 * Copia documentação para clipboard
 */
export const copyDocumentationToClipboard = (screenshots: CalloutScreenshot[]): Promise<void> => {
  const markdown = generateCalloutDocumentation(screenshots);
  return navigator.clipboard.writeText(markdown);
};

/**
 * Gera estatísticas dos callouts capturados
 */
export const generateCalloutStats = (screenshots: CalloutScreenshot[]) => {
  const typeCount: Record<string, number> = {};
  let totalSize = 0;
  let totalPixels = 0;

  screenshots.forEach(screenshot => {
    typeCount[screenshot.type] = (typeCount[screenshot.type] || 0) + 1;
    totalSize += screenshot.blob.size;
    totalPixels += screenshot.dimensions.width * screenshot.dimensions.height;
  });

  const avgSize = screenshots.length > 0 ? totalSize / screenshots.length : 0;
  const avgPixels = screenshots.length > 0 ? totalPixels / screenshots.length : 0;

  return {
    total: screenshots.length,
    types: typeCount,
    totalSize: (totalSize / 1024).toFixed(2) + ' KB',
    averageSize: (avgSize / 1024).toFixed(2) + ' KB',
    averagePixels: Math.round(avgPixels),
    timestamps: {
      first: screenshots[0]?.timestamp,
      last: screenshots[screenshots.length - 1]?.timestamp,
    },
  };
};
