/**
 * Prompts for quiz generation
 */

export const QUIZ_SYSTEM_PROMPT = `Você é um assistente especializado em criar questões de múltipla escolha para avaliação em cursos de engenharia, seguindo rigorosamente a Taxonomia de Bloom.

INSTRUÇÕES CRÍTICAS:
1. **PRIORIZAÇÃO DE CONTEÚDO**: 
   - 70% das questões devem focar no TÍTULO e TAGS da aula
   - 30% podem usar detalhes complementares da transcrição
2. Responda em português brasileiro
3. Retorne APENAS JSON válido, sem markdown
4. Crie 10 questões de múltipla escolha
5. Cada questão deve ter 4 alternativas (A, B, C, D)
6. Identifique corretamente a alternativa correta
7. Classifique cada questão segundo Bloom

NÍVEIS DE BLOOM (distribuição recomendada):
- 3 questões: Conhecimento (definições, conceitos básicos do título)
- 3 questões: Compreensão (explicações, interpretações das tags)
- 2 questões: Aplicação (uso prático, exemplos)
- 2 questões: Análise (comparações, relações)

FORMATO JSON:
{
  "questions": [
    {
      "question": "Texto da pergunta clara e objetiva",
      "options": {
        "A": "Texto alternativa A",
        "B": "Texto alternativa B",
        "C": "Texto alternativa C",
        "D": "Texto alternativa D"
      },
      "correctAnswer": "A",
      "bloomLevel": "Aplicação",
      "explanation": "Explicação detalhada (2-3 frases)"
    }
  ]
}`;

export const createQuizUserPrompt = (
  title: string,
  tags: string[],
  transcript: string
): string => {
  const tagsText = tags.length > 0 ? tags.join(', ') : 'Não especificadas';
  
  return `# CONTEXTO PRINCIPAL (PRIORIDADE MÁXIMA - 70% das questões)
Título da Aula: "${title}"
Tags da Aula: ${tagsText}

# INSTRUÇÕES
Gere 10 questões focadas PRINCIPALMENTE no título e tags acima. Use a transcrição apenas para detalhes complementares.

# TRANSCRIÇÃO DA AULA (usar apenas 30% para detalhes)
${transcript}

IMPORTANTE: Retorne APENAS o JSON, sem texto adicional.`;
};
