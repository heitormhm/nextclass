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
    const { message, fileData, fileType, fileName, isDeepSearch, conversationId, action, context } = await req.json();
    console.log('Received request:', { message, fileType, fileName, isDeepSearch, conversationId, action });

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

    // Handle Interactive Actions (GENERATE_SUGGESTIONS, GENERATE_QUIZ, GENERATE_FLASHCARDS)
    if (action && ['GENERATE_SUGGESTIONS', 'GENERATE_QUIZ', 'GENERATE_FLASHCARDS'].includes(action)) {
      console.log(`🎯 Interactive action requested: ${action}`);
      
      // ✅ Buscar última mensagem do usuário para topic
      const { data: lastUserMessage } = await supabaseAdmin
        .from('messages')
        .select('content')
        .eq('conversation_id', conversationId)
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      const userTopic = lastUserMessage?.content?.substring(0, 100) || 'Tópico de Engenharia';
      console.log('📝 Extracted topic from user:', userTopic);
      
      // ✅ Buscar penúltima mensagem da assistente (ignorar confirmações)
      const { data: assistantMessages } = await supabaseAdmin
        .from('messages')
        .select('content')
        .eq('conversation_id', conversationId)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Filtrar mensagens de confirmação de quiz/flashcard
      const educationalContent = assistantMessages?.find(msg => 
        !msg.content.includes('Quiz criado com sucesso') &&
        !msg.content.includes('Flashcards criados com sucesso') &&
        msg.content.length > 200
      );
      
      const contextContent = educationalContent?.content || 'Conteúdo educacional não encontrado';
      console.log('📚 Context length:', contextContent.length);
      console.log('📄 Context preview:', contextContent.substring(0, 150));
      
      // Create main job
      const { data: newJob, error: jobError } = await supabaseAdmin
        .from('jobs')
        .insert({
          user_id: user.id,
          job_type: action,
          status: 'PENDING',
          conversation_id: conversationId,
          input_payload: { 
            context: contextContent,
            topic: userTopic,
            conversationId: conversationId
          }
        })
        .select()
        .single();
      
      if (jobError) throw new Error(`Failed to create job: ${jobError.message}`);
      
      // Fire-and-forget: create insight job
      (async () => {
        try {
          await supabaseAdmin
            .from('jobs')
            .insert({
              user_id: user.id,
              job_type: 'LOG_ACADEMIC_INSIGHT',
              status: 'PENDING',
              conversation_id: conversationId,
              input_payload: {
                action: action.toLowerCase(),
                topic: context?.topic || 'Tópico não especificado',
                timestamp: new Date().toISOString()
              }
            });
          console.log('✅ Insight job created');
        } catch (err) {
          console.error('⚠️ Failed to create insight job:', err);
        }
      })();
      
      // Invoke job-runner
      supabaseAdmin.functions.invoke('job-runner', {
        body: { jobId: newJob.id }
      }).catch(err => console.error('Error invoking job-runner:', err));
      
      return new Response(
        JSON.stringify({
          response: 'Processando sua solicitação...',
          jobId: newJob.id,
          jobType: action,
          success: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle Deep Search - create job and return immediately
    if (isDeepSearch) {
      console.log('🔍 Deep search requested, creating job...');
      
      const { data: newJob, error: jobError } = await supabaseAdmin
        .from('jobs')
        .insert({
          user_id: user.id,
          job_type: 'DEEP_SEARCH',
          status: 'PENDING',
          conversation_id: conversationId,
          input_payload: { query: message, conversationId: conversationId }
        })
        .select()
        .single();
      
      if (jobError) {
        throw new Error(`Failed to create job: ${jobError.message}`);
      }
      
      console.log(`✅ Job created: ${newJob.id}`);
      
      // Invoke job-runner (fire and forget)
      supabaseAdmin.functions.invoke('job-runner', {
        body: { jobId: newJob.id }
      }).then(() => {
        console.log(`🚀 Job runner invoked for ${newJob.id}`);
      }).catch(err => {
        console.error('Error invoking job-runner:', err);
      });
      
      return new Response(
        JSON.stringify({
          response: 'Sua pesquisa profunda foi iniciada! Acompanhe o progresso na interface.',
          jobId: newJob.id,
          success: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    performanceContext += '\n**PRIORIDADE DE FONTES (quando citar referências técnicas):**\n';
    performanceContext += '- **Primárias:** Bases de dados de engenharia (Compendex, Scopus), manuais técnicos (Knovel), organizações de normas (ASTM, IEEE, ABNT)\n';
    performanceContext += '- **Secundárias:** Bibliotecas específicas de disciplinas (ASCE, ASME), Google Scholar\n';
    performanceContext += '- **Exclusão:** Evite citar blogs genéricos ou artigos de notícias não técnicas\n';

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

    // Master prompt for normal chat (deep search handled above)
    let systemPrompt = '';
    systemPrompt = `IDIOMA OBRIGATÓRIO: Todas as respostas, sugestões e materiais gerados devem estar em PORTUGUÊS BRASILEIRO (pt-BR).

Você é 'Mia', uma assistente de IA especialista em engenharia. Você atende tanto estudantes universitários brasileiros quanto professores de engenharia na plataforma Next Class.

**QUANDO ATENDER ESTUDANTES:**
A sua função é ser uma tutora pessoal, proativa e personalizada.

**PERSONA PARA ESTUDANTES:**
- Você é amigável, paciente e encorajadora
- Você fala em português do Brasil de forma natural e clara
- Você usa exemplos práticos e aplicáveis ao contexto brasileiro
- Você se refere a normas técnicas brasileiras (ABNT) quando relevante
- Você conhece o histórico de desempenho do aluno e usa isso para personalizar suas respostas

**CAPACIDADES PARA ESTUDANTES:**
- Explicar conceitos complexos de engenharia de forma simples
- Analisar diagramas, esquemas e documentos técnicos
- Responder dúvidas sobre cálculos estruturais, circuitos elétricos, mecânica, termodinâmica, etc.
- Fornecer feedback construtivo e sugestões de estudo personalizadas baseadas no desempenho real
- Ajudar na preparação para provas e trabalhos
- Identificar padrões de dificuldade e sugerir revisões focadas

**QUANDO ATENDER PROFESSORES:**
A sua função é ser uma assistente de design instrucional e criação de conteúdo educacional.

**PERSONA PARA PROFESSORES:**
- Você é profissional e pedagogicamente fundamentada
- Você conhece metodologias ativas de aprendizagem, especialmente PBL (Problem-Based Learning)
- Você tem expertise em design curricular para engenharia
- Você fornece sugestões práticas e diretamente aplicáveis em sala de aula
- Você sempre responde em português brasileiro

**CAPACIDADES PARA PROFESSORES:**
- Criar planos de aula detalhados seguindo o framework PBL
- Gerar atividades avaliativas com perguntas de ordem superior (Taxonomia de Bloom)
- Sugerir estratégias pedagógicas para tópicos específicos de engenharia
- Criar materiais de apoio: estudos de caso, notas técnicas, recursos bibliográficos
- Desenvolver quizzes e flashcards alinhados com objetivos de aprendizagem
- Realizar pesquisas profundas em fontes acadêmicas confiáveis

**ESTRUTURA DE RESPOSTA OBRIGATÓRIA:**

1. **Formatação Markdown:**
   - Use ## para títulos principais de seções (ex: "## Conceito Fundamental", "## Aplicação Prática")
   - Use ### para subtítulos quando necessário
   - Use listas numeradas (1., 2., 3.) ou com marcadores (-, *) para organizar informações
   - Use **negrito** para destacar conceitos-chave e termos técnicos importantes
   - Use \`código inline\` para fórmulas matemáticas, variáveis ou termos técnicos específicos
   - Use blocos de código com \`\`\` para fórmulas complexas ou código
   - Mantenha parágrafos curtos e bem espaçados para facilitar a leitura

2. **Sistema de Referências (quando aplicável):**
   - Se você citar informações específicas como: teoremas, normas técnicas, dados numéricos precisos, definições formais ou conceitos de fontes específicas, adicione uma citação numerada: [1], [2], [3]
   - Ao final da sua resposta, se houver citações, crie uma seção:
     ## Referências
     [1] Título do livro/norma - Autor, Ano (ex: "Resistência dos Materiais - Beer & Johnston, 2015")
     [2] Nome da norma técnica (ex: "NBR 6118:2014 - Projeto de estruturas de concreto")
   - Se a resposta for baseada em conhecimento geral de engenharia, **não é necessário** adicionar referências
   - Use bom senso: respostas conceituais básicas não precisam de referências, mas dados técnicos específicos sim

3. **Organização do Conteúdo:**
   - Respostas curtas (< 300 caracteres): Use pelo menos **negrito** para destacar pontos-chave
   - Respostas médias (300-800 caracteres): Use ## para título principal + listas ou subtítulos
   - Respostas longas (> 800 caracteres): Use ## para seções, ### para subtópicos, e uma seção final de conclusão ou próximos passos

**DIRETRIZES DE PERSONALIZAÇÃO:**
- Use o contexto de desempenho abaixo para personalizar TODAS as suas respostas (quando atender estudantes)
- Se o aluno perguntar sobre um tópico onde teve dificuldades, seja mais detalhada e didática
- Se ele teve bom desempenho, reconheça isso e desafie-o com conceitos mais avançados
- Quando relevante, mencione de forma sutil que você notou o desempenho dele (ex: "Percebi que esse tema foi desafiador no último quiz...")
- Quando analisar imagens técnicas, seja detalhado e preciso
- Sempre sugira próximos passos ou tópicos relacionados para aprofundamento
- Se não tiver certeza sobre algo, seja honesto e sugira recursos adicionais
- Para professores, quando solicitado a criar materiais (planos de aula, quizzes, flashcards), inicie um JOB do tipo apropriado

**TOM E CLAREZA:**
- Mantenha um tom didático, acessível e encorajador (para estudantes) ou profissional e pedagógico (para professores)
- Seja direta e objetiva, mas sem perder a empatia
- Evite jargões desnecessários, mas use termos técnicos corretos quando apropriado
- Use analogias e exemplos práticos do cotidiano brasileiro

**PRIORIDADE DE FONTES (quando citar referências técnicas):**
- **Primárias (OBRIGATÓRIAS):** 
  * Bases de dados de engenharia: Compendex (Engineering Village), Scopus, IEEE Xplore
  * Manuais técnicos: Knovel Engineering Library, CRC Handbooks
  * Organizações de normas: ASTM International, IEEE Standards, ABNT (Associação Brasileira de Normas Técnicas)
- **Secundárias (RECOMENDADAS):**
  * Bibliotecas específicas de disciplinas: ASCE Library, ASME Digital Collection
  * Google Scholar (apenas artigos peer-reviewed)
  * Springer Engineering, Wiley Online Library
- **EXCLUSÃO (NÃO CITAR):**
  * Blogs genéricos, artigos de notícias não técnicas, Wikipedia, sites .com sem credencial acadêmica

${performanceContext}`;
    
    // Call Lovable AI Gateway with Gemini
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling Lovable AI Gateway...');
    
    // Build the request body for normal chat
    const requestBody: any = {
      model: 'google/gemini-2.5-flash',
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
      max_tokens: 2000,
    };

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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

    // Handle conversation history
    let activeConversationId = conversationId;
    let conversationTitle = '';
    
    if (!conversationId) {
      // Create new conversation
      const { data: newConversation, error: convError } = await supabaseAdmin
        .from('conversations')
        .insert({
          user_id: user.id,
          title: 'Nova Conversa'
        })
        .select()
        .single();
      
      if (convError) {
        console.error('Error creating conversation:', convError);
      } else {
        activeConversationId = newConversation.id;
      }
    }

    // Save messages to database
    if (activeConversationId) {
      try {
        // Check message count BEFORE inserting new messages
        const { count: messageCountBefore, error: countError } = await supabaseAdmin
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', activeConversationId);

        console.log('Message count before insert:', messageCountBefore);
        const isFirstExchange = !countError && (messageCountBefore === null || messageCountBefore === 0);

        // Save user message
        await supabaseAdmin
          .from('messages')
          .insert({
            conversation_id: activeConversationId,
            role: 'user',
            content: message
          });

        // Save assistant message
        await supabaseAdmin
          .from('messages')
          .insert({
            conversation_id: activeConversationId,
            role: 'assistant',
            content: assistantMessage
          });

        // Generate title only for the first exchange
        if (isFirstExchange) {
          console.log('First exchange detected, generating conversation title...');
          
          try {
            // Generate title for the conversation using Gemini
            const titlePrompt = `Com base na seguinte conversa sobre engenharia, gere um título curto e descritivo com no máximo 5 palavras em português brasileiro. O título deve capturar o tópico principal discutido. NÃO use títulos genéricos como "Nova Conversa".

Pergunta do estudante: ${message}
Resposta: ${assistantMessage.substring(0, 300)}...`;

            console.log('Calling AI for title generation...');
            
            const titleResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                  {
                    role: 'system',
                    content: 'Você é um assistente especializado em criar títulos descritivos para conversas sobre engenharia. Gere títulos curtos (máximo 5 palavras) que capturem o tema principal. Responda APENAS com o título, sem aspas, pontuação adicional ou explicações. Use português brasileiro.'
                  },
                  {
                    role: 'user',
                    content: titlePrompt
                  }
                ],
                max_tokens: 50,
              }),
            });

            console.log('Title generation response status:', titleResponse.status);

            if (titleResponse.ok) {
              const titleData = await titleResponse.json();
              const generatedTitle = titleData.choices?.[0]?.message?.content?.trim();
              
              console.log('Raw generated title:', generatedTitle);
              
              if (generatedTitle && generatedTitle.toLowerCase() !== 'nova conversa') {
                conversationTitle = generatedTitle;
                
                // Update conversation title
                const { error: updateError } = await supabaseAdmin
                  .from('conversations')
                  .update({ title: conversationTitle })
                  .eq('id', activeConversationId);
                
                if (updateError) {
                  console.error('Error updating conversation title:', updateError);
                } else {
                  console.log('Successfully updated conversation title to:', conversationTitle);
                }
              } else {
                console.log('Title generation returned generic or empty title, keeping default');
                conversationTitle = 'Nova Conversa';
              }
            } else {
              const errorText = await titleResponse.text();
              console.error('Title generation failed:', titleResponse.status, errorText);
              conversationTitle = 'Nova Conversa';
            }
          } catch (titleError) {
            console.error('Error generating conversation title:', titleError);
            conversationTitle = 'Nova Conversa';
          }
        }
      } catch (error) {
        console.error('Error saving messages:', error);
      }
    }

    // 🔥 CRIAR JOB DE SUGESTÕES AUTOMATICAMENTE
    let suggestionsJobId: string | null = null;

    try {
      const { data: suggestionsJob, error: suggestionError } = await supabaseAdmin
        .from('jobs')
        .insert({
          user_id: user.id,
          job_type: 'GENERATE_SUGGESTIONS',
          status: 'PENDING',
          conversation_id: activeConversationId,
          input_payload: { 
            context: assistantMessage,
            topic: message.substring(0, 100),
            conversationId: activeConversationId
          }
        })
        .select()
        .single();

      if (!suggestionError && suggestionsJob) {
        suggestionsJobId = suggestionsJob.id;
        
        // Invocar job-runner (fire-and-forget)
        supabaseAdmin.functions.invoke('job-runner', {
          body: { jobId: suggestionsJob.id }
        }).catch(err => console.error('Error invoking job-runner for suggestions:', err));
        
        console.log(`✨ Suggestions job created: ${suggestionsJob.id}`);
      }
    } catch (error) {
      console.error('Failed to create suggestions job:', error);
      // Não bloquear a resposta principal se falhar
    }

    return new Response(
      JSON.stringify({ 
        response: assistantMessage,
        conversationId: activeConversationId,
        conversationTitle: conversationTitle,
        suggestionsJobId: suggestionsJobId, // ✅ NOVO CAMPO
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
