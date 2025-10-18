import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  code: string;
  title: string;
  description: string;
  icon: string;
}

// Função de sanitização para limpar código Mermaid antes de renderizar
const sanitizeMermaidCode = (code: string): string => {
  let sanitized = code;
  
  // 1. Remover caracteres problemáticos em labels com colchetes []
  sanitized = sanitized.replace(/([A-Z]\[)([^\]]+)(\])/g, (match, open, content, close) => {
    let cleanContent = content
      // Substituir parênteses por hífen
      .replace(/\(/g, ' - ')
      .replace(/\)/g, '')
      // Remover caracteres especiais perigosos
      .replace(/[&<>"']/g, '')
      // Normalizar múltiplos espaços
      .replace(/\s+/g, ' ')
      .trim();
    
    return `${open}${cleanContent}${close}`;
  });
  
  // 2. Limpar labels em chaves {} (para mapas mentais)
  sanitized = sanitized.replace(/(\{)([^\}]+)(\})/g, (match, open, content, close) => {
    let cleanContent = content
      .replace(/\(/g, ' - ')
      .replace(/\)/g, '')
      .replace(/[&<>"']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return `${open}${cleanContent}${close}`;
  });
  
  // 3. Validar estrutura básica
  if (!sanitized.includes('graph') && !sanitized.includes('flowchart') && !sanitized.includes('mindmap')) {
    console.warn('[Mermaid] Código sem tipo de diagrama reconhecido');
  }
  
  return sanitized;
};

export const MermaidDiagram = ({ code, title, description, icon }: MermaidDiagramProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (ref.current && code) {
        try {
          mermaid.initialize({ 
            theme: 'default',
            themeVariables: {
              primaryColor: '#3b82f6',
              primaryTextColor: '#fff',
              primaryBorderColor: '#2563eb',
              lineColor: '#8b5cf6',
              secondaryColor: '#10b981',
              tertiaryColor: '#f59e0b',
              background: '#ffffff',
              mainBkg: '#dbeafe',
              secondBkg: '#e9d5ff',
              tertiaryBkg: '#fef3c7',
            },
            startOnLoad: false,
            securityLevel: 'loose',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          });
          
          const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const sanitizedCode = sanitizeMermaidCode(code);
          const { svg } = await mermaid.render(uniqueId, sanitizedCode);
          ref.current.innerHTML = svg;
          setError(null);
        } catch (err) {
          console.error('[Mermaid] Erro ao renderizar:', err);
          console.error('[Mermaid] Código original:', code);
          const sanitizedCode = sanitizeMermaidCode(code);
          console.error('[Mermaid] Código sanitizado:', sanitizedCode);
          setError(`Erro na sintaxe do diagrama. Detalhes: ${(err as Error).message}`);
        }
      }
    };
    
    renderDiagram();
  }, [code]);

  return (
    <div className="bg-muted/30 p-6 rounded-xl border-2 border-border my-6">
      <h4 className="font-bold text-foreground mb-2 text-lg">{icon} {title}</h4>
      <p className="text-sm text-muted-foreground italic mb-4">{description}</p>
      {error ? (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg">
          ⚠️ {error}
        </div>
      ) : (
        <div ref={ref} className="flex justify-center items-center min-h-[200px] bg-white rounded-lg p-4" />
      )}
    </div>
  );
};
