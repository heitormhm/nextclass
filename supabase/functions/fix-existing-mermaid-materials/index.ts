/**
 * ==========================================
 * ✅ SOLUÇÃO 4: FIX EXISTING MERMAID MATERIALS
 * ==========================================
 * 
 * Edge function para corrigir materiais existentes no banco de dados
 * que foram gerados com $ simples ao invés de $$ em labels Mermaid
 * 
 * SCOPE: Apenas blocos ```mermaid, apenas dentro de labels ["..."]
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Deno-compatible $ → $$ conversion in Mermaid labels
 * Uses placeholder approach to avoid lookbehind regex
 */
function fixMermaidLatexInMarkdown(markdown: string): string {
  console.log('[Fix] Starting $ → $$ conversion (Deno-compatible)...');
  
  let conversions = 0;
  
  const fixed = markdown.replace(/```mermaid\n([\s\S]*?)```/g, (fullMatch, diagramContent) => {
    const processedContent = diagramContent.replace(/\[(".*?")\]/gs, (labelMatch: string, quotedContent: string) => {
      let inner = quotedContent.slice(1, -1);
      
      // ✅ DENO-COMPATIBLE: Placeholder approach
      // 1. Protect existing $$
      inner = inner.replace(/\$\$/g, '___PROTECTED___');
      
      // 2. Convert $ simples → $$
      const before = inner;
      inner = inner.replace(/\$([^\$]+?)\$/g, (match, formula) => {
        conversions++;
        console.log(`  💱 $${formula}$ → $$${formula}$$`);
        return `$$${formula}$$`;
      });
      
      // 3. Restore $$
      inner = inner.replace(/___PROTECTED___/g, '$$');
      
      if (inner !== before) {
        console.log(`  ✅ Label converted: "${before.substring(0, 40)}..."`);
      }
      
      return `["${inner}"]`;
    });
    
    return `\`\`\`mermaid\n${processedContent}\`\`\``;
  });
  
  console.log(`[Fix] ✅ Total conversions: ${conversions}`);
  
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
    
    // Check if fix is needed (detect $ simples in Mermaid labels)
    const hasSingleDollarInLabels = /```mermaid[\s\S]*?\["[^"]*\$(?!\$)[^"]*"\][\s\S]*?```/g.test(originalMarkdown);
    
    if (!hasSingleDollarInLabels) {
      console.log('[Fix] ✅ No single $ found in labels - material is already correct');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Material já está correto - nenhum $ simples detectado em labels',
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
    if (lengthRatio < 0.95 || lengthRatio > 1.15) {
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
        message: 'Material corrigido com sucesso - $ convertidos para $$ em labels Mermaid',
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
