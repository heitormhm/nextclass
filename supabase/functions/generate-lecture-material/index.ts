/**
 * Lecture Material Generation - Direct Markdown Output
 * Generates rich markdown content for frontend rendering
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { createSystemPrompt, createUserPrompt } from './prompts.ts';

/**
 * ✅ PHASE 3: Reference validation (copied from teacher-job-runner)
 * Validates academic quality of references and blocks banned sources
 */
interface ReferenceValidationResult {
  valid: boolean;
  academicPercentage: number;
  bannedCount: number;
  errors: string[];
}

function validateReferences(markdown: string): ReferenceValidationResult {
  console.log('[References Validator] 🔍 Checking reference quality...');
  
  const refSection = markdown.match(/##\s*(\d+\.)?\s*(Fontes e )?Refer[eê]ncias.*?\n\n(.+?)$/s)?.[3] || 
                     markdown.match(/##\s*(\d+\.)?\s*Bibliograf[ií]a.*?\n\n(.+?)$/s)?.[2] || '';
  
  if (!refSection || refSection.trim().length < 50) {
    console.warn('[References Validator] ⚠️ No reference section found, approving by default');
    return { 
      valid: true,
      academicPercentage: 0, 
      bannedCount: 0,
      errors: ['Seção de referências não encontrada (aprovado por padrão)'] 
    };
  }
  
  const allRefs = refSection.match(/\[\d+\].+/g) || [];
  console.log(`[References Validator] Extracted ${allRefs.length} references`);
  
  if (allRefs.length < 3) {
    return { 
      valid: false, 
      academicPercentage: 0,
      bannedCount: 0, 
      errors: [`Menos de 3 referências fornecidas (encontradas: ${allRefs.length})`] 
    };
  }
  
  const bannedDomains = [
    'brasilescola.uol.com.br',
    'mundoeducacao.uol.com.br',
    'todamateria.com.br',
    'wikipedia.org', 'pt.wikipedia.org', 'en.wikipedia.org',
    'infoescola.com',
    'soescola.com',
    'escolakids.uol.com.br',
    'educacao.uol.com.br',
    'blogspot.com',
    'wordpress.com',
    'uol.com.br/educacao',
    'youtube.com', 'youtu.be',
    'facebook.com', 'instagram.com',
    'quora.com', 'answers.yahoo.com',
    'brainly.com', 'brainly.com.br',
    'quizlet.com', 'chegg.com',
    'studocu.com', 'docsity.com',
    'passeiweb.com', 'coladaweb.com', 'suapesquisa.com'
  ];
  
  const academicDomains = [
    '.edu', '.edu.br', '.ac.uk', '.ac.br',
    '.gov', '.gov.br', '.gov.uk',
    'scielo.org', 'scielo.br',
    'journals.', 'journal.',
    'pubmed', 'ncbi.nlm.nih.gov',
    'springer.com', 'springerlink.com',
    'elsevier.com', 'sciencedirect.com',
    'wiley.com', 'nature.com', 'science.org',
    'researchgate.net', 'academia.edu',
    'ieee.org', 'ieeexplore.ieee.org',
    'acm.org', 'doi.org'
  ];
  
  let bannedCount = 0;
  let academicCount = 0;
  const errors: string[] = [];
  
  allRefs.forEach((ref, idx) => {
    const isBanned = bannedDomains.some(domain => ref.includes(domain));
    const isAcademic = academicDomains.some(domain => ref.includes(domain));
    
    if (isBanned) {
      bannedCount++;
      errors.push(`Referência [${idx + 1}] é de fonte banida: ${ref.substring(0, 80)}...`);
    }
    
    if (isAcademic) academicCount++;
  });
  
  const academicPercentage = (academicCount / allRefs.length) * 100;
  const MAX_BANNED_COUNT = 0; // ✅ PHASE 4: Zero tolerance for banned sources
  const isValid = bannedCount <= MAX_BANNED_COUNT;
  
  if (!isValid) {
    errors.push(`REJECTED: ${bannedCount} fontes banidas (máx: ${MAX_BANNED_COUNT})`);
  }
  
  console.log(`[References] ${academicCount}/${allRefs.length} academic (${academicPercentage.toFixed(0)}%), ${bannedCount} banned (max: ${MAX_BANNED_COUNT})`);
  
  return { 
    valid: isValid, 
    academicPercentage,
    bannedCount, 
    errors 
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Clean HTML artifacts from Mermaid blocks
 */
function cleanMermaidBlocks(markdown: string): string {
  const mermaidBlockRegex = /```mermaid\n([\s\S]*?)```/g;
  
  return markdown.replace(mermaidBlockRegex, (match, code) => {
    // Remove HTML tags and entities from mermaid code
    const cleaned = code
      .replace(/<[^>]+>/g, '') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ') // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\r\n/g, '\n') // Normalize line endings
      .trim();
    
    console.log('[Mermaid Cleanup] Block cleaned:', {
      originalLength: code.length,
      cleanedLength: cleaned.length,
      hadHTML: /<[^>]+>/.test(code)
    });
    
    return '```mermaid\n' + cleaned + '\n```';
  });
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

    // STEP 1: Brave Search - ✅ PHASE 4: Prioritize engineering books
    console.log('[generate-lecture-material] Step 1: Academic research...');
    
    // ✅ PHASE 4: Engineering-focused sources with explicit bans
    const PREFERRED_SOURCES = [
      'site:springer.com', 'site:wiley.com', 'site:elsevier.com',
      'site:ieeexplore.ieee.org', 'site:.edu.br',
      'site:scielo.br', 'site:nature.com', 'site:science.org',
      'filetype:pdf'
    ];

    const academicQuery = `${lectureTitle} ${tags.join(' ')} engineering textbook (${PREFERRED_SOURCES.slice(0, 5).join(' OR ')}) -site:wikipedia.org -site:brasilescola.com -site:brainly.com`;
    const backupQuery = `${lectureTitle} engineering education ${tags.slice(0, 2).join(' ')} site:.edu.br OR site:springer.com OR site:wiley.com -site:wikipedia.org -site:brasilescola.com`;

    console.log('[generate-lecture-material] Academic query:', academicQuery);
    const braveApiKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
    
    let searchResults = '';
    
    if (braveApiKey) {
      // Primary search: Academic sources
      const academicSearch = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(academicQuery)}&count=5`,
        { headers: { 'X-Subscription-Token': braveApiKey } }
      );

      if (academicSearch.ok) {
        const academicData = await academicSearch.json();
        const academicResults = academicData.web?.results || [];
        
        console.log('[Search] Academic results:', academicResults.length);
        
        // Backup search if insufficient academic results
        if (academicResults.length < 3) {
          console.log('[Search] Backup search triggered');
          const backupSearch = await fetch(
            `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(backupQuery)}&count=5`,
            { headers: { 'X-Subscription-Token': braveApiKey } }
          );
          
          if (backupSearch.ok) {
            const backupData = await backupSearch.json();
            const backupResults = backupData.web?.results || [];
            searchResults = [...academicResults, ...backupResults]
              .slice(0, 8)
              .map((r: any, i: number) => `[${i + 1}] ${r.title}\n${r.description}\nURL: ${r.url}\n`)
              .join('\n\n');
          }
        } else {
          searchResults = academicResults
            .map((r: any, i: number) => `[${i + 1}] ${r.title}\n${r.description}\nURL: ${r.url}\n`)
            .join('\n\n');
        }
      }
    }

    if (!searchResults) {
      searchResults = `Material gerado a partir do conteúdo da aula: ${lectureTitle}`;
    }
    
    console.log('[Search] Results length:', searchResults.length);

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

    // STEP 3: Clean Mermaid blocks and prepare content
    console.log('[generate-lecture-material] Step 3: Preparing content...');
    let markdownContent = cleanMermaidBlocks(generatedMarkdown);
    
    // DIAGNOSTIC: Verify markdown format
    const mermaidBlocks = markdownContent.match(/```mermaid/g);
    console.log('[generate-lecture-material] Markdown validation:', {
      length: markdownContent.length,
      hasHTMLTags: /<[^>]+>/.test(markdownContent),
      hasMarkdownHeadings: /^#{1,6}\s/m.test(markdownContent),
      hasReferencesSection: /#{1,2}\s*Referências/i.test(markdownContent),
      hasMermaidBlocks: !!mermaidBlocks,
      mermaidBlockCount: mermaidBlocks?.length || 0,
      sample: markdownContent.substring(0, 300)
    });

    // ✅ PHASE 3: Validate references quality
    console.log('[generate-lecture-material] Step 3.5: Validating references...');
    
    const refValidation = validateReferences(markdownContent);
    
    if (!refValidation.valid) {
      console.error('[generate-lecture-material] ❌ References validation failed:', refValidation.errors);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Referências com qualidade insuficiente. Fontes não confiáveis detectadas.',
          details: refValidation.errors,
          bannedCount: refValidation.bannedCount
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('[generate-lecture-material] ✅ References validated:', {
      academicPercentage: refValidation.academicPercentage.toFixed(1) + '%',
      bannedCount: refValidation.bannedCount
    });

    // STEP 4: Save to database (store markdown, not HTML)
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
          material_didatico_html: markdownContent,
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
        markdownLength: markdownContent.length,
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
