import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MermaidDiagram } from './MermaidDiagram';
import { InteractiveChart } from './InteractiveChart';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ContentBlock {
  tipo: string;
  texto?: string;
  titulo?: string;
  descricao?: string;
  definicao_mermaid?: string;
  tipo_grafico?: 'barras' | 'pizza' | 'linha';
  dados?: any[];
  componente?: string;
  props?: any;
  biblioteca?: string;
  [key: string]: any;
}

interface StructuredContentRendererProps {
  structuredData: {
    titulo_geral: string;
    conteudo: ContentBlock[];
  };
}

export const StructuredContentRenderer = ({ structuredData }: StructuredContentRendererProps) => {
  const renderBlock = (bloco: ContentBlock, index: number) => {
    switch (bloco.tipo) {
      case 'h2':
        return <h2 key={index} className="text-3xl font-bold mt-8 mb-4 text-foreground scroll-mt-20">{bloco.texto}</h2>;
      
      case 'h3':
        return <h3 key={index} className="text-2xl font-bold mt-6 mb-3 text-foreground/90 scroll-mt-20">{bloco.texto}</h3>;
      
      case 'h4':
        return <h4 key={index} className="text-xl font-bold mt-4 mb-2 text-foreground/80 scroll-mt-20">{bloco.texto}</h4>;
      
      case 'paragrafo':
        return <p key={index} className="my-3 leading-relaxed text-foreground" dangerouslySetInnerHTML={{ __html: bloco.texto || '' }} />;
      
      case 'caixa_de_destaque':
        return (
          <div key={index} className="bg-gradient-to-br from-amber-100/80 to-amber-200/80 dark:from-amber-900/30 dark:to-amber-800/30 border-l-4 border-amber-600 dark:border-amber-500 p-5 rounded-xl shadow-md my-6">
            <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-3 text-lg">📌 {bloco.titulo}</h4>
            <div className="text-amber-800 dark:text-amber-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: bloco.texto || '' }} />
          </div>
        );
      
      case 'post_it':
        // Detectar tipo de post-it por keywords
        let postItType = 'info';
        let postItIcon = '💡';
        const textoLower = bloco.texto?.toLowerCase() || '';
        
        if (textoLower.includes('atenção') || textoLower.includes('cuidado') || textoLower.includes('alerta')) {
          postItType = 'warning';
          postItIcon = '⚠️';
        } else if (textoLower.includes('dica') || textoLower.includes('tip')) {
          postItType = 'tip';
          postItIcon = '💡';
        } else if (textoLower.includes('pense') || textoLower.includes('reflexão')) {
          postItType = 'reflection';
          postItIcon = '🤔';
        } else if (textoLower.includes('conexão') || textoLower.includes('aplicação') || textoLower.includes('prática')) {
          postItType = 'application';
          postItIcon = '🌍';
        }
        
        const postItColors: Record<string, string> = {
          warning: 'from-red-100/80 to-red-200/80 dark:from-red-900/30 dark:to-red-800/30 border-red-500 dark:border-red-400 text-red-900 dark:text-red-100',
          tip: 'from-green-100/80 to-green-200/80 dark:from-green-900/30 dark:to-green-800/30 border-green-500 dark:border-green-400 text-green-900 dark:text-green-100',
          reflection: 'from-purple-100/80 to-purple-200/80 dark:from-purple-900/30 dark:to-purple-800/30 border-purple-500 dark:border-purple-400 text-purple-900 dark:text-purple-100',
          application: 'from-blue-100/80 to-blue-200/80 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-500 dark:border-blue-400 text-blue-900 dark:text-blue-100',
          info: 'from-yellow-100/80 to-yellow-200/80 dark:from-yellow-900/30 dark:to-yellow-800/30 border-yellow-500 dark:border-yellow-400 text-yellow-900 dark:text-yellow-100'
        };
        
        return (
          <div key={index} className={`bg-gradient-to-br ${postItColors[postItType]} border-2 border-dashed dark:border-opacity-60 p-4 rounded-lg shadow-sm my-4`}>
            <p className="italic leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: `${postItIcon} ${bloco.texto || ''}` }} />
          </div>
        );
      
      case 'fluxograma':
      case 'mapa_mental':
      case 'diagrama':
        const icons: Record<string, string> = { fluxograma: '📊', mapa_mental: '🧠', diagrama: '📐' };
        return (
          <MermaidDiagram
            key={index}
            code={bloco.definicao_mermaid || ''}
            title={bloco.titulo || ''}
            description={bloco.descricao || ''}
            icon={icons[bloco.tipo] || '📊'}
          />
        );
      
      case 'grafico':
        return (
          <InteractiveChart
            key={index}
            title={bloco.titulo || ''}
            description={bloco.descricao || ''}
            tipo_grafico={bloco.tipo_grafico || 'barras'}
            dados={bloco.dados || []}
          />
        );
      
      case 'componente_react':
        if (bloco.componente === 'Accordion') {
          return (
            <div key={index} className="bg-gradient-to-br from-purple-100/80 to-purple-200/80 dark:from-purple-900/30 dark:to-purple-800/30 p-6 rounded-xl border-2 border-purple-500 dark:border-purple-400 shadow-lg my-6">
              <h4 className="font-bold text-purple-900 dark:text-purple-100 mb-2 text-lg">⚛️ {bloco.titulo}</h4>
              <p className="text-sm text-purple-800 dark:text-purple-200 italic mb-4">{bloco.descricao}</p>
              <Accordion type={bloco.props?.type || 'single'} collapsible={bloco.props?.collapsible !== false} className="w-full">
                {bloco.props?.items?.map((item: any, i: number) => (
                  <AccordionItem key={i} value={`item-${i}`} className="border-purple-300 dark:border-purple-700">
                    <AccordionTrigger className="text-left font-semibold text-purple-900 dark:text-purple-100 hover:text-purple-700 dark:hover:text-purple-300">
                      {item.trigger}
                    </AccordionTrigger>
                    <AccordionContent className="text-purple-800 dark:text-purple-200 leading-relaxed">
                      <div dangerouslySetInnerHTML={{ __html: item.content }} />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          );
        }
        return (
          <div key={index} className="bg-muted/50 border-2 border-dashed border-border p-4 rounded-lg my-4">
            <p className="text-muted-foreground">⚛️ Componente React: <strong>{bloco.componente}</strong> (não implementado)</p>
          </div>
         );
      
      case 'diretrizes_distribuicao':
        return (
          <div key={index} className="bg-gradient-to-br from-indigo-100/80 to-indigo-200/80 dark:from-indigo-900/30 dark:to-indigo-800/30 border-l-4 border-indigo-600 dark:border-indigo-500 p-5 rounded-xl shadow-md my-6">
            <h4 className="font-bold text-indigo-900 dark:text-indigo-100 mb-3 text-lg flex items-center gap-2">
              📋 {bloco.titulo || 'Diretrizes de Distribuição'}
            </h4>
            <div className="text-indigo-800 dark:text-indigo-200 leading-relaxed space-y-2">
              {bloco.itens?.map((item: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-indigo-600 dark:text-indigo-400 mt-1">•</span>
                  <span dangerouslySetInnerHTML={{ __html: item }} />
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'referencias':
        return (
          <div key={index} className="bg-gradient-to-br from-slate-100/80 to-slate-200/80 dark:from-slate-900/50 dark:to-slate-800/50 border-l-4 border-slate-600 dark:border-slate-500 rounded-xl shadow-md my-8 mt-12">
            <div className="p-6 pb-0">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4 text-xl flex items-center gap-2">
                📚 {bloco.titulo || 'Referências Bibliográficas'}
              </h4>
            </div>
            <ScrollArea className="h-[400px] px-6 pb-6">
              <div className="space-y-3 pr-4">
                {bloco.itens?.map((ref: string, i: number) => (
                  <p 
                    key={i} 
                    className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed pl-4 border-l-2 border-slate-400 dark:border-slate-600 break-words whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: ref }}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        );
      
      default:
        console.warn(`Tipo de bloco não suportado: ${bloco.tipo}`);
        return (
          <div key={index} className="bg-destructive/10 border-2 border-destructive/30 p-4 rounded-lg my-4">
            <strong className="text-destructive">⚠️ Tipo de bloco não suportado:</strong> <code className="text-destructive/80">{bloco.tipo}</code>
          </div>
        );
    }
  };

  return (
    <div className="structured-content prose prose-slate dark:prose-invert max-w-none">
      <h1 className="text-4xl font-bold mb-8 text-foreground border-b pb-4 scroll-mt-20">{structuredData.titulo_geral}</h1>
      <div className="space-y-4">
        {structuredData.conteudo.map((bloco, index) => renderBlock(bloco, index))}
      </div>
    </div>
  );
};
