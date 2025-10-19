import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();

    if (!content) {
      return new Response(JSON.stringify({ error: 'Conteúdo não fornecido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('🎓 Iniciando geração de plano de aula Master Prompt V2.0...');

    // Gerar ID único para o job e pegar teacher_id do header
    const jobId = crypto.randomUUID();
    const authHeader = req.headers.get('authorization');
    
    // Extrair teacher_id do token JWT
    let teacherId: string | null = null;
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const payload = JSON.parse(atob(token.split('.')[1]));
        teacherId = payload.sub;
      } catch (e) {
        console.error('❌ Erro ao extrair teacher_id:', e);
      }
    }

    // Criar registro inicial do job no banco
    if (teacherId) {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.from('lesson_plan_jobs').insert({
        job_id: jobId,
        teacher_id: teacherId,
        status: 'processing',
        created_at: new Date().toISOString()
      });
      
      console.log(`✅ Job ${jobId} registrado no BD para teacher ${teacherId}`);
    }

    // Retornar resposta imediata
    const immediateResponse = new Response(
      JSON.stringify({ 
        jobId, 
        status: 'processing',
        message: 'Plano de aula em processamento. Aguarde 2-3 minutos.' 
      }), 
      {
        status: 202, // Accepted
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

    // Usar waitUntil para processar em background
    const backgroundProcessing = (async () => {
      try {
        console.log(`[Job ${jobId}] 🔍 Fase 1: Análise Pedagógica...`);
    
    const fase1SystemPrompt = `# ARQUITETO DE EXPERIÊNCIAS DE APRENDIZAGEM

Você é um Designer Instrucional Sênior especializado em Educação Superior.

## TAREFA FASE 1: ANÁLISE PEDAGÓGICA
Analise o [TEXTO_BASE] e retorne EXCLUSIVAMENTE um JSON seguindo esta estrutura:

{
  "grande_area": "string",
  "disciplina": "string",
  "contexto_aplicacao": "string",
  "conceitos_chave": ["string"],
  "conceitos_secundarios": ["string"],
  "topico_central": "string",
  "problema_central_pbl": "string",
  "objetivo_aprendizagem_macro": "string",
  "artefatos_entregaveis": ["string"],
  "roteiro_aprendizagem": [
    {
      "titulo_material": "string",
      "tipo": "Texto de Problematização | Texto Expositivo Aprofundado | Exemplo Prático Resolvido",
      "objetivo_especifico": "string",
      "justificativa_pedagogica": "string"
    }
  ]
}

Baseie-se em Aprendizagem Baseada em Problemas (PBL).
Identifique 3-5 conceitos-chave fundamentais.
Crie um problema autêntico e complexo do mundo real.
`;

    const fase1Response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: fase1SystemPrompt },
          { role: 'user', content: `[TEXTO_BASE]:\n${content}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!fase1Response.ok) {
      throw new Error(`Fase 1 falhou: ${fase1Response.status}`);
    }

    const fase1Data = await fase1Response.json();
    let jsonAnalise;
    
    try {
      const jsonMatch = fase1Data.choices[0].message.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSON não encontrado');
      jsonAnalise = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('❌ Erro ao parsear análise:', e);
      throw new Error('Falha ao processar análise pedagógica');
    }

    console.log('✅ Fase 1 concluída');

    // FASE 1.5: Verificação de Suficiência e Web Search
    console.log('🔍 Fase 1.5: Verificando suficiência do conteúdo...');

    const verificacaoPrompt = `Você é um avaliador crítico de conteúdo educacional.

Analise o [TEXTO_BASE] e o [JSON_ANALISE] e responda APENAS com JSON:

{
  "suficiente": boolean,
  "justificativa": "string",
  "lacunas_identificadas": ["string"],
  "consultas_sugeridas": ["string"]
}

CRITÉRIOS:
- Profundidade teórica adequada para ensino superior?
- Presença de exemplos práticos do mundo real?
- Dados/estatísticas que sustentem conceitos?
- Diferentes perspectivas sobre o tema?

Se "suficiente": false, sugira 2-3 consultas de pesquisa específicas em inglês.`;

    const verificacaoResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: verificacaoPrompt },
          { role: 'user', content: `[TEXTO_BASE]:\n${content}\n\n[JSON_ANALISE]:\n${JSON.stringify(jsonAnalise, null, 2)}` }
        ],
        temperature: 0.2,
      }),
    });

    let verificacao: { suficiente: boolean; justificativa?: string; lacunas_identificadas?: string[]; consultas_sugeridas?: string[] } = { suficiente: true };
    try {
      const verificacaoData = await verificacaoResponse.json();
      const jsonMatch = verificacaoData.choices[0].message.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) verificacao = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.warn('⚠️ Assumindo conteúdo suficiente');
    }

    console.log('📋 Verificação:', verificacao);

    let conteudoEnriquecido = content;

    if (!verificacao.suficiente && verificacao.consultas_sugeridas?.length) {
      console.log('🌐 Iniciando Web Search...');
      
      const BRAVE_API_KEY = Deno.env.get('BRAVE_SEARCH_API_KEY');
      let resultados: any[] = [];
      
      for (const query of verificacao.consultas_sugeridas.slice(0, 2)) {
        try {
          const resp = await fetch(
            `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query + ' site:.edu OR site:.gov OR scholar')}`,
            { headers: { 'X-Subscription-Token': BRAVE_API_KEY || '' } }
          );
          
          if (resp.ok) {
            const data = await resp.json();
            resultados.push(...(data.web?.results || []).slice(0, 3));
          }
        } catch (e) {
          console.warn(`⚠️ Erro em pesquisa: ${query}`);
        }
      }
      
      if (resultados.length > 0) {
        console.log(`✅ ${resultados.length} fontes acadêmicas encontradas`);
        const sintese = resultados.map(r => `- ${r.title}: ${r.description} (${r.url})`).join('\n');
        conteudoEnriquecido = `${content}\n\n### Fontes Adicionais Consultadas:\n${sintese}`;
      }
    }

    console.log('✅ Verificação concluída');

    // FASE 2: Geração de Conteúdo com Master Prompt V2.0
    console.log('🎨 Fase 2: Geração de conteúdo estruturado...');

    const fase2SystemPrompt = `# ESPECIALISTA SÊNIOR EM DESIGN INSTRUCIONAL

Você é um Professor Doutor renomado com expertise em neurociência da aprendizagem, metodologias ativas (PBL, TBL) e tradicionais.

## TAREFA: GERAR PLANO DE AULA COMPLETO PARA 3-4 HORAS

Com base no {JSON_ANALISE} e {TEXTO_BASE_ENRIQUECIDO}, crie um plano de aula pronto para usar.

## ESTRUTURA JSON OBRIGATÓRIA:

{
  "titulo_geral": "string",
  "metadata": {
    "disciplina": "string",
    "grande_area": "string",
    "duracao_estimada": "3-4 horas/aula (180-240 min)",
    "pre_requisitos": ["string"],
    "problema_central_pbl": "string"
  },
  "objetivos_aprendizagem": {
    "lembrar_entender": ["string"],
    "aplicar_analisar": ["string"],
    "avaliar_criar": ["string"]
  },
  "conteudo": [
    // BLOCOS PEDAGÓGICOS
  ]
}

## TIPOS DE BLOCOS:

### NOVOS BLOCOS (Master Prompt V2.0):

1. **cronograma_gantt**: Visualização temporal da aula
   {
     "tipo": "cronograma_gantt",
     "titulo": "Estrutura Visual da Aula",
     "definicao_mermaid": "gantt\\ntitle Cronograma da Aula\\ndateFormat HH:mm\\naxisFormat %H:%M\\nsection Aquecimento\\nAbertura :a1, 00:00, 15m\\n..."
   }

2. **momento_pedagogico**: Estrutura "Momento 1, 2, 3..."
   {
     "tipo": "momento_pedagogico",
     "numero": 1,
     "titulo": "Abertura e Exposição Conceitual",
     "duracao_minutos": 60,
     "metodologia": "Aula expositiva dialogada",
     "recursos": ["Slides", "Lousa"],
     "passos": [
       {"nome": "Gancho", "tempo_min": 5, "descricao": "..."}
     ]
   }

3. **problema_pbl**: Caixa especial para o desafio central
   {
     "tipo": "problema_pbl",
     "titulo": "A Missão",
     "problema": "string (cenário detalhado)",
     "entregavel": "string",
     "questoes_guia": ["string"]
   }

4. **metricas_avaliacao**: Rubrica/critérios
   {
     "tipo": "metricas_avaliacao",
     "categorias": [
       {"nome": "Clareza", "peso": 30, "criterios": ["string"]}
     ]
   }

### BLOCOS EXISTENTES (manter):
- h2, h3, h4
- paragrafo
- caixa_de_destaque
- post_it (4 categorias: 🤔 Pense Nisto, 💡 Dica, 🌍 Aplicação, ⚠️ Atenção)
- checklist
- mapa_mental (Mermaid mindmap)
- fluxograma (Mermaid graph)
- grafico (barras, pizza, linha)
- referencias

### BLOCOS PROIBIDOS (NÃO USAR):
- **ul, ol** → Converter em "checklist"
- **accordion** → Usar "momento_pedagogico" com passos

## ESTRUTURA PEDAGÓGICA OBRIGATÓRIA:

[COMPONENTE: PlanoDeAulaHeader]
- h2: "Plano de Aula: {titulo}"
- paragrafo: Contextualização (150-300 palavras) ⚠️ OBRIGATÓRIO
- h3: "Objetivos de Aprendizagem da Sessão"
- paragrafo: Introduzir os objetivos antes de listá-los (50-100 palavras) ⚠️ OBRIGATÓRIO
- caixa_de_destaque: Objetivos estruturados por nível de Bloom
  {
    "tipo": "caixa_de_destaque",
    "titulo": "🎯 Objetivos de Aprendizagem",
    "texto": "**Lembrar/Entender:**<br>• Objetivo 1<br>• Objetivo 2<br><br>**Aplicar/Analisar:**<br>• Objetivo 3<br>• Objetivo 4<br><br>**Avaliar/Criar:**<br>• Objetivo 5<br>• Objetivo 6"
  }

[COMPONENTE: VisualizacaoEstrategicaAula]
- h3: "Estrutura Temporal da Aula"
- paragrafo: Explicar a estratégia de divisão temporal (50-100 palavras) ⚠️ OBRIGATÓRIO
- cronograma_gantt: Linha do tempo

[COMPONENTE: ConteudoDetalhado]
- h2: "Desenvolvimento da Aula"
- paragrafo: Introdução aos momentos pedagógicos (100-200 palavras) ⚠️ OBRIGATÓRIO
- momento_pedagogico 1: Abertura (15 min)
- paragrafo: Transição para próxima fase (30-80 palavras) ⚠️ OBRIGATÓRIO
- momento_pedagogico 2: Demonstração (30 min)
- paragrafo: Justificativa para o desafio PBL (50-100 palavras) ⚠️ OBRIGATÓRIO
- momento_pedagogico 3: Apresentação do Desafio PBL (15 min)
- problema_pbl: O desafio central
- post_it (categoria: 💡 Dica): Orientações para resolução
- momento_pedagogico 4: Trabalho em Grupo (60 min)
- paragrafo: Descrição do processo colaborativo (80-150 palavras) ⚠️ OBRIGATÓRIO
- momento_pedagogico 5: Apresentações (30 min)
- momento_pedagogico 6: Síntese e Encerramento (15 min)
- paragrafo: Reflexão sobre aprendizagem (100-200 palavras) ⚠️ OBRIGATÓRIO

[COMPONENTE: MapaMentalConceitos]
- h2: "Mapa Conceitual"
- paragrafo: Explicar as relações entre conceitos (100-150 palavras) ⚠️ OBRIGATÓRIO
- mapa_mental: Conceitos-chave e conexões

[COMPONENTE: RecursosELeituras] ⭐ NOVO
- h2: "Recursos e Materiais de Apoio"
- h3: "Leituras Obrigatórias"
- paragrafo: Introdução às leituras (50-100 palavras) ⚠️ OBRIGATÓRIO
- caixa_de_destaque:
  {
    "tipo": "caixa_de_destaque",
    "titulo": "📚 Leituras Obrigatórias",
    "texto": "**Antes da Aula:**<br>• Leitura 1 (páginas, capítulos)<br>• Leitura 2 (artigo, seções)<br><br>**Após a Aula:**<br>• Leitura complementar 1<br>• Leitura complementar 2"
  }
- h3: "Fontes de Consulta e Aprofundamento"
- paragrafo: Orientações sobre como usar as fontes (50-100 palavras) ⚠️ OBRIGATÓRIO
- checklist:
  {
    "tipo": "checklist",
    "titulo": "📖 Fontes Recomendadas",
    "itens": [
      "Livro-texto principal (capítulos específicos)",
      "Vídeo-aula ou tutorial online (com links)",
      "Artigo científico ou case study",
      "Ferramenta ou software (se aplicável)",
      "Material complementar (slides, handouts)"
    ]
  }

[COMPONENTE: AvaliacaoERecursos]
- h2: "Avaliação e Critérios"
- paragrafo: Explicar a abordagem avaliativa (100-150 palavras) ⚠️ OBRIGATÓRIO
- metricas_avaliacao: Rubrica detalhada
- h3: "Checklist de Preparação"
- paragrafo: Orientações finais (50-100 palavras) ⚠️ OBRIGATÓRIO
- checklist: Recursos físicos e digitais necessários

[COMPONENTE: Referencias]
- h2: "Referências Bibliográficas"
- paragrafo: Nota sobre as fontes utilizadas (30-50 palavras) ⚠️ OBRIGATÓRIO
- referencias: Fontes formatadas ABNT/APA (mínimo 5 referências)

## REGRA DE EQUILÍBRIO TEXTO-VISUAL ⚠️ OBRIGATÓRIO:

Para cada 2-3 elementos visuais (post_it, diagrama, checklist, gráfico):
- INSERIR 1 bloco "paragrafo" de transição/explicação (mínimo 50 palavras)

Contagem mínima obrigatória no plano final:
- ✅ 8-12 blocos "paragrafo" (contexto, transições, explicações)
- ✅ 6 blocos "momento_pedagogico" (estrutura da aula)
- ✅ 1 bloco "problema_pbl" (desafio central)
- ✅ 1 bloco "caixa_de_destaque" para objetivos de aprendizagem
- ✅ 1 bloco "caixa_de_destaque" para leituras obrigatórias
- ✅ 3-5 blocos "post_it" (dicas, atenção, aplicação)
- ✅ 1 bloco "cronograma_gantt"
- ✅ 1 bloco "mapa_mental"
- ✅ 2-3 blocos "checklist" (fontes, recursos, preparação)
- ✅ 1 bloco "metricas_avaliacao"
- ✅ 1 bloco "referencias" (mínimo 5 referências formatadas)

NUNCA gerar mais de 3 elementos visuais seguidos sem um parágrafo explicativo!

## DIRETRIZES:

- NO MÁXIMO 2 Accordions (preferir momento_pedagogico)
- SEMPRE incluir cronograma_gantt
- SEMPRE incluir problema_pbl destacado
- 3-5 post_its estratégicos
- 2-3 checklists (incluindo fontes recomendadas)
- Métricas tangíveis
- Mermaid: usar \\n (não \\\\n), usar --> (não →)

RETORNE APENAS JSON, SEM TEXTO ADICIONAL.
`;

    const fase2Response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: fase2SystemPrompt },
          { 
            role: 'user', 
            content: `{JSON_ANALISE}:\n${JSON.stringify(jsonAnalise, null, 2)}\n\n{TEXTO_BASE_ENRIQUECIDO}:\n${conteudoEnriquecido}` 
          }
        ],
        temperature: 0.5,
      }),
    });

    if (!fase2Response.ok) {
      throw new Error(`Fase 2 falhou: ${fase2Response.status}`);
    }

    const fase2Data = await fase2Response.json();
    let fase2Content = fase2Data.choices[0].message.content;
    
    console.log('✅ Fase 2 concluída. Extraindo JSON...');

    let structuredContent;
    try {
      const jsonMatch = fase2Content.match(/\{[\s\S]*\}/);
      structuredContent = JSON.parse(jsonMatch ? jsonMatch[0] : fase2Content);
    } catch (e) {
      console.error('❌ Erro ao parsear JSON Fase 2:', e);
      throw new Error('Falha ao parsear conteúdo estruturado');
    }

    // VALIDAÇÕES DE SEGURANÇA
    console.log('🔒 Aplicando validações...');

    if (structuredContent.conteudo && Array.isArray(structuredContent.conteudo)) {
      structuredContent.conteudo = structuredContent.conteudo.map((bloco: any) => {
        // Sanitizar Mermaid
        if (bloco.definicao_mermaid) {
          bloco.definicao_mermaid = bloco.definicao_mermaid
            .replace(/→/g, '-->')
            .replace(/\\\\n/g, '\\n')
            .replace(/[\u2192\u21D2\u27A1]/g, '-->')
            .trim();
          
          if (!bloco.definicao_mermaid.match(/^(graph|flowchart|gantt|mindmap|pie|journey)/)) {
            console.warn('⚠️ Diagrama Mermaid inválido:', bloco.titulo);
            delete bloco.definicao_mermaid;
          }
        }

        // Garantir <br><br> em referências
        if (bloco.tipo === 'referencias' && bloco.itens) {
          bloco.itens = bloco.itens.map((ref: string) => 
            ref.endsWith('<br><br>') ? ref : ref + '<br><br>'
          );
        }

        // Limitar HTML
        if (bloco.texto && typeof bloco.texto === 'string') {
          bloco.texto = bloco.texto.replace(/<(?!\/?(?:strong|em|br|u)\b)[^>]+>/gi, '');
        }

        return bloco;
      });
    }

    // Adicionar metadata
    if (!structuredContent.metadata) {
      structuredContent.metadata = {
        disciplina: jsonAnalise.disciplina,
        grande_area: jsonAnalise.grande_area,
        duracao_estimada: "3-4 horas/aula",
        problema_central: jsonAnalise.problema_central_pbl
      };
    }

        console.log(`[Job ${jobId}] ✅ Plano de aula gerado!`);
        console.log(`[Job ${jobId}] 📊 Estatísticas:`, {
          blocos_totais: structuredContent.conteudo?.length || 0,
          momentos: structuredContent.conteudo?.filter((b: any) => b.tipo === 'momento_pedagogico').length || 0,
          checklists: structuredContent.conteudo?.filter((b: any) => b.tipo === 'checklist').length || 0,
          problemas_pbl: structuredContent.conteudo?.filter((b: any) => b.tipo === 'problema_pbl').length || 0
        });

        // Salvar resultado no banco
        if (teacherId) {
          const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
          const supabase = createClient(supabaseUrl, supabaseKey);
          
          await supabase.from('lesson_plan_jobs').update({
            status: 'completed',
            structured_content: structuredContent,
            updated_at: new Date().toISOString()
          }).eq('job_id', jobId);
          
          console.log(`[Job ${jobId}] ✅ Resultado salvo no BD`);
        }
      } catch (error) {
        console.error(`[Job ${jobId}] ❌ Erro:`, error);
        
        // Salvar erro no banco
        if (teacherId) {
          try {
            const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
            const supabase = createClient(supabaseUrl, supabaseKey);
            
            await supabase.from('lesson_plan_jobs').update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Erro desconhecido',
              updated_at: new Date().toISOString()
            }).eq('job_id', jobId);
            
            console.log(`[Job ${jobId}] ❌ Erro salvo no BD`);
          } catch (e) {
            console.error(`[Job ${jobId}] ❌ Erro ao salvar erro no BD:`, e);
          }
        }
      }
    })();

    // Usar EdgeRuntime.waitUntil se disponível, senão executar diretamente
    if (typeof (globalThis as any).EdgeRuntime !== 'undefined') {
      (globalThis as any).EdgeRuntime.waitUntil(backgroundProcessing);
    } else {
      // Fallback: executar em background sem bloquear resposta
      backgroundProcessing.catch(e => console.error('Background processing error:', e));
    }

    return immediateResponse;

  } catch (error) {
    console.error('❌ Erro crítico:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
