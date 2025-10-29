import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AGGRESSIVE NON-DESTRUCTIVE Mermaid diagram sanitization
function validateAndFixMermaidDiagrams(markdown: string): string {
  console.log('[format-lecture-content] Starting NON-DESTRUCTIVE validation with AGGRESSIVE fixes...');
  
  const mermaidBlockRegex = /```mermaid\s*\n([\s\S]*?)```/g;
  
  let cleanedMarkdown = markdown;
  let blocksFound = 0;
  let blocksFixed = 0;
  let blocksKept = 0;
  
  cleanedMarkdown = cleanedMarkdown.replace(mermaidBlockRegex, (match, code) => {
    blocksFound++;
    const originalCode = code;
    let fixedCode = code;
    
    // FIX PHASE 1: Unicode arrows replacement (ALWAYS APPLY)
    fixedCode = fixedCode
      .replace(/→/g, '-->')
      .replace(/←/g, '<--')
      .replace(/↔/g, '<-->')
      .replace(/⇒/g, '==>')
      .replace(/⇐/g, '<==')
      .replace(/⇔/g, '<=>');
    
    // FIX PHASE 2: Greek letters replacement GLOBALLY (not just in labels)
    fixedCode = fixedCode
      .replace(/Δ|∆/g, 'Delta')
      .replace(/Ω/g, 'Omega')
      .replace(/Σ/g, 'Sigma')
      .replace(/α/g, 'alpha')
      .replace(/β/g, 'beta')
      .replace(/γ/g, 'gamma')
      .replace(/θ/g, 'theta')
      .replace(/λ/g, 'lambda')
      .replace(/μ/g, 'mu')
      .replace(/π/g, 'pi')
      .replace(/σ/g, 'sigma')
      .replace(/ω/g, 'omega');
    
    // FIX PHASE 3: Clean problematic chars in labels
    fixedCode = fixedCode.replace(/(\[[^\]]+\])/g, (label: string) => {
      let cleanedLabel = label;
      
      // Remove HTML-problematic chars
      cleanedLabel = cleanedLabel.replace(/[<>"'&]/g, '');
      
      // Simplify formulas (detect common patterns)
      if (cleanedLabel.match(/[\/\^²³⁴⁵⁶⁷⁸⁹⁰]/)) {
        // Extract key terms before replacing
        const terms = cleanedLabel.match(/[A-Z][a-z]*/g);
        if (terms && terms.length > 0) {
          return `[${terms.join(' ')}]`;
        }
        return '[Formula]';
      }
      
      // Remove parentheses (can break Mermaid syntax)
      cleanedLabel = cleanedLabel.replace(/\(/g, '').replace(/\)/g, '');
      
      return cleanedLabel;
    });
    
    // FIX PHASE 4: Remove mathematical symbols and superscripts/subscripts
    fixedCode = fixedCode
      .replace(/[²³⁴⁵⁶⁷⁸⁹⁰₀₁₂₃₄₅₆₇₈₉]/g, '')
      .replace(/[×÷±≈≠≤≥∞∫∂∑∏√]/g, ' ')
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
    
    // VALIDATION: Minimum length
    if (fixedCode.trim().length < 20) {
      console.warn(`[format-lecture-content] Block ${blocksFound} too short (${fixedCode.length} chars) - KEEPING with comment`);
      return `\`\`\`mermaid\n${fixedCode}\n\`\`\``;
    }
    
    // VALIDATION: Valid diagram type (try to auto-fix if missing)
    const validTypes = /^(flowchart|graph|sequenceDiagram|stateDiagram-v2|classDiagram|gantt|mindmap)/m;
    if (!validTypes.test(fixedCode)) {
      console.warn(`[format-lecture-content] Block ${blocksFound} has invalid type - AUTO-FIXING`);
      
      // Try to detect intent from keywords
      if (fixedCode.includes('sequenceDiagram') || fixedCode.match(/participant|actor/i)) {
        // Already has sequenceDiagram, just needs formatting
        fixedCode = fixedCode.replace(/^[\s\S]*?(sequenceDiagram)/m, 'sequenceDiagram');
      } else {
        // Default to flowchart
        fixedCode = `flowchart TD\n${fixedCode}`;
      }
      blocksFixed++;
    }
    
    // FIX PHASE 5: Remove HTML tags that might have leaked
    fixedCode = fixedCode.replace(/<[^>]*>/g, '');
    
    // FIX PHASE 6: CRITICAL - Remove subgraph blocks (cause infinite loading)
    if (fixedCode.includes('subgraph')) {
      console.warn(`[format-lecture-content] Block ${blocksFound} contains FORBIDDEN subgraph - FLATTENING`);
      
      // Extract content inside subgraph and flatten it
      fixedCode = fixedCode.replace(/subgraph\s+[^\n]*\n([\s\S]*?)\n\s*end/g, (_match: string, content: string) => {
        // Remove the subgraph wrapper but keep the nodes/edges inside
        return content.trim();
      });
      
      blocksFixed++;
    }
    
    // SUCCESS LOGGING
    if (fixedCode !== originalCode) {
      console.log(`[format-lecture-content] Block ${blocksFound} AGGRESSIVELY FIXED ✅`);
      console.log(`  Original length: ${originalCode.length} → Fixed length: ${fixedCode.length}`);
      blocksFixed++;
    } else {
      console.log(`[format-lecture-content] Block ${blocksFound} already valid ✅`);
    }
    
    blocksKept++;
    return `\`\`\`mermaid\n${fixedCode}\n\`\`\``;
  });
  
  console.log(`[format-lecture-content] ✅ NON-DESTRUCTIVE Summary: ${blocksFound} found, ${blocksFixed} fixed, ${blocksKept} kept (0 removed)`);
  
  // FINAL CLEANUP: Remove excessive newlines left by block processing
  cleanedMarkdown = cleanedMarkdown
    .replace(/\n{4,}/g, '\n\n\n')  // Max 3 newlines (section break)
    .replace(/\n{3,}(#{1,6}\s)/g, '\n\n$1')  // 2 newlines before headers
    .trim();
  
  console.log(`[format-lecture-content] ✅ Text spacing normalized`);
  
  return cleanedMarkdown;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { markdown } = await req.json();
    
    if (!markdown || typeof markdown !== 'string') {
      throw new Error('markdown is required and must be a string');
    }
    
    console.log('[format-lecture-content] Processing markdown with Mermaid diagrams...');
    console.log(`[format-lecture-content] Input length: ${markdown.length} chars`);
    
    // Validate and fix Mermaid diagrams
    const cleanedMarkdown = validateAndFixMermaidDiagrams(markdown);
    
    console.log(`[format-lecture-content] Output length: ${cleanedMarkdown.length} chars`);
    console.log('[format-lecture-content] ✅ Processing complete');
    
    return new Response(
      JSON.stringify({ 
        success: true,
        cleanedMarkdown 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[format-lecture-content] ❌ Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
