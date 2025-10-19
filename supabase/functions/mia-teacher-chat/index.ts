import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, fileData, fileType, fileName, isDeepSearch, conversationId, action, context, systemPrompt } = await req.json();
    console.log('[TEACHER] Received request:', { message, fileType, fileName, isDeepSearch, conversationId, action });

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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle Interactive Actions for Teachers (GENERATE_LESSON_PLAN, GENERATE_QUIZ, GENERATE_FLASHCARDS, GENERATE_RUBRIC)
    if (action && ['GENERATE_SUGGESTIONS', 'GENERATE_QUIZ', 'GENERATE_FLASHCARDS', 'GENERATE_LESSON_PLAN', 'GENERATE_RUBRIC', 'GENERATE_CASE_STUDY'].includes(action)) {
      console.log(`🎯 [TEACHER] Interactive action requested: ${action}`);
      
      // Buscar última mensagem do usuário para topic
      const { data: lastUserMessage } = await supabaseAdmin
        .from('messages')
        .select('content')
        .eq('conversation_id', conversationId)
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      const userTopic = lastUserMessage?.content?.substring(0, 100) || 'Tópico de Engenharia';
      console.log('[TEACHER] 📝 Extracted topic:', userTopic);
      
      // Buscar conteúdo educacional da conversa
      const { data: assistantMessages } = await supabaseAdmin
        .from('messages')
        .select('content')
        .eq('conversation_id', conversationId)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(5);
      
      const educationalContent = assistantMessages?.find(msg => 
        !msg.content.includes('criado com sucesso') &&
        msg.content.length > 200
      );
      
      const contextContent = educationalContent?.content || 'Conteúdo educacional não encontrado';
      console.log('[TEACHER] 📚 Context length:', contextContent.length);
      
      // Create main job using TEACHER job runner
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
            conversationId: conversationId,
            teacher_mode: true
          }
        })
        .select()
        .single();
      
      if (jobError) throw new Error(`Failed to create job: ${jobError.message}`);
      
      // Invoke TEACHER job-runner
      supabaseAdmin.functions.invoke('teacher-job-runner', {
        body: { jobId: newJob.id }
      }).catch(err => console.error('[TEACHER] Error invoking teacher-job-runner:', err));
      
      return new Response(
        JSON.stringify({
          response: 'Processando sua solicitação pedagógica...',
          jobId: newJob.id,
          jobType: action,
          success: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle Deep Search for Teachers
    if (isDeepSearch) {
      console.log('[TEACHER] 🔍 Deep search requested, creating pedagogical job...');
      
      const { data: newJob, error: jobError } = await supabaseAdmin
        .from('jobs')
        .insert({
          user_id: user.id,
          job_type: 'DEEP_SEARCH',
          status: 'PENDING',
          conversation_id: conversationId,
          input_payload: { 
            query: message, 
            conversationId: conversationId,
            teacher_mode: true,
            pedagogical_focus: true
          }
        })
        .select()
        .single();
      
      if (jobError) {
        throw new Error(`Failed to create job: ${jobError.message}`);
      }
      
      console.log(`[TEACHER] ✅ Pedagogical job created: ${newJob.id}`);
      
      // Invoke TEACHER job-runner
      supabaseAdmin.functions.invoke('teacher-job-runner', {
        body: { jobId: newJob.id }
      }).then(() => {
        console.log(`[TEACHER] 🚀 Teacher job runner invoked for ${newJob.id}`);
      }).catch(err => {
        console.error('[TEACHER] Error invoking teacher-job-runner:', err);
      });
      
      return new Response(
        JSON.stringify({
          response: 'Sua pesquisa pedagógica foi iniciada! Acompanhe o progresso na interface.',
          jobId: newJob.id,
          success: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch teacher context (classes, lesson plans)
    console.log('[TEACHER] Fetching teacher context for user:', user.id);
    
    const { data: teacherClasses } = await supabaseAdmin
      .from('classes')
      .select('name, course, period')
      .eq('teacher_id', user.id)
      .limit(5);

    const { data: recentLessonPlans } = await supabaseAdmin
      .from('lesson_plans')
      .select('topic, duration, created_at')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3);

    // Build teacher context
    let teacherContext = '\n\n**CONTEXTO DO PROFESSOR:**\n';
    
    if (teacherClasses && teacherClasses.length > 0) {
      teacherContext += '\nTurmas Ativas:\n';
      teacherClasses.forEach((cls, index) => {
        teacherContext += `  ${index + 1}. ${cls.name} - ${cls.course} (${cls.period})\n`;
      });
    }

    if (recentLessonPlans && recentLessonPlans.length > 0) {
      teacherContext += '\nPlanos de Aula Recentes:\n';
      recentLessonPlans.forEach((plan, index) => {
        const date = new Date(plan.created_at).toLocaleDateString('pt-BR');
        teacherContext += `  ${index + 1}. ${plan.topic} - ${plan.duration} (${date})\n`;
      });
    }

    if ((!teacherClasses || teacherClasses.length === 0) && (!recentLessonPlans || recentLessonPlans.length === 0)) {
      teacherContext += '\nEste é um bom momento para começar a criar suas primeiras turmas e planos de aula!\n';
    }

    teacherContext += '\n**FONTES PEDAGÓGICAS PRIORITÁRIAS:**\n';
    teacherContext += '- **Primárias:** ERIC (Education Resources Information Center), revistas de educação em engenharia (IEEE Education Society, ASEE)\n';
    teacherContext += '- **Secundárias:** Google Scholar (artigos pedagógicos), repositórios institucionais, frameworks de aprendizagem ativa\n';
    teacherContext += '- **Exclusão:** Evite fontes não acadêmicas ou sem fundamentação pedagógica\n';

    // Build the content array
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
            url: fileData
          }
        });
      } else if (fileType === 'application/pdf') {
        contentParts.push({
          type: "text",
          text: `\n[PDF anexado: ${fileName}]\nNOTA: Análise de PDF completa estará disponível em breve.`
        });
      } else if (fileType.startsWith('audio/')) {
        contentParts.push({
          type: "text",
          text: `\n[Áudio anexado: ${fileName}]\nNOTA: Transcrição de áudio estará disponível em breve.`
        });
      }
    }

    // TEACHER-SPECIFIC System Prompt
    let finalSystemPrompt = systemPrompt || `IDIOMA OBRIGATÓRIO: Todas as respostas, sugestões e materiais gerados devem estar em PORTUGUÊS BRASILEIRO (pt-BR).

Você é 'Mia', uma assistente de IA especializada em design instrucional e pedagogia para cursos de engenharia. Você atende PROFESSORES de engenharia na plataforma Next Class.

**PERSONA PARA PROFESSORES:**
- Você é profissional, pedagogicamente fundamentada e orientada para a prática
- Você conhece metodologias ativas de aprendizagem, especialmente PBL (Problem-Based Learning), Flipped Classroom, e Team-Based Learning
- Você tem expertise em design curricular para engenharia e Taxonomia de Bloom
- Você fornece sugestões práticas e diretamente aplicáveis em sala de aula
- Você sempre responde em português brasileiro
- Você é uma parceira de criação, não apenas uma executora de tarefas

**CAPACIDADES PARA PROFESSORES:**
- Criar planos de aula detalhados seguindo o framework PBL
- Gerar atividades avaliativas com perguntas de ordem superior (Taxonomia de Bloom: Análise, Síntese, Avaliação)
- Sugerir estratégias pedagógicas para tópicos específicos de engenharia
- Criar materiais de apoio: estudos de caso, notas técnicas, recursos bibliográficos
- Desenvolver quizzes e flashcards alinhados com objetivos de aprendizagem explícitos
- Realizar pesquisas profundas em fontes acadêmicas confiáveis (com foco em pedagogia de engenharia)
- Propor abordagens de avaliação formativa e somativa

**ESTRUTURA DE RESPOSTA OBRIGATÓRIA:**

1. **Formatação Markdown:**
   - Use ## para títulos principais de seções (ex: "## Objetivo Pedagógico", "## Estratégias de Ensino")
   - Use ### para subtítulos quando necessário
   - Use listas numeradas (1., 2., 3.) para sequências didáticas
   - Use **negrito** para destacar conceitos pedagógicos e termos técnicos
   - Use \`código inline\` para frameworks, metodologias ou termos específicos
   - Mantenha parágrafos curtos e bem espaçados

2. **Sistema de Referências (quando aplicável):**
   - Se você citar metodologias, teorias pedagógicas, ou dados específicos de educação em engenharia, adicione citações numeradas: [1], [2], [3]
   - Ao final, crie uma seção:
     ## Referências
     [1] Nome do artigo/livro - Autor, Ano (ex: "How Learning Works - Ambrose et al., 2010")
     [2] Framework pedagógico (ex: "Problem-Based Learning in Engineering - Kolmos et al., 2007")

3. **Organização do Conteúdo:**
   - Respostas curtas: Use **negrito** para destacar metodologias-chave
   - Respostas médias: Use ## para estrutura + listas de ações práticas
   - Respostas longas: Use ## para seções pedagógicas (Objetivo, Estratégia, Avaliação, Recursos), com conclusão prática

**DIRETRIZES DE PERSONALIZAÇÃO:**
- Use o contexto do professor (turmas, planos de aula recentes) para personalizar sugestões
- Quando sugerir atividades, sempre inclua: objetivo de aprendizagem (Bloom), duração estimada, e recursos necessários
- Quando criar materiais avaliativos, explicite o nível cognitivo de cada questão (Conhecimento, Compreensão, Aplicação, Análise, Síntese, Avaliação)
- Priorize estratégias de aprendizagem ativa sobre aulas expositivas
- Sempre sugira formas de avaliar a eficácia da estratégia proposta
- Se não tiver certeza, seja honesto e sugira recursos pedagógicos adicionais

**TOM E CLAREZA:**
- Mantenha um tom profissional, colaborativo e pedagogicamente rigoroso
- Seja direta e prática, focando em aplicabilidade imediata em sala de aula
- Use terminologia pedagógica apropriada (andaime cognitivo, aprendizagem significativa, avaliação formativa)
- Forneça exemplos práticos adaptados ao contexto brasileiro de engenharia

**PRIORIDADE DE FONTES PEDAGÓGICAS:**
- **Primárias (OBRIGATÓRIAS):** 
  * ERIC (Education Resources Information Center)
  * IEEE Education Society, ASEE (American Society for Engineering Education)
  * Revistas: Journal of Engineering Education, European Journal of Engineering Education
- **Secundárias (RECOMENDADAS):**
  * Google Scholar (artigos peer-reviewed em educação em engenharia)
  * Repositórios institucionais de universidades renomadas
  * Livros de referência: "How Learning Works" (Ambrose), "Problem-Based Learning" (Kolmos)
- **EXCLUSÃO (NÃO CITAR):**
  * Blogs sem fundamentação científica, artigos não revisados por pares, Wikipedia

${teacherContext}`;
    
    // Call Lovable AI Gateway with Gemini
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('[TEACHER] Calling Lovable AI Gateway...');
    
    const requestBody: any = {
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: finalSystemPrompt
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
      console.error('[TEACHER] AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Limite de requisições atingido. Tente novamente em alguns instantes.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Créditos insuficientes. Entre em contato com o suporte.');
      }
      
      throw new Error(`Erro na API de IA: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('[TEACHER] AI response received');

    const assistantMessage = aiData.choices?.[0]?.message?.content;
    if (!assistantMessage) {
      throw new Error('Resposta inválida da IA');
    }

    // Handle conversation history
    let activeConversationId = conversationId;
    let conversationTitle = '';
    
    if (!conversationId) {
      // Create new conversation
      const title = message.slice(0, 50) || 'Nova Conversa Pedagógica';
      
      const { data: newConversation, error: conversationError } = await supabaseAdmin
        .from('conversations')
        .insert({
          user_id: user.id,
          title: title,
        })
        .select()
        .single();

      if (conversationError) {
        console.error('[TEACHER] Error creating conversation:', conversationError);
      } else {
        activeConversationId = newConversation.id;
        conversationTitle = title;
        console.log('[TEACHER] ✅ New conversation created:', activeConversationId);
      }
    }

    // Save messages to database
    const messagesToSave = [
      {
        conversation_id: activeConversationId,
        role: 'user',
        content: message,
      },
      {
        conversation_id: activeConversationId,
        role: 'assistant',
        content: assistantMessage,
      }
    ];

    const { error: messagesError } = await supabaseAdmin
      .from('messages')
      .insert(messagesToSave);

    if (messagesError) {
      console.error('[TEACHER] Error saving messages:', messagesError);
    }

    // Generate conversation title for new conversations
    if (!conversationId && activeConversationId) {
      supabaseAdmin.functions.invoke('generate-teacher-conversation-title', {
        body: { 
          conversationId: activeConversationId, 
          firstMessage: message 
        }
      }).catch(err => console.error('[TEACHER] Error generating title:', err));
    }

    // Auto-generate suggestions after chat response
    if (activeConversationId && !isDeepSearch) {
      const { data: suggestionsJob, error: suggestionsError } = await supabaseAdmin
        .from('jobs')
        .insert({
          user_id: user.id,
          job_type: 'GENERATE_SUGGESTIONS',
          status: 'PENDING',
          conversation_id: activeConversationId,
          input_payload: {
            context: assistantMessage,
            topic: message.substring(0, 100),
            conversationId: activeConversationId,
            teacher_mode: true
          }
        })
        .select()
        .single();

      if (!suggestionsError && suggestionsJob) {
        supabaseAdmin.functions.invoke('teacher-job-runner', {
          body: { jobId: suggestionsJob.id }
        }).catch(err => console.error('[TEACHER] Error invoking suggestions job:', err));
      }
    }

    return new Response(
      JSON.stringify({
        response: assistantMessage,
        conversationId: activeConversationId,
        success: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[TEACHER] Error in mia-teacher-chat:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
