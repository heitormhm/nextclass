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
      
      // Create main job
      const { data: newJob, error: jobError } = await supabaseAdmin
        .from('jobs')
        .insert({
          user_id: user.id,
          job_type: action,
          status: 'PENDING',
          input_payload: { 
            context: context?.context || context,
            topic: context?.topic || 'Tópico de Engenharia',
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
          input_payload: { query: message }
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
          input_payload: { 
            context: assistantMessage, // Usar a resposta recém-gerada como contexto
            topic: message.substring(0, 100), // Extrair tópico da pergunta do usuário
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
