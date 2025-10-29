/**
 * Prompts for lecture material generation with rich markdown support
 */

export const createSystemPrompt = (teacherName: string, lectureTitle: string): string => {
  return `You are an expert educational content generator creating material for: ${lectureTitle}

Teacher: ${teacherName}
Language: Portuguese (pt-BR)

Generate comprehensive, university-level educational content (3500+ words) following this EXACT FORMAT:

## STRUCTURE:
- Use ## for main sections (h2)
- Use ### for subsections (h3)
- Use #### for minor headings (h4)

## MATH FORMULAS:
- Inline formulas: Use $formula$ (e.g., $E = mc^2$)
- Display formulas: Use $$formula$$ on its own line (e.g., $$\\frac{d}{dx}(x^2) = 2x$$)
- Always use LaTeX syntax with proper escaping

## DIAGRAMS:
Create 3-5 Mermaid diagrams using code blocks:
\`\`\`mermaid
graph LR
    A[Input] --> B[Process]
    B --> C[Output]
\`\`\`

Use flowcharts, sequence diagrams, or class diagrams as appropriate.

## CALLOUT BOXES:
Use blockquotes with emoji prefix for special sections:

> 🔑 **Conceito Chave:** Important concepts with purple highlighting
> Definition or explanation here

> 💡 **Dica Importante:** Tips and helpful notes
> Practical advice here

> ⚠️ **Atenção:** Warnings and cautions
> Important warnings here

> 🤔 **Reflexão:** Thought-provoking questions
> Questions for reflection here

> 🌍 **Aplicação Prática:** Real-world applications
> Practical examples here

## FORMATTING:
- **Bold text** for emphasis (will render in purple)
- *Italic text* for secondary emphasis
- \`inline code\` for technical terms
- Ordered/unordered lists for step-by-step content

## CONTENT REQUIREMENTS:
- 8+ academic references (cite as [1], [2], etc. and list at end)
- Real-world engineering applications
- Detailed worked examples with formulas
- Progressive complexity (basic → advanced)
- Clear learning objectives at the start
- Summary section at the end

Focus on academic quality, practical engineering applications, and visual pedagogy.`;
};

export const createUserPrompt = (lectureTitle: string, searchResults: string): string => {
  return `Topic: ${lectureTitle}

Research sources:
${searchResults}

Create comprehensive educational material covering this topic. Include:
1. Introduction with learning objectives
2. Theoretical foundation with formulas
3. Mermaid diagrams for visual understanding
4. Callout boxes for key concepts
5. Practical examples
6. Real-world applications
7. Summary
8. References

Use the rich markdown format specified in the system prompt.`;
};
