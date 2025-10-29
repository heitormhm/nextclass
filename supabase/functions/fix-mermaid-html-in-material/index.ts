import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Removes HTML tags from Mermaid blocks in markdown
 * @param markdown - The markdown content containing Mermaid blocks
 * @returns Cleaned markdown with HTML removed from Mermaid blocks
 */
function removeMermaidHTML(markdown: string): string {
  console.log('[fix-mermaid-html] 🧹 Removing HTML from Mermaid blocks...');
  
  // Match all Mermaid blocks and remove HTML tags
  const fixed = markdown.replace(
    /(```mermaid[\s\S]*?```)/g,
    (mermaidBlock) => {
      const originalLength = mermaidBlock.length;
      
      // Remove <br/>, <br>, and all other HTML tags
      const cleaned = mermaidBlock
        .replace(/<br\s*\/?>/gi, ' ')  // Replace <br/> with space
        .replace(/<sup>([^<]+)<\/sup>/gi, '^$1')  // Convert <sup> to ^
        .replace(/<sub>([^<]+)<\/sub>/gi, '_$1')  // Convert <sub> to _
        .replace(/<\/?[^>]+(>|$)/g, '');  // Remove all other HTML
      
      const removed = originalLength - cleaned.length;
      if (removed > 0) {
        console.log(`[fix-mermaid-html] ✅ Removed ${removed} chars of HTML from Mermaid block`);
      }
      
      return cleaned;
    }
  );
  
  const totalBlocks = (markdown.match(/```mermaid/g) || []).length;
  console.log(`[fix-mermaid-html] 📊 Processed ${totalBlocks} Mermaid blocks`);
  
  return fixed;
}

serve(async (req) => {
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

    console.log(`[fix-mermaid-html] 📥 Processing lecture ${lectureId}`);

    // Fetch current material
    const { data: lecture, error: fetchError } = await supabase
      .from('lectures')
      .select('structured_content')
      .eq('id', lectureId)
      .single();

    if (fetchError || !lecture?.structured_content?.material_didatico) {
      throw new Error(`Failed to fetch material: ${fetchError?.message || 'No material found'}`);
    }

    const originalMaterial = lecture.structured_content.material_didatico;
    console.log(`[fix-mermaid-html] 📄 Original length: ${originalMaterial.length} chars`);
    
    const fixedMaterial = removeMermaidHTML(originalMaterial);
    const changesMade = originalMaterial !== fixedMaterial;
    
    if (!changesMade) {
      console.log('[fix-mermaid-html] ℹ️ No HTML found in Mermaid blocks - no changes needed');
      return new Response(
        JSON.stringify({ 
          success: true, 
          changesMade: false,
          message: 'No HTML found in Mermaid blocks'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[fix-mermaid-html] 📝 Fixed length: ${fixedMaterial.length} chars (Δ ${fixedMaterial.length - originalMaterial.length})`);

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
      throw new Error(`Failed to update database: ${updateError.message}`);
    }

    console.log('[fix-mermaid-html] ✅ Successfully updated database');

    return new Response(
      JSON.stringify({ 
        success: true,
        changesMade: true,
        originalLength: originalMaterial.length,
        fixedLength: fixedMaterial.length,
        charsRemoved: originalMaterial.length - fixedMaterial.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[fix-mermaid-html] ❌ Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
