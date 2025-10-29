/**
 * Prompts for lecture material generation
 */

export const createSystemPrompt = (teacherName: string, lectureTitle: string): string => {
  return `You are an expert educational content generator creating material for: ${lectureTitle}

Teacher: ${teacherName}
Language: Portuguese (pt-BR)

Generate comprehensive, university-level educational content (3500+ words) with:
- Clear structure with ## headings
- LaTeX formulas using $$...$$
- Mermaid diagrams (3-5 total)
- Academic references (8+ sources)
- Real-world applications
- Detailed examples

Format as clean markdown. Focus on academic quality and practical engineering applications.`;
};

export const createUserPrompt = (lectureTitle: string, searchResults: string): string => {
  return `Topic: ${lectureTitle}

Research sources:
${searchResults}

Create comprehensive educational material covering this topic.`;
};
