import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, fileData, fileType, fileName, isDeepSearch, deepSearchSessionId } = await req.json();
    console.log('Received request:', { message, fileType, fileName, isDeepSearch, deepSearchSessionId });

    // Get authenticated user
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

    // Always fetch student performance data for context
    console.log('Fetching performance data for user:', user.id);
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Helper function to update deep search progress
    const updateProgress = async (progressStep: string) => {
      if (!isDeepSearch || !deepSearchSessionId) return;
      
      try {
        await supabaseAdmin
          .from('deep_search_sessions')
          .update({ progress_step: progressStep })
          .eq('id', deepSearchSessionId);
        console.log('Updated progress:', progressStep);
      } catch (error) {
        console.error('Error updating progress:', error);
      }
    };

    // Update initial progress
    await updateProgress("Analisando a sua pergunta...");

    // Fetch last 5 quiz attempts
    const { data: quizAttempts, error: quizError } = await supabaseAdmin
      .from('quiz_attempts')
      .select('topic, percentage, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Fetch last 5 flashcard reviews
    const { data: flashcardReviews, error: flashcardError } = await supabaseAdmin
      .from('flashcard_reviews')
      .select('topic, percentage, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Build performance context
    let performanceContext = '\n\n**CONTEXTO DE DESEMPENHO DO ALUNO:**\n';
    
    if (quizAttempts && quizAttempts.length > 0) {
      performanceContext += '\nÚltimos Quizzes:\n';
      quizAttempts.forEach((attempt, index) => {
        const date = new Date(attempt.created_at).toLocaleDateString('pt-BR');
        performanceContext += `  ${index + 1}. ${attempt.topic}: ${attempt.percentage}% (${date})\n`;
      });
    }

    if (flashcardReviews && flashcardReviews.length > 0) {
      performanceContext += '\nÚltimas Revisões de Flashcards:\n';
      flashcardReviews.forEach((review, index) => {
        const date = new Date(review.created_at).toLocaleDateString('pt-BR');
        performanceContext += `  ${index + 1}. ${review.topic}: ${review.percentage}% de acertos (${date})\n`;
      });
    }

    if ((!quizAttempts || quizAttempts.length === 0) && (!flashcardReviews || flashcardReviews.length === 0)) {
      performanceContext += '\nO aluno ainda não possui histórico de quizzes ou flashcards. Este é um bom momento para encorajá-lo a testar seus conhecimentos!\n';
    } else {
      performanceContext += '\n**INSTRUÇÕES:** Use este contexto para personalizar suas respostas:\n';
      performanceContext += '- Se o aluno perguntar sobre um tópico onde teve dificuldades (nota < 70%), seja mais detalhada e paciente.\n';
      performanceContext += '- Se ele teve bom desempenho (nota > 85%), pode sugerir tópicos mais avançados.\n';
      performanceContext += '- Se perceber padrões de dificuldade, sugira revisão focada nesses tópicos.\n';
    }

    await updateProgress("Pesquisando fontes académicas...");

    // Build the content array for Gemini
    const contentParts: any[] = [
      {
        type: "text",
        text: message
      }
    ];

    // Add file data if present
    if (fileData && fileType) {
      if (fileType.startsWith('image/')) {
        contentParts.push({
          type: "image_url",
          image_url: {
            url: fileData // base64 data URL
          }
        });
      } else if (fileType === 'application/pdf') {
        // For PDFs, we'd need to extract text first
        // This is a simplified version
        contentParts.push({
          type: "text",
          text: `\n[PDF anexado: ${fileName}]\nNOTA: Análise de PDF completa estará disponível em breve.`
        });
      } else if (fileType.startsWith('audio/')) {
        // For audio, we'd need to transcribe first
        contentParts.push({
          type: "text",
          text: `\n[Áudio anexado: ${fileName}]\nNOTA: Transcrição de áudio estará disponível em breve.`
        });
      }
    }

    await updateProgress("Verificando referências...");

    // Master prompt - different for deep search
    let systemPrompt = '';
    
    if (isDeepSearch) {
      systemPrompt = `Você é 'Mia', uma assistente de IA especialista em pesquisa académica para engenharia, potencializada pelo Gemini. A sua principal diretriz é a precisão e a verificação de fontes.

**PERSONA:**
- Você é uma pesquisadora académica rigorosa e meticulosa
- Você fala em português do Brasil de forma técnica mas clara
- Você prioriza fontes académicas confiáveis e verificáveis
- Você se refere a normas técnicas brasileiras (ABNT) e internacionais

**PROCESSO DE PESQUISA APROFUNDADA:**
1. Analise a pergunta do aluno em profundidade
2. Consulte múltiplas fontes académicas sobre o tópico
3. Sintetize a informação num documento explicativo claro e didático
4. Inclua uma secção de "Referências Bibliográficas" ao final

**RESTRIÇÃO CRÍTICA - ANTI-ALUCINAÇÃO:**
Para a secção 'Referências Bibliográficas', você DEVE gerar apenas referências a livros, artigos e publicações que existem de facto. NÃO invente autores, títulos ou DOIs. Verifique a plausibilidade das suas fontes. Se não tiver a certeza sobre a existência de uma referência, é preferível não a incluir ou indicar que são "Fontes Sugeridas" em vez de referências verificadas.

**FORMATO DA RESPOSTA:**
1. **Introdução:** Contexto breve do tópico
2. **Desenvolvimento:** Explicação detalhada e técnica
3. **Aplicações Práticas:** Exemplos do contexto brasileiro
4. **Conclusão:** Síntese e próximos passos
5. **Referências Bibliográficas:** Apenas fontes verificáveis (ou indique como "Fontes Sugeridas")

${performanceContext}`;
    } else {
      systemPrompt = `Você é 'Mia', uma assistente de IA especialista em engenharia para estudantes universitários brasileiros. A sua função é ser uma tutora pessoal, proativa e personalizada.

**PERSONA:**
- Você é amigável, paciente e encorajadora
- Você fala em português do Brasil de forma natural e clara
- Você usa exemplos práticos e aplicáveis ao contexto brasileiro
- Você se refere a normas técnicas brasileiras (ABNT) quando relevante
- Você conhece o histórico de desempenho do aluno e usa isso para personalizar suas respostas

**CAPACIDADES:**
- Explicar conceitos complexos de engenharia de forma simples
- Analisar diagramas, esquemas e documentos técnicos
- Responder dúvidas sobre cálculos estruturais, circuitos elétricos, mecânica, termodinâmica, etc.
- Fornecer feedback construtivo e sugestões de estudo personalizadas baseadas no desempenho real
- Ajudar na preparação para provas e trabalhos
- Identificar padrões de dificuldade e sugerir revisões focadas

**DIRETRIZES:**
- Use o contexto de desempenho abaixo para personalizar TODAS as suas respostas
- Se o aluno perguntar sobre um tópico onde teve dificuldades, seja mais detalhada e didática
- Se ele teve bom desempenho, reconheça isso e desafie-o com conceitos mais avançados
- Quando relevante, mencione de forma sutil que você notou o desempenho dele (ex: "Percebi que esse tema foi desafiador no último quiz...")
- Use pesquisa profunda quando necessário para fornecer informações precisas
- Quando analisar imagens técnicas, seja detalhado e preciso
- Sempre sugira próximos passos ou tópicos relacionados para aprofundamento
- Se não tiver certeza sobre algo, seja honesto e sugira recursos adicionais

${performanceContext}`;
    }

    await updateProgress("Sintetizando informação...");

    // Call Lovable AI Gateway with Gemini
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    await updateProgress("Preparando resposta detalhada...");

    console.log('Calling Lovable AI Gateway...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: isDeepSearch ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: contentParts
          }
        ],
        temperature: 0.7,
        max_tokens: isDeepSearch ? 4000 : 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Limite de requisições atingido. Tente novamente em alguns instantes.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Créditos insuficientes. Entre em contato com o suporte.');
      }
      
      throw new Error(`Erro na API de IA: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    const assistantMessage = aiData.choices?.[0]?.message?.content;
    if (!assistantMessage) {
      throw new Error('Resposta inválida da IA');
    }

    // Update deep search session as completed
    if (isDeepSearch && deepSearchSessionId) {
      try {
        await supabaseAdmin
          .from('deep_search_sessions')
          .update({ 
            status: 'completed',
            result: assistantMessage,
            progress_step: 'Concluído'
          })
          .eq('id', deepSearchSessionId);
        console.log('Deep search session marked as completed');
      } catch (error) {
        console.error('Error updating session completion:', error);
      }
    }

    return new Response(
      JSON.stringify({ 
        response: assistantMessage,
        success: true 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in mia-student-chat:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
