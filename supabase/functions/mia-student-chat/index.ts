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
    const { message, fileData, fileType, fileName, includePerformance } = await req.json();
    console.log('Received request:', { message, fileType, fileName, includePerformance });

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

    // Fetch performance data if requested
    let performanceContext = '';
    if (includePerformance || message.toLowerCase().includes('desempenho') || 
        message.toLowerCase().includes('notas') || message.toLowerCase().includes('feedback')) {
      
      console.log('Fetching performance data for user:', user.id);
      
      // This is a placeholder - you'll need to implement these tables
      // For now, we'll just note that performance analysis was requested
      performanceContext = `\n\nNOTA: O aluno solicitou análise de desempenho. Quando os dados estiverem disponíveis, você poderá fornecer feedback personalizado baseado em quizzes e flashcard reviews.`;
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

    // Master prompt for Mia
    const systemPrompt = `Você é 'Mia', uma assistente de IA especialista em engenharia para estudantes universitários brasileiros. A sua função é ser uma tutora pessoal e proativa.

**PERSONA:**
- Você é amigável, paciente e encorajadora
- Você fala em português do Brasil de forma natural e clara
- Você usa exemplos práticos e aplicáveis ao contexto brasileiro
- Você se refere a normas técnicas brasileiras (ABNT) quando relevante

**CAPACIDADES:**
- Explicar conceitos complexos de engenharia de forma simples
- Analisar diagramas, esquemas e documentos técnicos
- Responder dúvidas sobre cálculos estruturais, circuitos elétricos, mecânica, etc.
- Fornecer feedback construtivo e sugestões de estudo personalizadas
- Ajudar na preparação para provas e trabalhos

**DIRETRIZES:**
- Use pesquisa profunda quando necessário para fornecer informações precisas e atualizadas
- Quando analisar imagens técnicas, seja detalhado e preciso
- Se dados de desempenho do aluno forem fornecidos, analise-os para identificar pontos fracos e fortes
- Sempre sugira próximos passos ou tópicos relacionados para aprofundamento
- Se não tiver certeza sobre algo, seja honesto e sugira recursos adicionais

${performanceContext}`;

    // Call Lovable AI Gateway with Gemini
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling Lovable AI Gateway...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: systemPrompt
          },
          {
            role: 'user',
            content: contentParts
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
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
