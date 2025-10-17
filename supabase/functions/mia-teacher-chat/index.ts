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
    console.log('🎓 Teacher chat request:', { message, fileType, fileName, isDeepSearch, conversationId, action });

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

    // Handle Interactive Actions (GENERATE_SUGGESTIONS, GENERATE_QUIZ, GENERATE_FLASHCARDS)
    if (action && ['GENERATE_SUGGESTIONS', 'GENERATE_QUIZ', 'GENERATE_FLASHCARDS'].includes(action)) {
      console.log(`🎯 Teacher action requested: ${action}`);
      
      const { data: lastUserMessage } = await supabaseAdmin
        .from('messages')
        .select('content')
        .eq('conversation_id', conversationId)
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      const userTopic = lastUserMessage?.content?.substring(0, 100) || 'Tópico de Engenharia';
      
      const { data: assistantMessages } = await supabaseAdmin
        .from('messages')
        .select('content')
        .eq('conversation_id', conversationId)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(5);
      
      const educationalContent = assistantMessages?.find(msg => 
        !msg.content.includes('Quiz criado com sucesso') &&
        !msg.content.includes('Flashcards criados com sucesso') &&
        msg.content.length > 200
      );
      
      const contextContent = educationalContent?.content || 'Conteúdo educacional não encontrado';
      
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

    // Handle Deep Search
    if (isDeepSearch) {
      console.log('🔍 Teacher deep search requested...');
      
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
      
      if (jobError) throw new Error(`Failed to create job: ${jobError.message}`);
      
      supabaseAdmin.functions.invoke('job-runner', {
        body: { jobId: newJob.id }
      }).catch(err => console.error('Error invoking job-runner:', err));
      
      return new Response(
        JSON.stringify({
          response: 'Sua pesquisa profunda foi iniciada! Acompanhe o progresso na interface.',
          jobId: newJob.id,
          success: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch teacher's classes context
    const { data: teacherClasses } = await supabaseAdmin
      .from('classes')
      .select('id, name, course, period')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Build teacher context
    let teacherContext = '\n\n**CONTEXTO DO PROFESSOR:**\n';
    
    if (teacherClasses && teacherClasses.length > 0) {
      teacherContext += '\nTurmas ativas:\n';
      teacherClasses.forEach((cls, index) => {
        teacherContext += `  ${index + 1}. ${cls.name} - ${cls.course} (${cls.period})\n`;
      });
      
      teacherContext += '\n**INSTRUÇÕES:** Use este contexto para personalizar suas respostas:\n';
      teacherContext += '- Quando o professor mencionar "minha turma" ou "meus alunos", refira-se às turmas listadas acima.\n';
      teacherContext += '- Sugira atividades e estratégias adequadas ao nível e contexto das turmas.\n';
      teacherContext += '- Considere o contexto brasileiro de ensino superior em engenharia.\n';
    } else {
      teacherContext += '\nO professor ainda não possui turmas cadastradas. Sugira começar criando uma turma no sistema.\n';
    }

    // Build content array for AI
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

    // Teacher-specific system prompt
    const systemPrompt = `Você é 'Mia', uma assistente de IA especializada em apoiar professores de engenharia do ensino superior brasileiro. Sua função é ser uma consultora pedagógica inteligente, proativa e focada em resultados.

**PERSONA:**
- Você é profissional, estratégica e orientada a soluções
- Você fala em português do Brasil de forma clara e objetiva
- Você entende os desafios do ensino de engenharia no contexto brasileiro
- Você conhece metodologias ativas, pedagogia de ensino superior e ferramentas educacionais
- Você se refere a diretrizes curriculares nacionais (DCN) e normas ABNT quando relevante

**CAPACIDADES:**
- Ajudar na criação de planos de aula estruturados e alinhados às DCNs
- Sugerir atividades práticas, estudos de caso e projetos aplicados
- Analisar padrões de desempenho da turma e identificar alunos em risco
- Criar materiais didáticos (slides, exercícios, roteiros de laboratório)
- Fornecer feedback sobre metodologias de ensino e avaliação
- Sugerir estratégias para engajar alunos em tópicos complexos
- Recomendar recursos educacionais e ferramentas tecnológicas

**ESTRUTURA DE RESPOSTA OBRIGATÓRIA:**

1. **Formatação Markdown:**
   - Use ## para títulos principais (ex: "## Plano de Aula", "## Estratégia Pedagógica")
   - Use ### para subtítulos
   - Use listas numeradas para passos sequenciais
   - Use **negrito** para destacar conceitos-chave e ações recomendadas
   - Use blocos de código com \`\`\` para exemplos de exercícios ou código
   - Mantenha parágrafos curtos e bem organizados

2. **Sistema de Referências (quando aplicável):**
   - Se citar DCNs, metodologias específicas, ou dados pedagógicos, adicione: [1], [2]
   - Ao final, crie seção de Referências se necessário
   - Exemplo: [1] "Diretrizes Curriculares Nacionais para Engenharia - MEC, 2019"

3. **Organização do Conteúdo:**
   - Para **criação de conteúdo** (planos, atividades): Use estrutura clara com objetivos, metodologia, recursos
   - Para **análise de turma**: Use dados, insights acionáveis e recomendações priorizadas
   - Para **dúvidas pedagógicas**: Forneça embasamento teórico + aplicação prática

**DIRETRIZES DE PERSONALIZAÇÃO:**
- Sempre considere o contexto de **ensino superior de engenharia no Brasil**
- Sugira atividades que conectem teoria à prática profissional
- Quando relevante, mencione competências da ABNT NBR ISO 9001 ou outras normas do setor
- Seja estratégica: priorize ações de alto impacto pedagógico
- Se não tiver certeza sobre dados da turma, seja honesta e sugira como obter essas informações

**TOM E CLAREZA:**
- Mantenha um tom profissional, mas acessível
- Seja direta: professores valorizam objetividade
- Use termos pedagógicos corretos (aprendizagem ativa, avaliação formativa, etc.)
- Forneça exemplos práticos e aplicáveis

**FUNCIONALIDADES DISPONÍVEIS:**
Você pode ajudar o professor a:
- 📝 Criar planos de aula detalhados
- 📊 Analisar desempenho da turma
- 🎯 Gerar atividades avaliativas (quizzes, exercícios, projetos)
- 💡 Sugerir estratégias de engajamento
- 📚 Recomendar materiais didáticos e recursos
- 🔍 Identificar lacunas de aprendizagem na turma

${teacherContext}`;
    
    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling Lovable AI Gateway for teacher...');
    
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
    const assistantMessage = aiData.choices?.[0]?.message?.content;
    
    if (!assistantMessage) {
      throw new Error('Resposta inválida da IA');
    }

    // Handle conversation
    let activeConversationId = conversationId;
    
    if (!conversationId) {
      const { data: newConversation, error: convError } = await supabaseAdmin
        .from('conversations')
        .insert({
          user_id: user.id,
          title: 'Nova Conversa'
        })
        .select()
        .single();
      
      if (!convError) {
        activeConversationId = newConversation.id;
      }
    }

    // Save messages
    if (activeConversationId) {
      try {
        const { count: messageCountBefore } = await supabaseAdmin
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', activeConversationId);

        const isFirstExchange = messageCountBefore === null || messageCountBefore === 0;

        await supabaseAdmin
          .from('messages')
          .insert({
            conversation_id: activeConversationId,
            role: 'user',
            content: message
          });

        await supabaseAdmin
          .from('messages')
          .insert({
            conversation_id: activeConversationId,
            role: 'assistant',
            content: assistantMessage
          });

        // Generate title for first exchange
        if (isFirstExchange) {
          const titlePrompt = `Com base na seguinte conversa de um professor de engenharia, gere um título curto e descritivo com no máximo 5 palavras em português brasileiro.

Pergunta do professor: ${message}
Resposta: ${assistantMessage.substring(0, 300)}...`;

          const titleResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: 'Você é um gerador de títulos. Responda APENAS com o título, sem aspas ou explicações.' },
                { role: 'user', content: titlePrompt }
              ],
              temperature: 0.7,
              max_tokens: 20,
            }),
          });

          if (titleResponse.ok) {
            const titleData = await titleResponse.json();
            const generatedTitle = titleData.choices?.[0]?.message?.content?.trim();
            
            if (generatedTitle) {
              await supabaseAdmin
                .from('conversations')
                .update({ title: generatedTitle })
                .eq('id', activeConversationId);
            }
          }
        }
      } catch (error) {
        console.error('Error saving messages:', error);
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
    console.error('Error in mia-teacher-chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
