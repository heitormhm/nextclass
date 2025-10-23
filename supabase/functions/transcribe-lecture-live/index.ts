import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audio, previousContext } = await req.json();
    
    if (!audio) throw new Error('No audio data provided');

    console.log('[LIVE-TRANSCRIBE] Processing audio chunk...');

    // Convert base64 to binary using native decoding
    let binaryAudio: Uint8Array;
    try {
      binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
      
      if (binaryAudio.length === 0) {
        throw new Error('Empty audio data after decoding');
      }
      
      console.log('[LIVE-TRANSCRIBE] Audio decoded:', {
        size: (binaryAudio.length / 1024).toFixed(2) + ' KB'
      });
    } catch (decodeError) {
      console.error('[LIVE-TRANSCRIBE] Base64 decode error:', decodeError);
      throw new Error('Failed to decode audio data');
    }
    
    // 1. Transcrever com OpenAI Whisper (especializado em áudio)
    const formData = new FormData();
    const blob = new Blob([binaryAudio as any], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');
    formData.append('response_format', 'verbose_json');
    formData.append('temperature', '0');
    formData.append('timestamp_granularities[]', 'word');

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAIApiKey}` },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('[LIVE-TRANSCRIBE] Whisper error:', errorText);
      throw new Error('Whisper transcription failed');
    }
    
    const whisperResult = await whisperResponse.json();
    const transcribedText = whisperResult.text;
    const segments = whisperResult.segments || [];

    // 2. Usar Lovable AI (Gemini Flash) para análise de locutor
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const analysisPrompt = `Você é um assistente especializado em análise de transcrições de aulas.

Contexto anterior: ${previousContext || 'Início da aula'}

Nova transcrição: "${transcribedText}"

Analise e retorne APENAS um JSON válido (sem markdown):
{
  "speaker": "Professor" ou "Aluno",
  "words": [
    { "text": "palavra1", "confidence": 0.95, "start": 0.0, "end": 0.5 }
  ],
  "summary": "Resumo do que foi dito"
}

Critérios:
- "Professor" se discurso formal, explicativo, uso de termos técnicos
- "Aluno" se pergunta, linguagem informal, dúvida
- Divida o texto em palavras individuais com timestamps estimados
- Confidence baseado na clareza do contexto`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você analisa transcrições de aulas e identifica locutores. Retorne APENAS JSON válido sem markdown.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[LIVE-TRANSCRIBE] AI error:', errorText);
      throw new Error('AI analysis failed');
    }

    const aiResult = await aiResponse.json();
    const analysisText = aiResult.choices[0].message.content;
    
    // Parse JSON (com fallback)
    let analysis;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
    } catch (e) {
      console.warn('[LIVE-TRANSCRIBE] Failed to parse AI response, using fallback:', e);
      
      // Dividir texto em palavras manualmente como fallback
      const words = transcribedText.split(/\s+/).map((word: string, idx: number) => ({
        text: word,
        confidence: 0.85,
        start: idx * 0.5,
        end: (idx + 1) * 0.5
      }));
      
      analysis = {
        speaker: 'Professor',
        words: words,
        summary: transcribedText
      };
    }

    console.log('[LIVE-TRANSCRIBE] Success:', {
      speaker: analysis.speaker,
      wordCount: analysis.words?.length || 0
    });

    return new Response(
      JSON.stringify({
        text: transcribedText,
        speaker: analysis.speaker || 'Professor',
        words: analysis.words || [],
        summary: analysis.summary || transcribedText,
        segments: segments
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[LIVE-TRANSCRIBE] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
