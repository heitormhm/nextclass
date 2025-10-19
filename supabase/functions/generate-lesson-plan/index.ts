import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // FASE 1: Análise Pedagógica
    console.log('🔍 Fase 1: Análise Pedagógica e Extração de Conceitos...');
    
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
- grafico (barras, pizza, linha) → **FORMATO OBRIGATÓRIO DOS DADOS**:
  {
    "tipo": "grafico",
    "titulo": "string",
    "descricao": "string",
    "tipo_grafico": "barras" | "pizza" | "linha",
    "dados": [
      { "categoria": "string", "valor": number },
      { "categoria": "string", "valor": number }
    ]
  }
  ⚠️ **ATENÇÃO CRÍTICA**: Campo 'dados' OBRIGATORIAMENTE deve ter:
  - **"categoria"** (string): Nome da categoria/eixo X
  - **"valor"** (number): Valor numérico
  ❌ **NÃO USE**: "x", "y", "nome", "quantidade", "porcentagem", "label"
  ✅ **USE SEMPRE**: "categoria" e "valor"
- referencias

### BLOCOS PROIBIDOS (NÃO USAR):
- **ul, ol** → Converter em "checklist"
- **accordion** → Usar "momento_pedagogico" com passos

## ESTRUTURA PEDAGÓGICA OBRIGATÓRIA:

[COMPONENTE: PlanoDeAulaHeader]
- h2: "Plano de Aula: {titulo}"
- paragrafo: Contextualização
- caixa_de_destaque: Objetivos (Taxonomia de Bloom)

[COMPONENTE: VisualizacaoEstrategicaAula]
- cronograma_gantt: Linha do tempo

[COMPONENTE: ConteudoDetalhado]
- momento_pedagogico 1: Abertura (15 min)
- momento_pedagogico 2: Demonstração (30 min)
- momento_pedagogico 3: Desafio PBL (15 min) → com problema_pbl
- momento_pedagogico 4: Trabalho em Grupo (60 min)
- momento_pedagogico 5: Apresentações (30 min)
- momento_pedagogico 6: Síntese (15 min)

[COMPONENTE: MapaMentalConceitos]
- mapa_mental: Conceitos-chave

[COMPONENTE: AvaliacaoERecursos]
- metricas_avaliacao: Rubrica
- checklist: Recursos necessários
- referencias: Fontes

## DIRETRIZES:

- NO MÁXIMO 2 Accordions (preferir momento_pedagogico)
- SEMPRE incluir cronograma_gantt
- SEMPRE incluir problema_pbl destacado
- 3-5 post_its estratégicos
- 1-2 checklists
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

    // 🔒 Chamar Agente de Validação
    console.log('🔒 Enviando para agente de validação...');
    
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: validationData, error: validationError } = await supabase.functions.invoke(
        'validate-formatted-content',
        { body: { structuredContent } }
      );

      if (!validationError && validationData?.validatedContent) {
        structuredContent = validationData.validatedContent;
        console.log('✅ Conteúdo validado e corrigido pelo agente');
      } else {
        console.warn('⚠️ Agente de validação falhou, usando validações básicas', validationError);
        
        // Fallback: validações básicas
        if (structuredContent.conteudo && Array.isArray(structuredContent.conteudo)) {
          structuredContent.conteudo = structuredContent.conteudo.map((bloco: any) => {
            // Sanitizar Mermaid
            if (bloco.definicao_mermaid) {
              bloco.definicao_mermaid = bloco.definicao_mermaid
                .replace(/→/g, '-->')
                .replace(/\\\\n/g, '\\n')
                .replace(/[\u2192\u21D2\u27A1]/g, '-->')
                .trim();
            }
            return bloco;
          });
        }
      }
    } catch (validationError) {
      console.warn('⚠️ Erro ao chamar agente de validação:', validationError);
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

    console.log('✅ Plano de aula gerado!');
    console.log('📊 Estatísticas:', {
      blocos_totais: structuredContent.conteudo?.length || 0,
      momentos: structuredContent.conteudo?.filter((b: any) => b.tipo === 'momento_pedagogico').length || 0,
      checklists: structuredContent.conteudo?.filter((b: any) => b.tipo === 'checklist').length || 0,
      problemas_pbl: structuredContent.conteudo?.filter((b: any) => b.tipo === 'problema_pbl').length || 0
    });

    return new Response(JSON.stringify({ structuredContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
