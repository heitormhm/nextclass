/**
 * ==========================================
 * FIX MERMAID LATEX - Emergency Fix Tool
 * ==========================================
 * 
 * Converts single $ to $$ in Mermaid diagram labels in existing database records
 * This fixes rendering issues where Mermaid labels contain LaTeX formulas
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Converts $ → $$ in Mermaid labels WITHOUT using lookbehind regex
 * Compatible with Deno (no lookbehind support in V8)
 */
function fixMermaidLatexInMarkdown(markdown: string): string {
  console.log('[Fix] Starting AGGRESSIVE $ → $$ conversion in Mermaid labels...');
  
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  let blocksProcessed = 0;
  let conversionsCount = 0;
  
  const fixed = markdown.replace(mermaidRegex, (fullMatch, diagramContent) => {
    blocksProcessed++;
    
    // Process ALL quoted labels within the diagram
    const processedContent = diagramContent.replace(/\[(".*?")\]/gs, (labelMatch: string, quotedContent: string) => {
      let innerContent = quotedContent.slice(1, -1); // Remove quotes
      const originalLength = innerContent.length;
      
      // Step 1: Protect existing $$ with placeholders
      innerContent = innerContent.replace(/\$\$/g, '___PROTECTED_DOUBLE___');
      
      // Step 2: Convert single $ → $$
      innerContent = innerContent.replace(/\$([^\$]+?)\$/g, (match: string, formula: string) => {
        conversionsCount++;
        console.log(`[Fix] 💱 Converting: $${formula}$ → $$${formula}$$`);
        return `$$${formula}$$`;
      });
      
      // Step 3: Restore protected $$
      innerContent = innerContent.replace(/___PROTECTED_DOUBLE___/g, '$$');
      
      if (innerContent.length !== originalLength) {
        console.log(`[Fix] Block ${blocksProcessed} converted label (${originalLength} → ${innerContent.length} chars)`);
      }
      
      return `["${innerContent}"]`;
    });
    
    return `\`\`\`mermaid\n${processedContent}\`\`\``;
  });
  
  console.log(`[Fix] ✅ Processed ${blocksProcessed} Mermaid blocks`);
  console.log(`[Fix] ✅ Total conversions: ${conversionsCount}`);
  
  return fixed;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId } = await req.json();
    
    if (!lectureId) {
      throw new Error('lectureId is required');
    }
    
    console.log(`[Fix] Processing lecture: ${lectureId}`);
    
    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch current material
    const { data: lecture, error: fetchError } = await supabase
      .from('lectures')
      .select('material_didatico_v2')
      .eq('id', lectureId)
      .single();
    
    if (fetchError) {
      throw new Error(`Failed to fetch lecture: ${fetchError.message}`);
    }
    
    if (!lecture?.material_didatico_v2) {
      throw new Error('No material_didatico_v2 found for this lecture');
    }
    
    const originalMarkdown = lecture.material_didatico_v2;
    console.log(`[Fix] Original markdown length: ${originalMarkdown.length} chars`);
    
    // Check if fix is needed
    const hasSingleDollarInLabels = /\["[^"]*(?<!\$)\$(?!\$)[^"]*"\]/gs.test(originalMarkdown);
    
    if (!hasSingleDollarInLabels) {
      console.log('[Fix] ✅ No single $ found in labels - material is already correct');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Material already has correct LaTeX syntax',
          conversions: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[Fix] ⚠️ Single $ detected in labels - applying fix...');
    
    // Apply fix
    const fixedMarkdown = fixMermaidLatexInMarkdown(originalMarkdown);
    
    console.log(`[Fix] Fixed markdown length: ${fixedMarkdown.length} chars`);
    
    // Validate fix didn't break anything (length should be similar)
    const lengthRatio = fixedMarkdown.length / originalMarkdown.length;
    if (lengthRatio < 0.95 || lengthRatio > 1.1) {
      throw new Error(`Fix resulted in suspicious length change: ${lengthRatio.toFixed(2)}x original`);
    }
    
    // Update database
    const { error: updateError } = await supabase
      .from('lectures')
      .update({ 
        material_didatico_v2: fixedMarkdown,
        updated_at: new Date().toISOString()
      })
      .eq('id', lectureId);
    
    if (updateError) {
      throw new Error(`Failed to update lecture: ${updateError.message}`);
    }
    
    console.log('[Fix] ✅ Database updated successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'LaTeX syntax fixed successfully',
        originalLength: originalMarkdown.length,
        fixedLength: fixedMarkdown.length,
        lengthRatio: lengthRatio.toFixed(3)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('[Fix] ❌ Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
