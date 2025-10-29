import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Validates Mermaid syntax: checks arrow-to-node ratio
 */
function validateMermaidBlock(code: string): boolean {
  const nodeCount = (code.match(/\[([^\]]+)\]/g) || []).length;
  const arrowCount = (code.match(/(-->|---|==>|->)/g) || []).length;
  const minArrows = Math.max(1, nodeCount - 1);
  
  console.log(`[validate] Nodes: ${nodeCount}, Arrows: ${arrowCount}, Min: ${minArrows}`);
  return arrowCount >= minArrows;
}

/**
 * Removes broken Mermaid blocks from markdown
 */
function removeBrokenMermaid(markdown: string): { fixed: string; removed: number } {
  let removed = 0;
  
  const fixed = markdown.replace(
    /(```mermaid\n[\s\S]*?```)/g,
    (mermaidBlock) => {
      // Extract code without fences
      const code = mermaidBlock.replace(/```mermaid\n|```$/g, '').trim();
      
      if (!validateMermaidBlock(code)) {
        console.log(`[remove-broken-mermaid] ❌ Removing broken block`);
        removed++;
        return ''; // Remove the entire block
      }
      
      return mermaidBlock; // Keep valid block
    }
  );
  
  return { fixed, removed };
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

    console.log(`[remove-broken-mermaid] 📥 Processing lecture ${lectureId}`);

    // Fetch current material
    const { data: lecture, error: fetchError } = await supabase
      .from('lectures')
      .select('structured_content')
      .eq('id', lectureId)
      .single();

    if (fetchError || !lecture?.structured_content?.material_didatico) {
      throw new Error('Failed to fetch material');
    }

    const originalMaterial = lecture.structured_content.material_didatico;
    const { fixed: fixedMaterial, removed } = removeBrokenMermaid(originalMaterial);
    const changesMade = originalMaterial !== fixedMaterial;
    
    if (!changesMade) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          changesMade: false,
          message: 'No broken Mermaid blocks found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    if (updateError) throw new Error(updateError.message);

    console.log(`[remove-broken-mermaid] ✅ Removed ${removed} broken blocks`);

    return new Response(
      JSON.stringify({ 
        success: true,
        changesMade: true,
        blocksRemoved: removed,
        originalLength: originalMaterial.length,
        fixedLength: fixedMaterial.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[remove-broken-mermaid] ❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
