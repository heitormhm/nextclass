import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MermaidDiagram } from './MermaidDiagram';
import { InteractiveChart } from './InteractiveChart';

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
        return <h2 key={index} className="text-3xl font-bold mt-8 mb-4 text-foreground">{bloco.texto}</h2>;
      
      case 'h3':
        return <h3 key={index} className="text-2xl font-bold mt-6 mb-3 text-foreground/90">{bloco.texto}</h3>;
      
      case 'h4':
        return <h4 key={index} className="text-xl font-bold mt-4 mb-2 text-foreground/80">{bloco.texto}</h4>;
      
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
        return (
          <div key={index} className="bg-gradient-to-br from-blue-100/80 to-blue-200/80 dark:from-blue-900/30 dark:to-blue-800/30 border-2 border-dashed border-blue-500 dark:border-blue-400 p-4 rounded-lg shadow-sm my-4">
            <p className="italic text-blue-900 dark:text-blue-100 leading-relaxed" dangerouslySetInnerHTML={{ __html: `💡 ${bloco.texto || ''}` }} />
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
      <h1 className="text-4xl font-bold mb-8 text-foreground border-b pb-4">{structuredData.titulo_geral}</h1>
      <div className="space-y-2">
        {structuredData.conteudo.map((bloco, index) => renderBlock(bloco, index))}
      </div>
    </div>
  );
};
