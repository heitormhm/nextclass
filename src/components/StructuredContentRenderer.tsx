import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MermaidDiagram } from './MermaidDiagram';
import { InteractiveChart } from './InteractiveChart';
import { ScrollArea } from '@/components/ui/scroll-area';

// Função para converter marcação Markdown básica para HTML
const convertMarkdownToHtml = (text: string): string => {
  if (!text) return '';
  
  return text
    // 1. Negrito: **texto** → <strong>texto</strong>
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 2. Itálico: *texto* → <em>texto</em> (só depois de negrito para evitar conflito)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // 3. Quebras de linha escapadas
    .replace(/&lt;br&gt;/gi, '<br>')
    .replace(/&lt;br \/&gt;/gi, '<br>')
    .replace(/&lt;br\/&gt;/gi, '<br>')
    .replace(/\\n/g, '<br>')
    .replace(/\n/g, '<br>');
};

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
  // Preparar blocos com objetivos de aprendizagem da metadata se disponíveis
  const blocosComObjetivos = React.useMemo(() => {
    const blocos = [...structuredData.conteudo];
    
    // Se metadata contém objetivos_aprendizagem estruturados, adicionar bloco dedicado
    if ((structuredData as any).metadata?.objetivos_aprendizagem || (structuredData as any).objetivos_aprendizagem) {
      const obj = (structuredData as any).metadata?.objetivos_aprendizagem || (structuredData as any).objetivos_aprendizagem;
      
      // Verificar se já existe uma caixa de objetivos
      const jaTemObjetivos = blocos.some(b => 
        b.tipo === 'caixa_de_destaque' && b.titulo?.toLowerCase().includes('objetivos')
      );
      
      if (!jaTemObjetivos && (obj.lembrar_entender || obj.aplicar_analisar || obj.avaliar_criar)) {
        const objetivosText = [
          obj.lembrar_entender?.length ? `<strong>Lembrar/Entender:</strong><br>${obj.lembrar_entender.map((o: string) => `• ${o}`).join('<br>')}` : '',
          obj.aplicar_analisar?.length ? `<br><br><strong>Aplicar/Analisar:</strong><br>${obj.aplicar_analisar.map((o: string) => `• ${o}`).join('<br>')}` : '',
          obj.avaliar_criar?.length ? `<br><br><strong>Avaliar/Criar:</strong><br>${obj.avaliar_criar.map((o: string) => `• ${o}`).join('<br>')}` : ''
        ].filter(Boolean).join('');

        if (objetivosText) {
          // Inserir após o primeiro h2 ou no início
          const primeiroH2Index = blocos.findIndex(b => b.tipo === 'h2');
          const insertIndex = primeiroH2Index >= 0 ? primeiroH2Index + 1 : 0;
          
          blocos.splice(insertIndex, 0, {
            tipo: 'caixa_de_destaque',
            titulo: '🎯 Objetivos de Aprendizagem da Sessão',
            texto: objetivosText
          });
        }
      }
    }
    
    // Filtrar blocos com tipo undefined (Fase 2)
    const blocosFiltrados = blocos.filter(bloco => {
      if (!bloco.tipo) {
        console.warn('[StructuredContentRenderer] Bloco sem tipo detectado e removido:', bloco);
        return false;
      }
      return true;
    });
    
    return blocosFiltrados;
  }, [structuredData]);

  const renderBlock = (bloco: ContentBlock, index: number) => {
    switch (bloco.tipo) {
      case 'h2':
        return <h2 key={index} className="text-3xl font-bold mt-8 mb-4 text-foreground scroll-mt-20">{bloco.texto}</h2>;
      
      case 'h3':
        return <h3 key={index} className="text-2xl font-bold mt-6 mb-3 text-foreground/90 scroll-mt-20">{bloco.texto}</h3>;
      
      case 'h4':
        return <h4 key={index} className="text-xl font-bold mt-4 mb-2 text-foreground/80 scroll-mt-20">{bloco.texto}</h4>;
      
      case 'paragrafo':
        const htmlContent = convertMarkdownToHtml(bloco.texto || '');
        return <p key={index} className="my-3 leading-relaxed text-foreground" dangerouslySetInnerHTML={{ __html: htmlContent }} />;
      
      case 'caixa_de_destaque':
        return (
          <div key={index} className="bg-gradient-to-br from-amber-100/80 to-amber-200/80 dark:from-amber-900/30 dark:to-amber-800/30 border-l-4 border-amber-600 dark:border-amber-500 p-5 rounded-xl shadow-md my-6">
            <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-3 text-lg">📌 {bloco.titulo}</h4>
            <div className="text-amber-800 dark:text-amber-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(bloco.texto || '') }} />
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
            <p className="italic leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: `${postItIcon} ${convertMarkdownToHtml(bloco.texto || '')}` }} />
          </div>
        );
      
      case 'checklist':
        return (
          <div key={index} className="bg-gradient-to-br from-emerald-50/80 to-emerald-100/80 dark:from-emerald-900/20 dark:to-emerald-800/20 border-l-4 border-emerald-600 dark:border-emerald-500 p-5 rounded-xl shadow-md my-6">
            <h4 className="font-bold text-emerald-900 dark:text-emerald-100 mb-3 text-lg flex items-center gap-2">
              {bloco.titulo || '✅ Checklist'}
            </h4>
            <ul className="space-y-2.5">
              {bloco.itens?.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-3 group">
                  <input 
                    type="checkbox" 
                    className="mt-1 w-4 h-4 text-emerald-600 rounded border-emerald-400 focus:ring-emerald-500 cursor-pointer"
                    id={`checklist-${index}-${i}`}
                  />
                  <label 
                    htmlFor={`checklist-${index}-${i}`}
                    className="text-emerald-800 dark:text-emerald-200 leading-relaxed cursor-pointer group-hover:text-emerald-900 dark:group-hover:text-emerald-100 transition-colors"
                    dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(item) }}
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      
      case 'cronograma_gantt':
        return (
          <MermaidDiagram
            key={index}
            code={bloco.definicao_mermaid || ''}
            title={bloco.titulo || '⏱️ Cronograma da Aula'}
            description="Estrutura temporal e sequência de atividades"
            icon="📅"
          />
        );

      case 'momento_pedagogico':
        return (
          <div key={index} className="bg-gradient-to-br from-indigo-50/80 to-indigo-100/80 dark:from-indigo-900/20 dark:to-indigo-800/20 border-2 border-indigo-400 dark:border-indigo-600 p-6 rounded-xl shadow-lg my-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                🎯 Momento {bloco.numero}: {bloco.titulo}
              </h3>
              <span className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                {bloco.duracao_minutos} min
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg">
                <p className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold mb-1">METODOLOGIA</p>
                <p className="text-indigo-900 dark:text-indigo-100">{bloco.metodologia}</p>
              </div>
              <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg">
                <p className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold mb-1">RECURSOS</p>
                <p className="text-indigo-900 dark:text-indigo-100">{bloco.recursos?.join(', ') || 'Nenhum'}</p>
              </div>
            </div>
            
            {bloco.passos && bloco.passos.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-bold text-indigo-800 dark:text-indigo-200 mb-2">Passos:</h4>
                {bloco.passos.map((passo: any, i: number) => (
                  <div key={i} className="flex gap-3 items-start bg-white/60 dark:bg-black/30 p-4 rounded-lg">
                    <div className="flex-shrink-0 w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="font-bold text-indigo-900 dark:text-indigo-100">{passo.nome}</h5>
                        <span className="text-xs bg-indigo-200 dark:bg-indigo-800 px-2 py-1 rounded">
                          {passo.tempo_min} min
                        </span>
                      </div>
                      <p className="text-indigo-800 dark:text-indigo-200 text-sm leading-relaxed">
                        {passo.descricao}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'problema_pbl':
        return (
          <div key={index} className="bg-gradient-to-br from-rose-100/80 to-rose-200/80 dark:from-rose-900/30 dark:to-rose-800/30 border-4 border-rose-500 dark:border-rose-400 p-6 rounded-xl shadow-2xl my-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-5xl">🎯</span>
              <h3 className="text-3xl font-bold text-rose-900 dark:text-rose-100">
                {bloco.titulo || 'O Desafio PBL'}
              </h3>
            </div>
            
            <div className="bg-white/70 dark:bg-black/30 p-5 rounded-lg mb-4">
              <h4 className="font-bold text-rose-800 dark:text-rose-200 mb-2 text-lg">📜 A Missão:</h4>
              <p className="text-rose-900 dark:text-rose-100 leading-relaxed text-lg">
                {bloco.problema}
              </p>
            </div>
            
            {bloco.entregavel && (
              <div className="bg-rose-200/50 dark:bg-rose-900/50 p-4 rounded-lg mb-4">
                <h4 className="font-bold text-rose-800 dark:text-rose-200 mb-2">📦 Entregável:</h4>
                <p className="text-rose-900 dark:text-rose-100">{bloco.entregavel}</p>
              </div>
            )}
            
            {bloco.questoes_guia && bloco.questoes_guia.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-rose-800 dark:text-rose-200 mb-2">🧭 Questões-Guia:</h4>
                {bloco.questoes_guia.map((q: string, i: number) => (
                  <div key={i} className="flex gap-2 items-start text-rose-900 dark:text-rose-100">
                    <span className="font-bold">{i + 1}.</span>
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'metricas_avaliacao':
        return (
          <div key={index} className="bg-gradient-to-br from-teal-50/80 to-teal-100/80 dark:from-teal-900/20 dark:to-teal-800/20 border-l-4 border-teal-600 dark:border-teal-500 p-6 rounded-xl shadow-md my-6">
            <h4 className="font-bold text-teal-900 dark:text-teal-100 mb-4 text-xl flex items-center gap-2">
              📊 {bloco.titulo || 'Rubrica de Avaliação'}
            </h4>
            <div className="space-y-4">
              {bloco.categorias?.map((cat: any, i: number) => (
                <div key={i} className="bg-white/60 dark:bg-black/30 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-bold text-teal-800 dark:text-teal-200">{cat.nome}</h5>
                    <span className="bg-teal-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      {cat.peso}%
                    </span>
                  </div>
                  <ul className="list-disc list-inside text-teal-700 dark:text-teal-300 text-sm space-y-1">
                    {cat.criterios?.map((c: string, j: number) => (
                      <li key={j}>{c}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'organograma':
      case 'fluxograma':
      case 'mapa_mental':
      case 'diagrama':
        const icons: Record<string, string> = { 
          fluxograma: '📊', 
          mapa_mental: '🧠', 
          diagrama: '📐',
          organograma: '🏢' 
        };
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
                  <span dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(item) }} />
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'referencias':
        const referencesContent = bloco.itens || (bloco.texto ? [bloco.texto] : []);
        
        // Log para debug
        console.log('[Referencias] Conteúdo recebido:', referencesContent);
        console.log('[Referencias] Tem <br> tags?', referencesContent.some((r: string) => r.includes('<br>')));
        
        return (
          <div key={index} className="bg-gradient-to-br from-slate-100/80 to-slate-200/80 dark:from-slate-900/50 dark:to-slate-800/50 border-l-4 border-slate-600 dark:border-slate-500 rounded-xl shadow-md my-8 mt-12">
            <div className="p-6 pb-0">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4 text-xl flex items-center gap-2">
                📚 {bloco.titulo || 'Referências Bibliográficas'}
              </h4>
            </div>
            <ScrollArea className="h-[400px] px-6 pb-6">
              <div className="space-y-6 pr-4">
                {referencesContent.map((ref: string, i: number) => {
                  let refHtml = convertMarkdownToHtml(ref)
                    // Garantir espaçamento mínimo entre seções
                    .replace(/<br><br>/gi, '<br><br><span style="display:block;height:8px;"></span>');
                  
                  console.log(`[Referencias] Item ${i} após limpeza:`, refHtml.substring(0, 100));
                  
                  return (
                    <div 
                      key={i} 
                      className="text-slate-800 dark:text-slate-200 text-sm pl-4 border-l-2 border-slate-400 dark:border-slate-600 mb-6"
                      style={{ 
                        whiteSpace: 'normal',
                        display: 'block',
                        lineHeight: '1.8',
                        minHeight: '60px'
                      }}
                      dangerouslySetInnerHTML={{ __html: refHtml }}
                    />
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        );
      
      case 'questao_multipla_escolha':
        return (
          <div key={index} className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-2 border-blue-300 dark:border-blue-700 p-6 rounded-xl shadow-md my-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {bloco.numero}
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3" dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(bloco.enunciado || '') }} />
                
                <div className="space-y-2">
                  {bloco.alternativas && Object.entries(bloco.alternativas).map(([letra, texto]: [string, any]) => (
                    <div key={letra} className="flex items-start gap-2 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-blue-200 dark:border-blue-800">
                      <span className="font-bold text-blue-700 dark:text-blue-300 min-w-[24px]">{letra})</span>
                      <span className="text-gray-800 dark:text-gray-200" dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(texto) }} />
                    </div>
                  ))}
                </div>
                
                {bloco.gabarito && (
                  <details className="mt-4 p-4 bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-700 rounded-lg">
                    <summary className="cursor-pointer font-bold text-green-800 dark:text-green-200 mb-2">
                      ✅ Ver Gabarito e Justificativa
                    </summary>
                    <div className="mt-3 space-y-3">
                      <p className="text-green-900 dark:text-green-100">
                        <strong>Resposta Correta:</strong> {bloco.gabarito.resposta_correta}
                      </p>
                      <p className="text-gray-800 dark:text-gray-200" dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(bloco.gabarito.justificativa || '') }} />
                      
                      {bloco.gabarito.analise_incorretas && (
                        <div className="mt-3 pt-3 border-t border-green-300 dark:border-green-700">
                          <p className="font-semibold text-green-800 dark:text-green-200 mb-2">Análise das Alternativas Incorretas:</p>
                          <div className="space-y-2">
                            {Object.entries(bloco.gabarito.analise_incorretas).map(([letra, analise]: [string, any]) => (
                              <p key={letra} className="text-sm text-gray-700 dark:text-gray-300">
                                <strong className="text-red-600 dark:text-red-400">{letra}:</strong> {analise}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                )}
                
                {bloco.competencia && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/40 rounded-full">
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      🎯 Competência: {bloco.competencia}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'questao_aberta':
        return (
          <div key={index} className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-2 border-purple-300 dark:border-purple-700 p-6 rounded-xl shadow-md my-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {bloco.numero}
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-4" dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(bloco.enunciado || '') }} />
                
                <details className="mb-4 p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-300 dark:border-purple-700 rounded-lg">
                  <summary className="cursor-pointer font-bold text-purple-800 dark:text-purple-200 mb-2">
                    💡 Ver Resposta Esperada
                  </summary>
                  <div className="mt-3 text-gray-800 dark:text-gray-200" dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(bloco.resposta_esperada || '') }} />
                </details>
                
                {bloco.rubrica && bloco.rubrica.criterios && (
                  <details className="p-4 bg-white/60 dark:bg-gray-800/60 border border-purple-300 dark:border-purple-700 rounded-lg">
                    <summary className="cursor-pointer font-bold text-purple-800 dark:text-purple-200 mb-2">
                      📊 Rubrica de Avaliação
                    </summary>
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="bg-purple-100 dark:bg-purple-900/50">
                            <th className="border border-purple-300 dark:border-purple-700 px-3 py-2 text-left font-semibold text-purple-900 dark:text-purple-100">Critério</th>
                            <th className="border border-purple-300 dark:border-purple-700 px-3 py-2 text-left font-semibold text-purple-900 dark:text-purple-100">Insuficiente (0-1)</th>
                            <th className="border border-purple-300 dark:border-purple-700 px-3 py-2 text-left font-semibold text-purple-900 dark:text-purple-100">Suficiente (2-3)</th>
                            <th className="border border-purple-300 dark:border-purple-700 px-3 py-2 text-left font-semibold text-purple-900 dark:text-purple-100">Excelente (4-5)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bloco.rubrica.criterios.map((criterio: any, i: number) => (
                            <tr key={i} className="hover:bg-purple-50 dark:hover:bg-purple-900/20">
                              <td className="border border-purple-300 dark:border-purple-700 px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{criterio.nome}</td>
                              <td className="border border-purple-300 dark:border-purple-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{criterio.insuficiente}</td>
                              <td className="border border-purple-300 dark:border-purple-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{criterio.suficiente}</td>
                              <td className="border border-purple-300 dark:border-purple-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{criterio.excelente}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
                
                {bloco.competencia && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/40 rounded-full">
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                      🎯 Competência: {bloco.competencia}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'componente_react':
        return (
          <details key={index} className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 p-4 rounded-lg my-4">
            <summary className="cursor-pointer font-bold text-gray-800 dark:text-gray-200 mb-2">
              💻 Exemplo de Componente: {bloco.nome}
            </summary>
            <div className="mt-3">
              {bloco.descricao && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{bloco.descricao}</p>
              )}
              {bloco.codigo_jsx && (
                <pre className="bg-gray-900 dark:bg-black text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                  <code>{bloco.codigo_jsx}</code>
                </pre>
              )}
            </div>
          </details>
        );
      
      default:
        console.warn(`[StructuredContentRenderer] Tipo de bloco não suportado: ${bloco.tipo}`);
        return null; // Não renderizar nada, evitar poluição visual
    }
  };

  return (
    <div className="structured-content prose prose-slate dark:prose-invert max-w-none">
      <h1 className="text-4xl font-bold mb-8 text-foreground border-b pb-4 scroll-mt-20">{structuredData.titulo_geral}</h1>
      <div className="space-y-4">
        {blocosComObjetivos.map((bloco, index) => renderBlock(bloco, index))}
      </div>
    </div>
  );
};
