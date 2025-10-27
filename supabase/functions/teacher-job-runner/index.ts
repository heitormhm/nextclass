import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function sanitizeJSON(text: string): string {
  return text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
}

// Helper function to update job progress
async function updateJobProgress(
  supabase: any,
  jobId: string,
  progress: number,
  message: string
) {
  console.log(`[Job ${jobId}] 📊 ${Math.round(progress * 100)}%: ${message}`);
  
  const { error } = await supabase
    .from('teacher_jobs')
    .update({
      progress,
      progress_message: message,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
    
  if (error) {
    console.error(`[Job ${jobId}] ❌ Failed to update progress:`, error);
  }
}

// Process deep search for lecture material
async function processLectureDeepSearch(job: any, supabase: any, lovableApiKey: string) {
  const { lectureId, lectureTitle, tags, userId, teacherName } = job.input_payload;
  
  if (!lectureId || !lectureTitle) {
    throw new Error('Invalid job payload: missing required fields (lectureId or lectureTitle)');
  }
  
  console.log(`[Job ${job.id}] 🚀 Deep Search starting for lecture: ${lectureTitle}`);
  console.log(`[Job ${job.id}] 👤 Teacher name: ${teacherName || 'Not provided'}`);

  const braveApiKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
  if (!braveApiKey) {
    await updateJobProgress(supabase, job.id, 0, 'Erro: BRAVE_SEARCH_API_KEY não configurada');
    throw new Error('BRAVE_SEARCH_API_KEY not configured. Please add it to your Supabase secrets.');
  }

  try {
    // Step 1: Decompose query (10% progress)
    await updateJobProgress(supabase, job.id, 0.1, 'Analisando tópico da aula...');
    
    const query = `${lectureTitle}${tags && tags.length > 0 ? ` - Tópicos: ${tags.join(', ')}` : ''}`;
    console.log(`[Job ${job.id}] 📝 Query: ${query}`);
    
    const subQuestions = await decomposeQuery(query, lovableApiKey, job.id);
    console.log(`[Job ${job.id}] ✅ Decomposed into ${subQuestions.length} sub-questions`);

    // Step 2: Execute web searches (30% progress)
    await updateJobProgress(supabase, job.id, 0.3, 'Pesquisando fontes na web...');
    
    const searchResults = await executeWebSearches(subQuestions, braveApiKey, job.id);
    console.log(`[Job ${job.id}] ✅ Collected ${searchResults.length} search results`);

    // Step 3: Collect data (60% progress)
    await updateJobProgress(supabase, job.id, 0.6, 'Coletando dados educacionais...');
    
    // Step 4: Generate educational report (80% progress)
    await updateJobProgress(supabase, job.id, 0.8, 'Gerando material didático...');
    
    const report = await generateEducationalReport(query, searchResults, teacherName, lovableApiKey, job.id);
    console.log(`[Job ${job.id}] ✅ Report generated, length: ${report.length} characters`);

    // Step 5: Save to lecture (90% progress)
    await updateJobProgress(supabase, job.id, 0.9, 'Salvando material...');
    
    // Get existing lecture content
    const { data: lecture, error: lectureError } = await supabase
      .from('lectures')
      .select('structured_content')
      .eq('id', lectureId)
      .single();
    
    if (lectureError) {
      console.error(`[Job ${job.id}] ❌ Failed to fetch lecture:`, lectureError);
      throw new Error(`Failed to fetch lecture: ${lectureError.message}`);
    }

    const existingContent = lecture?.structured_content || {};
    
    // Update lecture with material
    const { error: updateError } = await supabase
      .from('lectures')
      .update({
        structured_content: {
          ...existingContent,
          material_didatico: report
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', lectureId);
    
    if (updateError) {
      console.error(`[Job ${job.id}] ❌ Failed to update lecture:`, updateError);
      throw new Error(`Failed to update lecture: ${updateError.message}`);
    }

    // Step 6: Complete (100% progress)
    await updateJobProgress(supabase, job.id, 1.0, 'Concluído!');
    
    await supabase
      .from('teacher_jobs')
      .update({
        status: 'COMPLETED',
        result_payload: { report: report.substring(0, 500) + '...' },
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    console.log(`[Job ${job.id}] 🎉 Deep Search completed successfully`);

  } catch (error) {
    console.error(`[Job ${job.id}] ❌ Error:`, error);
    await supabase
      .from('teacher_jobs')
      .update({
        status: 'FAILED',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);
    throw error;
  }
}

// Decompose query into sub-questions
async function decomposeQuery(query: string, apiKey: string, jobId: string): Promise<string[]> {
  console.log(`[Job ${jobId}] 🧩 Decomposing query...`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente que decompõe tópicos educacionais em perguntas de pesquisa. Retorne apenas JSON válido com array "questions".'
          },
          {
            role: 'user',
            content: `Decomponha este tópico em 3-5 perguntas de pesquisa específicas para buscar informações educacionais relevantes:\n\n"${query}"\n\nRetorne JSON: {"questions": ["pergunta 1", "pergunta 2", ...]}`
          }
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit atingido. Aguarde alguns segundos e tente novamente.');
      }
      if (response.status === 402) {
        throw new Error('Créditos insuficientes no Lovable AI. Adicione créditos em Settings > Usage.');
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(sanitizeJSON(content));
    
    return parsed.questions || [query];
    
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AI request timeout (60s). Tópico muito complexo ou serviço lento.');
    }
    throw error;
  }
}

// Execute web searches using Brave API
async function executeWebSearches(questions: string[], braveApiKey: string, jobId: string): Promise<any[]> {
  console.log(`[Job ${jobId}] 🔍 Executing ${questions.length} web searches...`);
  
  const allResults: any[] = [];
  
  for (const question of questions) {
    try {
      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(question)}&count=5`,
        {
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': braveApiKey,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.web?.results) {
          allResults.push(...data.web.results.slice(0, 3)); // Top 3 per question
        }
      } else {
        console.warn(`[Job ${jobId}] ⚠️ Search failed for question: ${question} (status: ${response.status})`);
      }
    } catch (error) {
      console.error(`[Job ${jobId}] ⚠️ Search error for question: ${question}`, error);
    }
  }
  
  console.log(`[Job ${jobId}] ✅ Total results collected: ${allResults.length}`);
  return allResults;
}

// Generate educational report from search results
async function generateEducationalReport(
  query: string,
  searchResults: any[],
  teacherName: string | undefined,
  apiKey: string,
  jobId: string
): Promise<string> {
  console.log(`[Job ${jobId}] 📝 Generating educational report...`);
  
  const context = searchResults
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.description || ''}\nURL: ${r.url}`)
    .join('\n\n');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `Você é um professor de engenharia especializado em criar material didático.

**Informações do Professor:**
- Nome: ${teacherName || 'Professor'}

INSTRUÇÕES:
1. Crie um material didático completo e estruturado
2. Use markdown com seções claras
3. Inclua: introdução, conceitos principais, exemplos práticos, conclusão
4. Seja técnico mas didático
5. Cite as fontes quando relevante
6. Foque em aplicações práticas da engenharia
7. Ao referenciar o autor do material, use "Professor: ${teacherName || 'Professor'}" ao invés de placeholders como "[Seu Nome]"`
          },
          {
            role: 'user',
            content: `Tópico: ${query}\n\nFontes de pesquisa:\n${context}\n\nCrie um material didático completo sobre este tópico.`
          }
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit atingido. Aguarde alguns segundos e tente novamente.');
      }
      if (response.status === 402) {
        throw new Error('Créditos insuficientes no Lovable AI. Adicione créditos em Settings > Usage.');
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const report = data.choices?.[0]?.message?.content;
    
    if (!report) {
      throw new Error('No report generated');
    }
    
    console.log(`[Job ${jobId}] ✅ Report generated successfully`);
    return report;
    
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AI request timeout (60s). Tópico muito complexo ou serviço lento.');
    }
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();
    if (!jobId) {
      console.error('[teacher-job-runner] ❌ No jobId provided');
      return new Response(JSON.stringify({ error: 'jobId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[teacher-job-runner] 🔄 Processing job: ${jobId}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch job
    const { data: job, error: jobError } = await supabaseAdmin
      .from('teacher_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error(`[teacher-job-runner] ❌ Job not found: ${jobId}`, jobError);
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Job ${jobId}] ✅ Found: ${job.job_type} | Status: ${job.status} | Lecture: ${job.lecture_id}`);

    // Update status to PROCESSING
    await supabaseAdmin
      .from('teacher_jobs')
      .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    console.log(`[Job ${jobId}] 🔄 Status updated to PROCESSING`);

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Handle GENERATE_LECTURE_DEEP_SEARCH job type
    if (job.job_type === 'GENERATE_LECTURE_DEEP_SEARCH') {
      console.log(`[Job ${jobId}] 🔍 Processing GENERATE_LECTURE_DEEP_SEARCH`);
      await processLectureDeepSearch(job, supabaseAdmin, lovableApiKey);
      return new Response(
        JSON.stringify({ success: true, message: 'Deep search job completed' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle GENERATE_QUIZ and GENERATE_FLASHCARDS
    const { title, transcript, tags } = job.input_payload;

    let systemPrompt = '';
    let userPrompt = '';

    if (job.job_type === 'GENERATE_QUIZ') {
      const lectureTags = job.input_payload.tags || [];
      const tagsText = lectureTags.length > 0 ? lectureTags.join(', ') : 'Não especificadas';
      
      systemPrompt = `Você é um assistente especializado em criar questões de múltipla escolha para avaliação em cursos de engenharia, seguindo rigorosamente a Taxonomia de Bloom.

INSTRUÇÕES CRÍTICAS:
1. **PRIORIZAÇÃO DE CONTEÚDO**: 
   - 70% das questões devem focar no TÍTULO e TAGS da aula
   - 30% podem usar detalhes complementares da transcrição
2. Responda em português brasileiro
3. Retorne APENAS JSON válido, sem markdown
4. Crie 10 questões de múltipla escolha
5. Cada questão deve ter 4 alternativas (A, B, C, D)
6. Identifique corretamente a alternativa correta
7. Classifique cada questão segundo Bloom

NÍVEIS DE BLOOM (distribuição recomendada):
- 3 questões: Conhecimento (definições, conceitos básicos do título)
- 3 questões: Compreensão (explicações, interpretações das tags)
- 2 questões: Aplicação (uso prático, exemplos)
- 2 questões: Análise (comparações, relações)

FORMATO JSON:
{
  "questions": [
    {
      "question": "Texto da pergunta clara e objetiva",
      "options": {
        "A": "Texto alternativa A",
        "B": "Texto alternativa B",
        "C": "Texto alternativa C",
        "D": "Texto alternativa D"
      },
      "correctAnswer": "A",
      "bloomLevel": "Aplicação",
      "explanation": "Explicação detalhada (2-3 frases)"
    }
  ]
}`;

      userPrompt = `# CONTEXTO PRINCIPAL (PRIORIDADE MÁXIMA - 70% das questões)
Título da Aula: "${title}"
Tags da Aula: ${tagsText}

# INSTRUÇÕES
Gere 10 questões focadas PRINCIPALMENTE no título e tags acima. Use a transcrição apenas para detalhes complementares.

# TRANSCRIÇÃO DA AULA (usar apenas 30% para detalhes)
${transcript}

IMPORTANTE: Retorne APENAS o JSON, sem texto adicional.`;

    } else if (job.job_type === 'GENERATE_FLASHCARDS') {
      const lectureTags = job.input_payload.tags || [];
      const tagsText = lectureTags.length > 0 ? lectureTags.join(', ') : 'Não especificadas';
      
      systemPrompt = `Você é um assistente especializado em criar flashcards educacionais para cursos de engenharia.

INSTRUÇÕES CRÍTICAS:
1. **PRIORIZAÇÃO DE CONTEÚDO**:
   - 70% dos flashcards devem focar no TÍTULO e TAGS da aula
   - 30% podem usar detalhes complementares da transcrição
2. Responda em português brasileiro
3. Retorne APENAS JSON válido, sem markdown
4. Crie 15 flashcards
5. Cada flashcard deve ter frente (pergunta/conceito) e verso (resposta/explicação)
6. Inclua tags relevantes para organização (usar tags da aula quando possível)

TIPOS DE FLASHCARDS (distribuição recomendada):
- 5 flashcards: Definições (conceitos-chave do título)
- 5 flashcards: Explicações (relacionadas às tags)
- 5 flashcards: Aplicações (exemplos práticos)

REGRAS:
- Front: Sempre uma pergunta direta (max 100 caracteres)
- Back: Resposta concisa e objetiva (max 200 caracteres)
- Tags: 2-3 tags por card (usar tags da aula quando possível)

FORMATO JSON:
{
  "cards": [
    {
      "front": "Pergunta clara e direta",
      "back": "Resposta concisa e objetiva",
      "tags": ["tag1", "tag2"]
    }
  ]
}`;

      userPrompt = `# CONTEXTO PRINCIPAL (PRIORIDADE MÁXIMA - 70% dos flashcards)
Título da Aula: "${title}"
Tags da Aula: ${tagsText}

# INSTRUÇÕES
Gere 15 flashcards focados PRINCIPALMENTE no título e tags acima. Use a transcrição apenas para detalhes complementares.

# TRANSCRIÇÃO DA AULA (usar apenas 30% para detalhes)
${transcript}

IMPORTANTE: Retorne APENAS o JSON, sem texto adicional.`;
    }

    console.log(`[Job ${jobId}] 🤖 Calling Lovable AI with 60s timeout...`);

    // Call Lovable AI with 60s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let aiResponse;
    try {
      aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('AI request timed out after 60 seconds');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    console.log(`[Job ${jobId}] ✅ AI response status: ${aiResponse.status}`);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[Job ${jobId}] ❌ AI API error: ${aiResponse.status}`, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Payment required. Please add credits to your Lovable AI workspace.');
      }
      throw new Error(`AI API error: ${aiResponse.status} ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log(`[Job ${jobId}] 📦 AI response received, parsing content...`);

    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    const sanitized = sanitizeJSON(content);
    console.log(`[Job ${jobId}] 🧹 Content sanitized, parsing JSON...`);

    const parsedData = JSON.parse(sanitized);

    // Validate structure
    if (job.job_type === 'GENERATE_QUIZ') {
      if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
        throw new Error('Invalid quiz structure: missing questions array');
      }
      
      console.log(`[Job ${jobId}] ✅ Quiz validated: ${parsedData.questions.length} questions`);

      // Save to teacher_quizzes table
      const { error: insertError } = await supabaseAdmin
        .from('teacher_quizzes')
        .insert({
          lecture_id: job.lecture_id,
          teacher_id: job.teacher_id,
          title: title || 'Quiz sem título',
          questions: parsedData.questions
        });

      if (insertError) {
        console.error(`[Job ${jobId}] ❌ Failed to save quiz:`, insertError);
        throw new Error(`Failed to save quiz: ${insertError.message}`);
      }

    } else if (job.job_type === 'GENERATE_FLASHCARDS') {
      if (!parsedData.cards || !Array.isArray(parsedData.cards)) {
        throw new Error('Invalid flashcards structure: missing cards array');
      }
      
      console.log(`[Job ${jobId}] ✅ Flashcards validated: ${parsedData.cards.length} cards`);

      // Save to teacher_flashcards table
      const { error: insertError } = await supabaseAdmin
        .from('teacher_flashcards')
        .insert({
          lecture_id: job.lecture_id,
          teacher_id: job.teacher_id,
          title: title || 'Flashcards sem título',
          cards: parsedData.cards
        });

      if (insertError) {
        console.error(`[Job ${jobId}] ❌ Failed to save flashcards:`, insertError);
        throw new Error(`Failed to save flashcards: ${insertError.message}`);
      }
    }

    // Update job status to COMPLETED
    await supabaseAdmin
      .from('teacher_jobs')
      .update({
        status: 'COMPLETED',
        result_payload: parsedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`[Job ${jobId}] 🎉 Job completed successfully`);

    return new Response(
      JSON.stringify({ success: true, message: 'Job completed successfully' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[teacher-job-runner] ❌ Error:', errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});