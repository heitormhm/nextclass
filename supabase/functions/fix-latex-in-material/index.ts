import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ✅ Copy of LaTeX sanitization patterns from latex-sanitizer.ts
function applyLatexFixes(markdown: string): string {
  console.log('[fix-latex-in-material] 🔧 Starting LaTeX sanitization...');
  
  let passCount = 0;
  let previousMarkdown = '';
  const maxPasses = 3;
  
  while (passCount < maxPasses && markdown !== previousMarkdown) {
    previousMarkdown = markdown;
    passCount++;
    console.log(`[fix-latex-in-material] 📝 Pass ${passCount}/${maxPasses}`);
    
    // Pattern 1: Merge consecutive dollar delimiters (e.g., "$...$...$" → "$...$")
    const pattern1Before = markdown.length;
    markdown = markdown.replace(
      /\$\s*([^$]+?)\s*\$\s*([^$\n]{1,30}?)\s*\$/g,
      '$ $1 $2 $'
    );
    const pattern1Fixed = pattern1Before - markdown.length;
    if (pattern1Fixed > 0) {
      console.log(`[fix-latex-in-material] ✅ Pattern 1: Merged ${pattern1Fixed} consecutive delimiters`);
    }
    
    // Pattern 2: Wrap orphaned \dot commands (e.g., "\dot{Q}" → "$ \dot{Q} $")
    const pattern2Before = markdown.length;
    markdown = markdown.replace(
      /(?<!\$)\s*\\dot\{([QWmVPTHSUFABCDEGLNRXYZqwvpthsuabcdefglnrxyz])\}(?!\s*\$)/g,
      ' $ \\dot{$1} $ '
    );
    const pattern2Fixed = markdown.length - pattern2Before;
    if (pattern2Fixed > 0) {
      console.log(`[fix-latex-in-material] ✅ Pattern 2: Wrapped ${pattern2Fixed / 10} orphaned \\dot commands`);
    }
    
    // Pattern 3: Fix fragmented \frac (e.g., "$\frac{1}{2}$(...)" → "$\frac{1}{2}(...) $")
    const pattern3Before = markdown.length;
    markdown = markdown.replace(
      /\$\s*(\\frac\{[^}]+\}\{[^}]+\})\s*\$\s*\(([^)]{1,50})\)/g,
      '$ $1 ($2) $'
    );
    const pattern3Fixed = pattern3Before - markdown.length;
    if (pattern3Fixed > 0) {
      console.log(`[fix-latex-in-material] ✅ Pattern 3: Fixed ${pattern3Fixed} fragmented \\frac`);
    }
  }
  
  console.log(`[fix-latex-in-material] ✅ LaTeX sanitization complete (${passCount} passes)`);
  return markdown;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { lectureId } = await req.json();
    
    if (!lectureId) {
      throw new Error('lectureId is required');
    }

    console.log(`[fix-latex-in-material] 📥 Processing lecture ${lectureId}`);

    // Fetch current material
    const { data: lecture, error: fetchError } = await supabase
      .from('lectures')
      .select('structured_content')
      .eq('id', lectureId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch lecture: ${fetchError.message}`);
    }

    if (!lecture?.structured_content?.material_didatico) {
      throw new Error('No material_didatico found in structured_content');
    }

    const originalMaterial = lecture.structured_content.material_didatico;
    console.log(`[fix-latex-in-material] 📄 Original material length: ${originalMaterial.length} chars`);

    // Apply LaTeX fixes
    const fixedMaterial = applyLatexFixes(originalMaterial);
    const changesMade = originalMaterial !== fixedMaterial;
    
    if (!changesMade) {
      console.log('[fix-latex-in-material] ℹ️ No LaTeX fixes needed');
      return new Response(
        JSON.stringify({ 
          success: true, 
          changesMade: false,
          message: 'Material already clean - no LaTeX fixes needed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[fix-latex-in-material] 💾 Saving fixed material (${fixedMaterial.length} chars)...`);

    // Update database
    const { error: updateError } = await supabase
      .from('lectures')
      .update({
        structured_content: {
          ...lecture.structured_content,
          material_didatico: fixedMaterial
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', lectureId);

    if (updateError) {
      throw new Error(`Failed to update lecture: ${updateError.message}`);
    }

    console.log('[fix-latex-in-material] ✅ Material updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        changesMade: true,
        originalLength: originalMaterial.length,
        fixedLength: fixedMaterial.length,
        message: 'LaTeX fixes applied successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[fix-latex-in-material] ❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
