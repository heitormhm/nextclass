import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare EdgeRuntime for background tasks
declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Timeout helper
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeout = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
  });
  return Promise.race([promise, timeout]);
}

// Background task processor for report generation
async function generateReport(
  deepSearchSessionId: string,
  userId: string
) {
  const startTime = Date.now();
  
  // Monitor execution time periodically
  const timeMonitor = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(`⏱️ Report generation running for ${elapsed}s`);
  }, 10000) as unknown as number;
  
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Helper to update progress with throttling
  let lastProgressUpdate = 0;
  const MIN_PROGRESS_INTERVAL = 5000; // 5 seconds minimum between updates
  
  const updateProgress = async (step: string) => {
    const now = Date.now();
    if (now - lastProgressUpdate < MIN_PROGRESS_INTERVAL) {
      console.log(`[Throttled] ${step}`);
      return; // Skip update if too soon
    }
    
    lastProgressUpdate = now;
    const timestamp = new Date().toISOString();
    try {
      await supabaseAdmin
        .from('deep_search_sessions')
        .update({ progress_step: step, updated_at: timestamp })
        .eq('id', deepSearchSessionId);
      console.log(`[${timestamp}] Progress:`, step);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  try {
    // ====================================================================
    // Idempotency Check: Prevent duplicate report generation
    // ====================================================================
    console.log('=== Idempotency Check ===');
    const { data: existingSession } = await supabaseAdmin
      .from('deep_search_sessions')
      .select('result, status, updated_at')
      .eq('id', deepSearchSessionId)
      .single();

    // Skip if report already exists
    if (existingSession?.result || existingSession?.status === 'completed') {
      console.log('✓ Report already generated, exiting gracefully');
      return;
    }

    // Skip if currently processing (check last 3 minutes instead of 1)
    if (existingSession?.status === 'processing') {
      const timeSinceUpdate = Date.now() - new Date(existingSession.updated_at).getTime();
      if (timeSinceUpdate < 180000) { // 3 minutes
        console.log(`✓ Report generation in progress (${Math.floor(timeSinceUpdate/1000)}s ago), skipping`);
        return;
      }
      console.log(`⚠️ Stale processing state detected (${Math.floor(timeSinceUpdate/1000)}s old), proceeding with generation`);
    }

    // Mark as processing before starting
    await supabaseAdmin
      .from('deep_search_sessions')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString() 
      })
      .eq('id', deepSearchSessionId);

    console.log('✓ Idempotency check passed, starting report generation');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // ====================================================================
    // Load Research Data from Database
    // ====================================================================
    console.log('\n=== Phase 2: Loading research data ===');
    
    const { data: sessionData, error: loadError } = await supabaseAdmin
      .from('deep_search_sessions')
      .select('research_data, query')
      .eq('id', deepSearchSessionId)
      .single();

    if (loadError || !sessionData) {
      throw new Error(`Failed to load research data: ${loadError?.message || 'No data found'}`);
    }

    const researchResults = sessionData.research_data as Array<{
      question: string;
      sources: Array<{ url: string; snippet: string }>;
    }>;

    const query = sessionData.query;

    if (!researchResults || researchResults.length === 0) {
      throw new Error('No research data available for report generation');
    }

    console.log(`✓ Loaded ${researchResults.length} research results`);

    // ====================================================================
    // Generate Final Report with OpenAI GPT-5
    // ====================================================================
    await updateProgress("A gerar relatório final...");
    console.log('\n=== Generating final report with OpenAI GPT-5 ===');

    // Compile all research results into a structured format
    const compiledResearch = researchResults
      .map((result, idx) => {
        const sourcesFormatted = result.sources
          .map((s, i) => `[${idx * 10 + i + 1}] ${s.url}\n${s.snippet}`)
          .join('\n\n');
        
        return `--- EXTRATO ${idx + 1} ---
PERGUNTA: ${result.question}

FONTES E CONTEÚDO:
${sourcesFormatted}
`;
      })
      .join('\n\n');

    const masterPrompt = `IDIOMA OBRIGATÓRIO: Todos os outputs devem ser em PORTUGUÊS BRASILEIRO (pt-BR).

CONTEXTO:
Você é um Professor com PhD especializado em engenharia, encarregado de criar materiais educacionais de apoio de alta qualidade para a plataforma Next Class. Você recebeu um conjunto de extratos de pesquisa associados a URLs de origem. A pesquisa foi conduzida em inglês para obter melhores fontes acadêmicas, mas você deve escrever TODO o material em PORTUGUÊS BRASILEIRO. As fontes citadas podem estar em inglês - traduza e adapte os conceitos técnicos mantendo precisão e rigor absolutos.

MÉTODO PEDAGÓGICO: Problem-Based Learning (PBL)
PÚBLICO-ALVO: Estudantes de engenharia no ensino superior (graduação)

TAREFA:
Com base exclusivamente nas informações fornecidas nos extratos de pesquisa abaixo, gere um conjunto de TRÊS materiais educacionais de apoio sobre o tópico "${query}":

=== MATERIAL 1: ESTUDO DE CASO REAL (400-600 palavras) ===
Pesquise e escreva uma narrativa envolvente sobre um caso de engenharia real (sucesso notável ou falha instrutiva) diretamente relacionado ao tópico.
CONTEÚDO OBRIGATÓRIO:
- Desafio técnico enfrentado
- Restrições-chave (técnicas, financeiras, regulatórias)
- Decisões críticas tomadas
- Resultado final
- Lições aprendidas
- Dados técnicos simplificados mas realistas (eficiências, pressões, propriedades de materiais)
PROTOCOLO DE FACT-CHECKING: Todos os dados numéricos, normas técnicas ou fatos históricos devem ser verificáveis nos extratos fornecidos ou em fontes primárias confiáveis.

=== MATERIAL 2: NOTA TÉCNICA "JUST-IN-TIME" (1-2 páginas) ===
Identifique o conceito teórico mais crítico relacionado ao tópico e crie uma nota técnica concisa.
CONTEÚDO OBRIGATÓRIO:
- Explicação clara do conceito
- Equações fundamentais com variáveis definidas
- Exemplo numérico resolvido passo-a-passo aplicável ao tópico
- Seção "Pontos de Atenção" destacando suposições comuns ou erros frequentes
RESTRIÇÃO: Todas as equações devem corresponder exatamente às de manuais de engenharia padrão. Não invente fórmulas.

=== MATERIAL 3: LISTA DE RECURSOS BIBLIOGRÁFICOS PRIORITÁRIOS (3-5 recursos) ===
Identifique 3 a 5 recursos essenciais de alta credibilidade (capítulos de livros, artigos técnicos, normas) que os alunos podem usar para pesquisa autônoma.
FORMATO: Tabela com 3 colunas:
| Recurso (com link se disponível) | Tipo de Conteúdo | Relevância para o Problema |
A coluna "Relevância" deve explicar COMO o recurso ajuda a entender ou aplicar o tópico.

PROTOCOLO DE FACT-CHECKING (CRÍTICO):
1. Verificação Cruzada: Todos os dados numéricos, normas técnicas ou fatos históricos no Estudo de Caso devem ser verificáveis em pelo menos duas fontes primárias de referência (Engineering Village, Scopus, Knovel, ASTM/IEEE).
2. Sem Inferência Factual: NÃO invente dados técnicos. Se um valor específico não for encontrado, use uma faixa plausível e declare ser estimativa (ex: "Eficiências nesta faixa são típicas...").
3. Citação Direta para Fórmulas: Todas as equações na Nota Técnica devem corresponder exatamente às de manuais de engenharia ou livros-texto padrão.

PRIORIDADE DE FONTES:
- Primárias: Bases de dados de engenharia (Compendex, Scopus), manuais técnicos (Knovel), organizações de normas (ASTM, IEEE, ABNT)
- Secundárias: Bibliotecas específicas de disciplinas (ASCE, ASME), Google Scholar
- Exclusão: Evite citar blogs genéricos ou artigos de notícias não técnicas

RESTRIÇÕES:
- **Nível do Público:** Estudantes de engenharia de nível superior. Adapte a profundidade técnica para ser desafiadora e educativa, mas evite jargões excessivamente especializados sem explicação. O objetivo é clareza e aplicação prática do conhecimento.

- **Estrutura:**
  1. **Introdução:** Apresente o tópico e a sua relevância na engenharia.
  2. **Desenvolvimento:** Organize os conceitos em secções lógicas com subtítulos. Use ## para secções principais e ### para subsecções.
  3. **Aplicações Práticas:** Explore aplicações do tópico na engenharia com exemplos concretos.
  4. **Conclusão:** Sintetize os pontos principais.
  5. **Referências Bibliográficas:** No final do documento, crie uma secção com este título e liste todas as fontes numeradas.

- **Regras de Citação (Obrigatórias):**
  - Para cada informação utilizada, insira um número de referência entre parêntesis retos (ex: [1], [2]).
  - Pode usar múltiplas referências no mesmo parágrafo (ex: [1][2]).
  - Na secção "Referências Bibliográficas", liste cada fonte com o seu número e URL completo. Formato: [1] https://exemplo.com/artigo

- **Restrição Crítica:**
  - NÃO INVENTE INFORMAÇÕES OU REFERÊNCIAS. A sua principal diretriz é a fidelidade absoluta às fontes fornecidas. Se a informação for insuficiente, declare isso explicitamente.

- **Formatação:**
  - Use markdown para estruturar o documento.
  - Use # para o título principal, ## para secções, e ### para subsecções.
  - Mantenha um tom formal e académico.

---

MATERIAL DE PESQUISA FORNECIDO:

${compiledResearch}

---

Agora, escreva o relatório final em Português, seguindo todas as diretrizes acima.`;

    // Start periodic progress updates during report generation
    let progressInterval: number | undefined;
    const startProgressUpdates = () => {
      let dots = 0;
      progressInterval = setInterval(async () => {
        dots = (dots + 1) % 4;
        const dotsStr = '.'.repeat(dots);
        await updateProgress(`A gerar relatório final${dotsStr}`);
      }, 5000) as unknown as number; // Update every 5 seconds with animated dots
    };
    
    startProgressUpdates();
    
    // Add retry logic for report generation
    let reportResponse: Response | undefined;
    let retryCount = 0;
    const MAX_RETRIES = 2;
    
    while (retryCount <= MAX_RETRIES) {
      try {
        reportResponse = await withTimeout(
          fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-5',
              messages: [
                {
                  role: 'user',
                  content: masterPrompt
                }
              ],
              max_completion_tokens: 8000,
            }),
          }),
          180000 // 3 minute timeout
        );
        break; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        if (progressInterval) clearInterval(progressInterval);
        
        if (retryCount > MAX_RETRIES) {
          console.error(`✗ Report generation failed after ${MAX_RETRIES} retries`);
          throw new Error('Falha ao gerar relatório após múltiplas tentativas.');
        }
        
        console.log(`⚠️ Retry ${retryCount}/${MAX_RETRIES} for report generation...`);
        await updateProgress(`A gerar relatório final... (tentativa ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay between retries
        startProgressUpdates();
      }
    }
    
    if (progressInterval) clearInterval(progressInterval);
    await updateProgress("A gerar relatório final...");
    
    // Safety check to ensure reportResponse is defined
    if (!reportResponse) {
      throw new Error('Failed to get response from OpenAI API');
    }

    if (!reportResponse.ok) {
      const errorText = await reportResponse.text();
      console.error('Report generation failed:', errorText);
      throw new Error('Failed to generate report');
    }

    const reportData = await reportResponse.json();
    const finalReport = reportData.choices?.[0]?.message?.content;

    if (!finalReport) {
      throw new Error('No report generated');
    }

    console.log('✓ Report generated successfully, length:', finalReport.length);

    // Update session with completed status
    await updateProgress("Concluído");
    console.log('Updating session with completed status...');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { error: updateError } = await supabaseAdmin
      .from('deep_search_sessions')
      .update({
        status: 'completed',
        result: finalReport,
        progress_step: 'Concluído',
        updated_at: new Date().toISOString()
      })
      .eq('id', deepSearchSessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      throw new Error(`Failed to save report: ${updateError.message}`);
    }

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(`✓ Phase 2 completed successfully in ${elapsed}s`);
    console.log('✓ Deep research completed successfully');

  } catch (error) {
    console.error('✗ Error in Phase 2:', error);
    
    // Clear time monitor
    if (timeMonitor) clearInterval(timeMonitor);
    
    // Update session with error
    try {
      await supabaseAdmin
        .from('deep_search_sessions')
        .update({
          status: 'error',
          progress_step: 'Erro ao gerar relatório. Por favor tente novamente.',
          updated_at: new Date().toISOString()
        })
        .eq('id', deepSearchSessionId);
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }
  } finally {
    // Ensure time monitor is cleared
    if (timeMonitor) clearInterval(timeMonitor);
  }
}

// HTTP Server
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { deepSearchSessionId } = await req.json();
    console.log('Report generation request for session:', deepSearchSessionId);

    if (!deepSearchSessionId) {
      throw new Error('Missing deepSearchSessionId');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Start background task (fire and forget)
    console.log('✓ Background task registered with EdgeRuntime.waitUntil()');
    EdgeRuntime.waitUntil(
      generateReport(deepSearchSessionId, user.id)
        .then(() => console.log('✓ Background task completed successfully'))
        .catch((error) => {
          console.error('✗ Background task failed:', error);
        })
    );

    // Return immediately - processing will continue in background
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Geração de relatório iniciada.',
        sessionId: deepSearchSessionId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in report generation:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
