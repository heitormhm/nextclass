import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function performDeepSearch(topic: string): Promise<string> {
  const searchQuery = `${topic} engenharia educação método socrático bibliografia`;
  
  try {
    const searchResponse = await fetch(`https://www.googleapis.com/customsearch/v1?key=AIzaSyBqXt6F8z0-demo&cx=017576662512468239146:omuauf_lfve&q=${encodeURIComponent(searchQuery)}`);
    
    if (!searchResponse.ok) {
      console.log('Search API not available, proceeding without deep search');
      return '';
    }
    
    const searchData = await searchResponse.json();
    const results = searchData.items?.slice(0, 5).map((item: any) => 
      `Título: ${item.title}\nResumo: ${item.snippet}\nFonte: ${item.link}`
    ).join('\n\n') || '';
    
    return results;
  } catch (error) {
    console.log('Deep search failed, proceeding without it:', error);
    return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let lessonPlanId: string | undefined;

  try {
    const body = await req.json();
    lessonPlanId = body.lessonPlanId;
    const { topic, duration, notes, existingPlan, adjustmentInstruction } = body;

    console.log('Planning lesson with Mia:', { topic, duration, hasExistingPlan: !!existingPlan });

    if (!lovableApiKey) {
      throw new Error('Lovable API key not configured');
    }

    // Helper function to update progress
    const updateProgress = async (step: string) => {
      if (!lessonPlanId) return;
      
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.58.0');
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase
        .from('lesson_plans')
        .update({ progress_step: step })
        .eq('id', lessonPlanId);
      
      console.log('Progress updated:', step);
    };

    let systemPrompt = `IDIOMA OBRIGATÓRIO: Todos os campos do JSON devem estar em PORTUGUÊS BRASILEIRO (pt-BR).

Você é 'Mia', uma Designer Instrucional Sênior especializada em metodologias de aprendizagem ativa e PBL (Problem-Based Learning) para STEM no ensino superior. Você é uma planejadora estratégica que antecipa desafios dos alunos.

MÉTODO PEDAGÓGICO: Problem-Based Learning (PBL)
PLATAFORMA: Next Class
OBJETIVO: Estruturar uma unidade de ensino completa e acionável para engenharia, seguindo rigorosamente o framework PBL de 5 etapas.

O plano de aula deve ser um guia prático para o instrutor facilitar a aprendizagem dos alunos na plataforma Next Class.

=== ETAPA 1: ARTICULAR OBJETIVOS DE APRENDIZAGEM ===
Liste 3-5 objetivos de aprendizagem claros, específicos e mensuráveis para esta unidade.
- Use verbos da taxonomia de Bloom (Analisar, Avaliar, Criar, Sintetizar, Aplicar)
- Exemplo: "Analisar forças axiais em cada membro de uma treliça complexa usando o Método dos Nós"
- Objetivos devem ser específicos da engenharia e mensuráveis

=== ETAPA 2: DESENVOLVER PROBLEMA REAL E AUTÊNTICO ===
Crie uma narrativa detalhada para um problema de engenharia autêntico e mal estruturado que requer aplicação dos conceitos da unidade.
- Apresente como um memorando de projeto ou briefing de cliente
- Inclua: Título do Projeto, Cliente/Stakeholder, Descrição Clara do Desafio
- Pelo menos 3 Restrições/Requisitos (orçamento, materiais, normas técnicas)
- Entregável Final (ex: "Um relatório técnico com cálculos, diagramas e recomendação de design justificada")

=== ETAPA 3: ESTRUTURAR APRESENTAÇÃO INCREMENTAL DO PROBLEMA ===
Descreva como o problema será revelado em fases na plataforma Next Class para guiar a descoberta:
- Fase 1 ("O Gancho" - Aula 1): Informação inicial aberta que provoca perguntas. Liste 3 perguntas-chave que espera dos alunos.
- Fase 2 (Informação Adicional - Aula 2): Novos dados ou restrições introduzidos (ex: "Relatório geotécnico do solo", "Mudança de orçamento do cliente"). Explique como isso força reavaliação da abordagem inicial.

=== ETAPA 4: DELINEAR SEQUÊNCIA DE ATIVIDADES ===
Crie uma linha do tempo detalhada para a unidade, especificando atividades para cada aula e como se integram com as ferramentas da Next Class:
- Aula 1: (ex: 15 min - Apresentar Problema Fase 1 via Anúncio; 30 min - Brainstorming em Grupos; 20 min - Discussão Plenária no Fórum; 25 min - Mini-aula "just-in-time" postada como vídeo)
- Aulas 2 & 3: Detalhar atividades similarmente, mencionando ferramentas da plataforma para colaboração e submissão

=== ETAPA 5: IDENTIFICAR RECURSOS-CHAVE E SUPORTE DO FACILITADOR ===
1. Recursos Iniciais: Liste 2-3 recursos de alta qualidade (capítulo de livro específico, link para norma ASTM, vídeo tutorial de software) para serem incorporados no módulo inicial da Next Class
2. Guia do Facilitador: Crie seção com 3 "Perguntas Provocativas" que o instrutor pode postar em fóruns ou fazer durante sessões ao vivo para aprofundar pensamento crítico sem entregar a solução

PROTOCOLO DE FACT-CHECKING:
- Verificação cruzada: Todos os dados numéricos, normas técnicas ou fatos históricos devem ser verificáveis em pelo menos duas fontes primárias
- Sem inferência factual: Não invente dados técnicos. Se um valor específico não for encontrado, use faixa plausível e declare ser estimativa
- Citação direta para fórmulas: Todas as equações devem corresponder exatamente às de manuais ou livros de engenharia padrão

PRIORIDADE DE FONTES:
- Primárias: Bases de dados de engenharia (Compendex, Scopus), manuais técnicos (Knovel), organizações de normas (ASTM, IEEE, ABNT)
- Secundárias: Bibliotecas específicas de disciplinas (ASCE, ASME), Google Scholar
- Exclusão: Evite citar blogs genéricos ou artigos de notícias não técnicas

FORMATO DE SAÍDA (JSON OBRIGATÓRIO):
{
  "titulo": "Nome claro e conciso da unidade de ensino",
  "objetivosAprendizagem": [
    "Objetivo 1 usando verbos de Bloom",
    "Objetivo 2",
    "Objetivo 3"
  ],
  "problemaAutentico": {
    "tituloProblema": "Título do projeto/problema",
    "cliente": "Nome do cliente/stakeholder",
    "descricaoDesafio": "Descrição clara do desafio técnico",
    "restricoes": [
      "Restrição 1 (orçamento, materiais, normas)",
      "Restrição 2",
      "Restrição 3"
    ],
    "entregavelFinal": "Descrição do que os alunos devem entregar"
  },
  "apresentacaoIncremental": {
    "fase1": {
      "informacaoInicial": "Informação aberta para provocar perguntas",
      "perguntasEsperadas": [
        "Pergunta 1 que alunos devem fazer",
        "Pergunta 2",
        "Pergunta 3"
      ]
    },
    "fase2": {
      "novasInformacoes": "Novos dados ou restrições introduzidos",
      "impactoNaAbordagem": "Como isso força reavaliação"
    }
  },
  "sequenciaAtividades": {
    "aula1": "Descrição detalhada com tempos e ferramentas Next Class",
    "aula2": "Descrição detalhada",
    "aula3": "Descrição detalhada (se aplicável)"
  },
  "recursosChave": [
    {
      "tipo": "Capítulo de livro / Norma técnica / Tutorial",
      "descricao": "Descrição do recurso",
      "relevanciaProblema": "Como este recurso ajuda a resolver o problema"
    }
  ],
  "perguntasProvocativas": [
    "Pergunta provocativa 1 para aprofundar pensamento crítico",
    "Pergunta provocativa 2",
    "Pergunta provocativa 3"
  ],
  "referenciasBibliograficas": [
    {
      "autor": "Nome do autor",
      "titulo": "Título da obra",
      "ano": "Ano de publicação",
      "tipo": "Artigo/Livro/Norma"
    }
  ]
}

RESTRIÇÕES CRÍTICAS:
- Realismo do problema: O cenário deve ser baseado em desafios de engenharia plausíveis, com restrições realistas
- Verificação de recursos: Todos os links ou referências a recursos externos devem ser válidos e credíveis
- Coesão pedagógica: Atividades da Etapa 4 devem estar logicamente alinhadas com objetivos da Etapa 1 e estrutura do problema da Etapa 3
- Precisão de fontes: Para "referenciasBibliograficas", liste APENAS fontes reais e verificáveis. NÃO invente referências.`;

    let userPrompt = '';
    let searchContext = '';

    if (existingPlan && adjustmentInstruction) {
      // Refinamento de plano existente
      userPrompt = `Com base no plano de aula existente abaixo, refine-o de acordo com a seguinte instrução: "${adjustmentInstruction}".

PLANO EXISTENTE:
${existingPlan}

Por favor, gere o plano de aula atualizado seguindo a mesma estrutura JSON especificada no prompt do sistema.`;
    } else {
      // Criação de novo plano - realizar pesquisa profunda
      await updateProgress('A iniciar a pesquisa sobre o tópico...');
      console.log('Performing deep search for topic:', topic);
      searchContext = await performDeepSearch(topic);
      await updateProgress('A consultar fontes académicas de engenharia...');
      
      await updateProgress('A analisar os conceitos-chave e as suas aplicações práticas...');
      
      userPrompt = `Com base no tópico e informações abaixo, siga rigorosamente o processo de três fases para criar um plano de aula de excelência:

TÓPICO: ${topic}
DURAÇÃO: ${duration} minutos
${notes ? `NOTAS ADICIONAIS: ${notes}` : ''}

${searchContext ? `RESULTADOS DA PESQUISA APROFUNDADA:\n${searchContext}\n\n` : ''}

Gere um plano de aula completo seguindo EXATAMENTE a estrutura JSON especificada no prompt do sistema. Lembre-se:
- A resposta deve ser APENAS JSON válido
- Inclua 3-5 objetivos de aprendizagem
- Inclua pelo menos 3 conceitos-chave, cada um com "conceito" e "definicao" como campos separados
- Crie 5-8 perguntas socráticas com respostas esperadas
- Liste APENAS referências bibliográficas reais e verificáveis`;
    }

    await updateProgress('A estruturar o roteiro didático com o método socrático...');

    console.log('Calling Lovable AI with Gemini 2.5 Pro...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 8000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('CRITICAL ERROR - Lovable AI (Gemini) API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        lessonPlanId,
        topic,
        duration
      });
      
      // Update lesson plan status to failed
      if (lessonPlanId) {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.58.0');
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        let errorMsg = "Erro: Não foi possível contactar a IA. Tente novamente.";
        
        if (response.status === 429) {
          errorMsg = "Erro: A IA está ocupada. Por favor, tente novamente em alguns momentos.";
        } else if (response.status === 402) {
          errorMsg = "Erro: Créditos da IA esgotados. Contacte o administrador.";
        } else if (response.status === 504 || response.status === 524) {
          errorMsg = "Erro: A pesquisa excedeu o tempo limite. Tente um tópico mais específico.";
        }
        
        await supabase
          .from('lesson_plans')
          .update({ 
            status: 'failed',
            progress_step: errorMsg
          })
          .eq('id', lessonPlanId);
      }
      
      return new Response(
        JSON.stringify({ 
          error: response.status === 429 
            ? "A IA está ocupada. Por favor, tente novamente em alguns momentos." 
            : response.status === 402
            ? "Créditos da IA esgotados. Contacte o administrador."
            : response.status === 504 || response.status === 524
            ? "A pesquisa excedeu o tempo limite. Tente um tópico mais específico."
            : "Não foi possível contactar a IA. Tente novamente." 
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid response from Gemini:', data);
      throw new Error('Resposta inválida da IA');
    }
    
    await updateProgress('A verificar as referências bibliográficas...');
    
    let aiResponse = data.choices[0].message.content;
    console.log('Raw AI response:', aiResponse.substring(0, 500));
    
    // Parse JSON response and convert to HTML
    let lessonPlan: string;
    try {
      // Remove markdown code blocks if present
      aiResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const jsonPlan = JSON.parse(aiResponse);
      console.log('Successfully parsed JSON response');
      
      // Convert JSON to HTML format for display
      lessonPlan = `
<strong>PLANO DE AULA: ${jsonPlan.titulo}</strong>

<p><strong>1. OBJETIVOS DE APRENDIZAGEM</strong></p>
<ul>
${jsonPlan.objetivosAprendizagem.map((obj: string) => `<li>${obj}</li>`).join('\n')}
</ul>

<p><strong>2. CONCEITOS-CHAVE</strong></p>
<ul>
${jsonPlan.conceitosChave.map((item: any) => `<li><strong>${item.conceito}:</strong> ${item.definicao}</li>`).join('\n')}
</ul>

<p><strong>3. ROTEIRO DIDÁTICO (MÉTODO SOCRÁTICO)</strong></p>

<p><strong>3.1 Contextualização</strong></p>
<p>${jsonPlan.roteiroDidatico.contextualizacao}</p>

<p><strong>3.2 Problematização Central</strong></p>
<p>${jsonPlan.roteiroDidatico.problematizacaoCentral}</p>

<p><strong>3.3 Desenvolvimento Socrático</strong></p>
${jsonPlan.roteiroDidatico.desenvolvimentoSocratico.map((item: any, idx: number) => `
<p><strong>Pergunta ${idx + 1}:</strong> ${item.pergunta}<br>
<em>Caminho de raciocínio esperado:</em> ${item.respostaEsperada}</p>
`).join('\n')}

<p><strong>3.4 Síntese e Conclusão</strong></p>
<p>${jsonPlan.roteiroDidatico.sinteseConclusao}</p>

<p><strong>4. REFERÊNCIAS BIBLIOGRÁFICAS VERIFICADAS</strong></p>
<ul>
${jsonPlan.referenciasBibliograficas.map((ref: any) => 
  `<li>${ref.autor}. <em>${ref.titulo}</em>. ${ref.ano}. ${ref.tipo || ''}</li>`
).join('\n')}
</ul>
      `.trim();
      
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('AI response that failed to parse:', aiResponse);
      
      // Fallback: use the raw response if it's not JSON
      // This handles cases where the AI didn't follow instructions
      lessonPlan = aiResponse;
    }

    await updateProgress('A finalizar a formatação do seu plano de aula...');
    
    console.log('Lesson plan generated successfully');

    // Update lesson plan in database if lessonPlanId is provided
    if (lessonPlanId) {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.58.0');
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: updateError } = await supabase
        .from('lesson_plans')
        .update({
          content: lessonPlan,
          status: 'completed',
          progress_step: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', lessonPlanId);

      if (updateError) {
        console.error('Error updating lesson plan:', updateError);
      } else {
        console.log('Lesson plan updated in database');
      }
    }

    return new Response(
      JSON.stringify({ lessonPlan }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('CRITICAL ERROR in plan-lesson-with-mia function:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      lessonPlanId,
      errorType: error?.constructor?.name,
      errorDetails: JSON.stringify(error, null, 2)
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Update lesson plan status to failed if we have an ID
    if (lessonPlanId) {
      try {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.58.0');
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        let userFriendlyError = 'Ocorreu um erro inesperado. Tente novamente.';
        
        if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
          userFriendlyError = 'A pesquisa excedeu o tempo limite. Tente um tópico mais específico.';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          userFriendlyError = 'Erro de conexão com a IA. Verifique a sua ligação e tente novamente.';
        } else if (errorMessage.includes('parse') || errorMessage.includes('JSON')) {
          userFriendlyError = 'A IA gerou uma resposta inválida. Tente novamente.';
        }
        
        await supabase
          .from('lesson_plans')
          .update({ 
            status: 'failed',
            progress_step: `Erro: ${userFriendlyError}`
          })
          .eq('id', lessonPlanId);
      } catch (updateError) {
        console.error('Failed to update lesson plan status:', updateError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage === 'Lovable API key not configured'
          ? 'Serviço de IA não configurado. Contacte o administrador.'
          : 'Ocorreu um erro ao gerar o plano de aula. Tente novamente.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
