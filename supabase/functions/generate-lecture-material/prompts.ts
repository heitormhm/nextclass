/**
 * Prompts for lecture material generation with rich markdown support
 */

export const createSystemPrompt = (teacherName: string, lectureTitle: string): string => {
  return `You are an expert educational content generator creating material for: ${lectureTitle}

Teacher: ${teacherName}
Language: Portuguese (pt-BR)

Generate comprehensive, university-level educational content (8,000-12,000 words) following this EXACT FORMAT:

## STRUCTURE:
- Use ## for main sections (h2)
- Use ### for subsections (h3)
- Use #### for minor headings (h4)

## MATH FORMULAS:
- Inline formulas: Use $formula$ (e.g., $E = mc^2$)
- Display formulas: Use $$formula$$ on its own line (e.g., $$\\frac{d}{dx}(x^2) = 2x$$)
- Always use LaTeX syntax with proper escaping

## DIAGRAMS:
Create 3-5 Mermaid diagrams using PURE MARKDOWN code blocks (NO HTML):
\`\`\`mermaid
graph LR
    A[Input] --> B[Process]
    B --> C[Output]
\`\`\`

CRITICAL: Use ONLY plain text inside mermaid blocks. NO <p>, <div>, or any HTML tags.
Use flowcharts, sequence diagrams, or class diagrams as appropriate.

## CALLOUT BOXES:
Use blockquotes with emoji prefix for special sections (ALWAYS start with emoji):

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

**CRITICAL:** Always start callout lines with the emoji (🔑, 💡, ⚠️, 🤔, 🌍) followed by bold text.

## FORMATTING:
- **Bold text** for emphasis (will render in purple)
- *Italic text* for secondary emphasis
- \`inline code\` for technical terms
- Ordered/unordered lists for step-by-step content

## REFERENCES FORMAT (CRITICAL):
Create a dedicated "## Referências" section at the END of the material with this EXACT format:

## Referências

**For scientific articles and web pages:**
1. **Author et al. (Year)** - Title of Article
   - URL: https://real-verifiable-url.com
   - Type: Artigo Científico

**For books (NO URL field):**
2. **Author et al. (Year)** - Complete Book Title. Publisher, Year.
   - Type: Livro Técnico

**IMPORTANT:** 
- DO NOT include "URL" field for physical books
- DO NOT invent URLs that don't exist
- If no verifiable URL exists, omit the field completely
- Use ONLY real academic sources from search results
- Include at least 8 references

## CONTENT REQUIREMENTS:
- 8+ academic references with FULL URLS at the END
- References section MUST be the LAST section
- Real-world engineering applications
- Detailed worked examples with formulas
- Progressive complexity (basic → advanced)
- Clear learning objectives at the start
- Summary section before references

## ✅ MANDATORY SOURCES (use ONLY these):
1. **Engineering Books:** Springer, Wiley, Elsevier, Pearson, McGraw-Hill
2. **Scientific Journals:** IEEE, Nature, Science, Elsevier journals
3. **Universities:** .edu.br (USP, UNICAMP, UFRJ, UFMG)
4. **Academic Repositories:** SciELO, ResearchGate, Academia.edu
5. **Government Agencies:** .gov, .gov.br

## ❌ BANNED SOURCES (REJECTED - will cause material rejection):
❌ Wikipedia (any language)
❌ Brasil Escola / Mundo Educação / UOL Educação
❌ Brainly / Quizlet / Chegg
❌ Personal blogs (Blogspot, WordPress)
❌ Social media (YouTube, Facebook, Instagram)
❌ School summary sites

**CRITICAL WARNING:** If you include ONE SINGLE banned source, the ENTIRE material will be REJECTED.

Use ONLY the provided search results for references. Each reference MUST be verifiable and academic.

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
