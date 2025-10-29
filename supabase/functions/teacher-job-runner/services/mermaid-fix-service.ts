/**
 * Mermaid Fix Service
 * Uses AI edge function to fix broken Mermaid diagram syntax
 */

export async function fixMermaidBlocksWithAI(
  markdown: string,
  supabase: any,
  jobId: string
): Promise<string> {
  let fixedMarkdown = markdown;
  const mermaidBlocks = markdown.match(/```mermaid\n([\s\S]*?)```/g) || [];
  
  console.log(`[Job ${jobId}] [Mermaid AI] Found ${mermaidBlocks.length} Mermaid blocks to check`);
  
  let fixedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  
  for (let i = 0; i < mermaidBlocks.length; i++) {
    const block = mermaidBlocks[i];
    const code = block.replace(/```mermaid\n|```$/g, '').trim();
    
    // Skip if code looks valid (starts with valid diagram type)
    if (code.match(/^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram-v2)/)) {
      console.log(`[Job ${jobId}] [Mermaid AI] Block ${i + 1}: Valid syntax detected, skipping`);
      skippedCount++;
      continue;
    }
    
    try {
      console.log(`[Job ${jobId}] [Mermaid AI] Invoking AI fix for block ${i + 1}/${mermaidBlocks.length}`);
      
      const { data, error } = await supabase.functions.invoke('fix-mermaid-diagram', {
        body: {
          brokenCode: code,
          context: `Engineering diagram ${i + 1} of ${mermaidBlocks.length} - Deep search material`,
          strategy: 'Fix syntax while preserving educational intent',
          attempt: 1
        }
      });
      
      if (data?.fixedCode && !error) {
        console.log(`[Job ${jobId}] [Mermaid AI] ✅ Block ${i + 1} fixed successfully`);
        fixedMarkdown = fixedMarkdown.replace(block, `\`\`\`mermaid\n${data.fixedCode}\n\`\`\``);
        fixedCount++;
      } else {
        console.warn(`[Job ${jobId}] [Mermaid AI] ⚠️ Block ${i + 1} fix returned error:`, error);
        failedCount++;
      }
    } catch (err) {
      console.error(`[Job ${jobId}] [Mermaid AI] ❌ Error fixing block ${i + 1}:`, err);
      failedCount++;
    }
  }
  
  console.log(`[Job ${jobId}] [Mermaid AI] Summary: ${fixedCount} fixed, ${skippedCount} skipped, ${failedCount} failed (Total: ${mermaidBlocks.length})`);
  
  return fixedMarkdown;
}
