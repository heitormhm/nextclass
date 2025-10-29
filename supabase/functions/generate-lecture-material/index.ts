/**
 * PHASE 1: New Direct-Call Material Generation
 * No jobs table, no polling - instant feedback
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { createSystemPrompt, createUserPrompt } from './prompts.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple markdown to HTML converter
function convertMarkdownToHTML(markdown: string): string {
  let html = markdown;
  
  // Headers
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  
  // Bold and italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Lists
  html = html.replace(/^\* (.*$)/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  
  // Code blocks
  html = html.replace(/```mermaid\n([\s\S]*?)```/g, '<pre class="mermaid">$1</pre>');
  html = html.replace(/```(.*?)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  return html;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId, lectureTitle, tags = [] } = await req.json();
    
    console.log('[generate-lecture-material] Starting generation:', {
      lectureId,
      lectureTitle,
      tags: tags.length
    });

    if (!lectureId || !lectureTitle) {
      throw new Error('lectureId and lectureTitle are required');
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get teacher info
    const { data: lecture } = await supabase
      .from('lectures')
      .select('teacher_id, teachers(nome_completo)')
      .eq('id', lectureId)
      .single();

    const teacherName = lecture?.teachers?.nome_completo || 'Professor';

    // STEP 1: Brave Search (simplified - single query)
    console.log('[generate-lecture-material] Step 1: Academic research...');
    
    const searchQuery = `${lectureTitle} ${tags.join(' ')} engineering academic`;
    const braveApiKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
    
    let searchResults = '';
    
    if (braveApiKey) {
      const searchResponse = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=8`,
        {
          headers: { 'X-Subscription-Token': braveApiKey }
        }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        searchResults = searchData.web?.results
          ?.map((r: any, i: number) => 
            `[${i + 1}] ${r.title}\n${r.description}\nURL: ${r.url}\n`
          )
          .join('\n\n') || '';
      }
    }

    if (!searchResults) {
      searchResults = `Material gerado a partir do conteúdo da aula: ${lectureTitle}`;
    }

    // STEP 2: Generate content with Lovable AI
    console.log('[generate-lecture-material] Step 2: Generating content...');
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = createSystemPrompt(teacherName, lectureTitle);
    const userPrompt = createUserPrompt(lectureTitle, searchResults);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        temperature: 0.7,
        max_tokens: 16000,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedMarkdown = aiData.choices?.[0]?.message?.content;

    if (!generatedMarkdown) {
      throw new Error('No content generated from AI');
    }

    console.log('[generate-lecture-material] Generated:', generatedMarkdown.length, 'chars');

    // STEP 3: Convert to HTML
    console.log('[generate-lecture-material] Step 3: Converting to HTML...');
    const htmlContent = convertMarkdownToHTML(generatedMarkdown);

    // STEP 4: Save to database
    console.log('[generate-lecture-material] Step 4: Saving to database...');
    
    const { data: existingLecture } = await supabase
      .from('lectures')
      .select('structured_content')
      .eq('id', lectureId)
      .single();

    const existingContent = existingLecture?.structured_content || {};

    const { error: updateError } = await supabase
      .from('lectures')
      .update({
        structured_content: {
          ...existingContent,
          material_didatico_html: htmlContent,
          titulo_aula: lectureTitle
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', lectureId);

    if (updateError) {
      throw updateError;
    }

    console.log('[generate-lecture-material] ✅ Success!');

    return new Response(
      JSON.stringify({ 
        success: true,
        htmlLength: htmlContent.length,
        message: 'Material gerado com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-lecture-material] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
