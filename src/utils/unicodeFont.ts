// DejaVu Sans font loader - Suporta símbolos matemáticos Unicode
// Carrega a fonte TTF e converte para base64 em runtime

import fontFile from '@/assets/fonts/DejaVuSans.ttf';

export const unicodeFontConfig = {
  fontName: 'DejaVuSans',
  fontStyle: 'normal',
  fontFileName: 'DejaVuSans.ttf'
};

// Função para carregar e converter fonte TTF para base64
export const loadUnicodeFont = async (): Promise<string> => {
  try {
    const response = await fetch(fontFile);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remover o prefixo "data:application/octet-stream;base64,"
        const base64String = base64.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('❌ Erro ao carregar fonte Unicode:', error);
    throw error;
  }
};

