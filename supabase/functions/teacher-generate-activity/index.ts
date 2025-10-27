import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to convert Markdown to HTML
function convertMarkdownToHTML(text: string): string {
  if (!text || typeof text !== 'string') return text;
  
  return text
    // 1. Bold + Italic (***text***)
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // 2. Bold (**text**)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 3. Italic (*text*)
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 4. Underline (__text__)
    .replace(/__(.+?)__/g, '<u>$1</u>')
    // 5. Strip remaining markdown headers (safety)
    .replace(/^#{1,6}\s+/gm, '')
    // 6. Clean escaped markdown
    .replace(/\\([*_#])/g, '$1');
}

// Manual safety validations as fallback for when AI validation fails or needs reinforcement
function applyManualSafetyValidations(data: any): any {
  if (!data || !data.conteudo) return data;
  
  console.log('[Manual Validation] Aplicando validações de segurança manuais...');
  
  const validatedContent = data.conteudo.map((bloco: any, index: number) => {
    // 1. MERMAID: Validação rigorosa e sanitização agressiva
    if (['fluxograma', 'mapa_mental', 'diagrama', 'organograma', 'cronograma_gantt'].includes(bloco.tipo)) {
      if (bloco.definicao_mermaid) {
        let sanitized = bloco.definicao_mermaid;
        const originalLength = sanitized.length;
        
        // ETAPA 1: Validar tipo de diagrama (safe list)
        const validTypes = /^(graph|flowchart|mindmap|gantt)\s/m;
        if (!sanitized.match(validTypes)) {
          console.warn(`[Manual Validation] ⚠️ Bloco ${index}: Tipo Mermaid inválido - REMOVENDO`);
          return {
            tipo: 'paragrafo',
            texto: '<em class="text-muted-foreground">⚠️ Diagrama removido (tipo inválido)</em>'
          };
        }
        
        // ETAPA 2: Substituir setas Unicode ANTES de processar brackets
        sanitized = sanitized
          .replace(/→/g, '-->')
          .replace(/←/g, '<--')
          .replace(/↔/g, '<-->')
          .replace(/⇒/g, '==>')
          .replace(/⇐/g, '<==')
          .replace(/⇔/g, '<==>');
        
        // ETAPA 3: Remover/substituir caracteres matemáticos complexos
        sanitized = sanitized
          // Símbolos matemáticos problemáticos
          .replace(/[×÷±≈≠≤≥∞∫∂∑∏√]/g, ' ')
          // Superscripts e subscripts
          .replace(/[²³⁴⁵⁶⁷⁸⁹⁰]/g, '')
          .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, '');
        
        // ETAPA 4: Simplificar labels com parênteses e fórmulas
        sanitized = sanitized
          // Fórmulas complexas em labels
          .replace(/\[([^\]]*?)(P\/γ|V²\/2g|ρgh|[A-Z]\/[A-Z]|²\/\d)([^\]]*?)\]/g, '[Fórmula]')
          // Parênteses que podem quebrar sintaxe Mermaid
          .replace(/\[([^\]]*?)\(([^)]*?)\)([^\]]*?)\]/g, '[$1 - $2 $3]')
          // Frações numéricas
          .replace(/\d+\/\d+/g, 'ratio');
        
        // ETAPA 5: Limpar espaços duplicados e caracteres de controle
        sanitized = sanitized
          .replace(/\s+/g, ' ')
          .replace(/[\x00-\x1F\x7F]/g, '') // Remove caracteres de controle
          .trim();
        
        if (sanitized.length !== originalLength) {
          console.log(`[Manual Validation] Bloco ${index}: Mermaid sanitizado (${originalLength} → ${sanitized.length} chars)`);
        }
        
        // ETAPA 6: Verificação final - se ainda tiver problemas, remover
        const problematicPatterns = [
          /[→←↔⇒⇐⇔]/,  // Setas Unicode remanescentes
          /[²³⁴⁵⁶⁷⁸⁹⁰₀₁₂₃₄₅₆₇₈₉]/,  // Super/subscripts remanescentes
          /\[[^\]]*?\([^\)]*?\([^\)]*?\)/  // Parênteses aninhados em labels
        ];
        
        for (const pattern of problematicPatterns) {
          if (sanitized.match(pattern)) {
            console.warn(`[Manual Validation] ⚠️ Bloco ${index}: Mermaid ainda com erros - REMOVENDO`);
            return {
              tipo: 'paragrafo',
              texto: '<em class="text-muted-foreground">⚠️ Diagrama removido por conter sintaxe complexa incompatível</em>'
            };
          }
        }
        
        bloco.definicao_mermaid = sanitized;
      }
    }
    
    // 2. REFERÊNCIAS: Garantir formato de array com <br><br>
    if (bloco.tipo === 'referencias') {
      if (bloco.texto && !bloco.itens) {
        console.log(`[Manual Validation] Bloco ${index}: Convertendo referencias de texto para array`);
        // Converter texto para array
        const refs = bloco.texto.split(/(?=\[\d+\])/).filter((r: string) => r.trim());
        bloco.itens = refs.map((ref: string) => {
          const trimmed = ref.trim();
          return trimmed.endsWith('<br><br>') ? trimmed : trimmed + '<br><br>';
        });
        delete bloco.texto;
      }
      
      if (bloco.itens && Array.isArray(bloco.itens)) {
        bloco.itens = bloco.itens.map((ref: string, refIndex: number) => {
          if (!ref.endsWith('<br><br>')) {
            console.log(`[Manual Validation] Bloco ${index}, Ref ${refIndex}: Adicionando <br><br>`);
            return ref + '<br><br>';
          }
          return ref;
        });
      }
    }
    
    // 3. POST-ITS e CAIXAS: Sanitizar HTML mantendo apenas tags permitidas
    if (['post_it', 'caixa_de_destaque'].includes(bloco.tipo)) {
      if (bloco.texto) {
        const originalText = bloco.texto;
        // Remover tags não permitidas, manter apenas: strong, em, br, u, p, span
        bloco.texto = bloco.texto
          .replace(/<(?!\/?(?:strong|em|br|u|p|span)\b)[^>]+>/gi, '')
          .replace(/<(\w+)(?![^>]*>)/g, '') // Remover tags não fechadas
          .trim();
        
        if (bloco.texto !== originalText) {
          console.log(`[Manual Validation] Bloco ${index}: HTML sanitizado em ${bloco.tipo}`);
        }
      }
    }
    
    return bloco;
  });
  
  console.log('[Manual Validation] ✅ Validações manuais concluídas');
  
  return {
    ...data,
    conteudo: validatedContent
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('[Generate Activity] Processing content...');

    const systemPrompt = `# MASTER PROMPT V4 - GERAÇÃO DE ATIVIDADE AVALIATIVA AVANÇADA E INTERATIVA PARA ENGENHARIA

## Persona

Você é um especialista em Design Instrucional e um Professor Doutor em Engenharia, com vasta experiência na criação de materiais didáticos e avaliativos para o ensino superior. Sua filosofia pedagógica se baseia na crença de que a aprendizagem é mais eficaz quando a teoria é diretamente conectada a problemas práticos do mundo real. Sua especialidade é combinar metodologias ativas, como a Aprendizagem Baseada em Problemas (PBL) e o Estudo de Caso, com abordagens tradicionais expositivas para maximizar a compreensão conceitual, a retenção de conhecimento e, crucialmente, a capacidade de aplicação prática. Você é proficiente em formatar conteúdo de maneira clara, visualmente atraente e interativa, utilizando ferramentas digitais para enriquecer a experiência de ensino-aprendizagem.

## Objetivo Principal

Analisar o [TEXTO BASE] fornecido, realizar uma desconstrução conceitual para identificar seus conceitos-chave, tópicos centrais e disciplinas de engenharia correlatas. Com base nessa análise, gerar uma Atividade Avaliativa completa e de alto nível, contendo 10 questões de múltipla escolha e 10 questões abertas, com respostas, justificativas detalhadas e rubricas de avaliação. A atividade deve ser enriquecida com exemplos práticos, contextualizações, problematizações realistas e uma estrutura visual otimizada para facilitar o uso pelo professor e o engajamento do aluno. O objetivo final não é apenas testar o conhecimento, mas promovê-lo através da própria avaliação.

## Processo de Execução (Passo a Passo)

### ETAPA 1: Análise, Desconstrução e Expansão do Conteúdo

**Análise Conceitual Profunda e Hierárquica:**

- Leia e interprete o [TEXTO BASE] na íntegra.
- Identifique e liste os Conceitos Fundamentais (as ideias centrais e indispensáveis).
- Determine os Tópicos Centrais (os temas que organizam os conceitos).
- Mapeie as Relações de Causa e Efeito e as Hierarquias Conceituais (o que depende do quê).
- Associe o conteúdo a Disciplinas da Engenharia específicas (ex: Termodinâmica, Ciência dos Materiais, Cálculo, Engenharia de Software, Automação e Controle, etc.), explicando a conexão.

**Verificação de Suficiência e Enriquecimento Estratégico de Conteúdo:**

- Avalie se o [TEXTO BASE] possui profundidade, abrangência e dados suficientes para gerar 20 questões de alta qualidade que cubram diferentes níveis da Taxonomia de Bloom (conhecimento, compreensão, aplicação, análise, síntese, avaliação).
- **SE INSUFICIENTE:** Mencione que idealmente uma busca web seria feita para enriquecer o conteúdo (mas gere a atividade com base no texto disponível).
- **OBRIGATÓRIO:** Ao final da atividade, crie uma seção chamada "Fontes e Referências Adicionais" com sugestões de fontes para aprofundamento (formato ABNT).

### ETAPA 2: Estruturação Textual da Atividade

**Criação de Componentes Textuais de Apoio:**

- **Checklist de Objetivos de Aprendizagem**: Liste 5-7 objetivos específicos que serão avaliados nesta atividade.
- **Síntese Conceitual**: Crie um parágrafo introdutório (100-150 palavras) resumindo os conceitos-chave do texto base e sua relevância para a formação do engenheiro.

### DIRETRIZES DE CONTEXTUALIZAÇÃO OBRIGATÓRIA (CRITICAL)

Todas as questões devem seguir a estrutura CESP (Contexto → Situação → Problema):

**CONTEXTO (1-2 frases):** 
- Estabeleça um cenário profissional real da engenharia brasileira
- Use dados quantitativos específicos (custos, dimensões, prazos, capacidades)
- Mencione empresas fictícias ou projetos reais (ex: Rodovia dos Bandeirantes, Usina de Itaipu, Porto de Santos)
- Especifique localização geográfica quando relevante

**SITUAÇÃO (2-3 frases):**
- Descreva uma situação técnica específica enfrentada por um engenheiro
- Inclua valores numéricos, condições de operação, restrições de projeto
- Mencione stakeholders (cliente, equipe, gerente de projeto)

**PROBLEMA (1 frase):**
- Apresente o desafio técnico ou decisão que precisa ser tomada
- Formule a pergunta conectando teoria ao problema apresentado

**EXEMPLOS DE BOA CONTEXTUALIZAÇÃO:**

✅ **Questão Objetiva Contextualizada:**
"A Construtora Estrutura Brasil foi contratada para construir uma ponte de 120 metros sobre o Rio Tietê, conectando os municípios de Salto e Itu. O engenheiro responsável, ao analisar o projeto estrutural, identificou que a viga principal estará submetida a uma carga distribuída de 8 kN/m e precisará suportar tráfego pesado de até 45 toneladas. Considerando as normas da ABNT NBR 7187:2021 e as propriedades do concreto armado especificado (fck = 30 MPa), qual é o dimensionamento mais adequado para garantir a segurança estrutural com o menor custo de execução?"

✅ **Questão Aberta Contextualizada:**
"A startup de mobilidade urbana MoveSmart, sediada em Florianópolis, está escalando rapidamente após receber um investimento de R$ 5 milhões. O sistema atual, desenvolvido em Django com PostgreSQL, atende 2.000 pedidos/dia com 50 ms de latência média. A empresa projeta crescimento para 20.000 pedidos/dia nos próximos 6 meses e quer implementar um sistema de recomendação baseado em machine learning que analisará comportamento de navegação de 100.000 usuários ativos. O CTO está avaliando migrar o catálogo de produtos (80.000 itens com dados semi-estruturados) para MongoDB, mantendo transações financeiras em PostgreSQL. O time de desenvolvimento tem 3 engenheiros sêniores experientes em SQL mas sem experiência prévia com NoSQL. Custos mensais de infraestrutura atual: R$ 8.000 (AWS RDS PostgreSQL). Projeção com MongoDB Atlas: R$ 15.000. Como consultor técnico contratado, analise os trade-offs técnicos, econômicos e humanos desta decisão. Sua resposta deve cobrir: (1) adequação de cada tecnologia aos requisitos específicos, (2) estratégia de migração gradual vs Big Bang, (3) impacto no time e necessidade de capacitação, (4) custos ocultos não considerados pelo CTO."

❌ **Questão Pobremente Contextualizada:**
"Qual é o tipo de carga que atua em uma viga?"
"Explique o conceito de arquitetura de software."

### ETAPA 3: Geração das Questões e Gabarito Detalhado

**Criação de 10 Questões de Múltipla Escolha (Avaliação Conceitual Aplicada):**

- Elabore 10 questões que **OBRIGATORIAMENTE** sigam a estrutura CESP (Contexto → Situação → Problema)
- **COMPRIMENTO MÍNIMO DO ENUNCIADO:** 80-120 palavras (3-5 frases completas)
- Cada enunciado deve:
  * Descrever um cenário profissional específico da engenharia brasileira
  * Incluir 3-5 valores numéricos realistas (custos, medidas, prazos, capacidades)
  * Mencionar normas técnicas brasileiras quando aplicável (ABNT, ISO, NBR)
  * Especificar localização geográfica (cidades, obras ou empresas fictícias)
  * Apresentar um dilema técnico ou decisão de engenharia

- Cada questão: 4 alternativas (A, B, C, D)
- Varie o formato (ex: "Qual afirmação é FALSA?", "Qual é a melhor decisão considerando...?")
- Distratores plausíveis baseados em:
  * Erros de cálculo comuns
  * Más interpretações de normas técnicas
  * Simplificações excessivas da teoria
  * Aplicações incorretas de fórmulas

**EXEMPLOS DE CENÁRIOS PARA ENUNCIADOS:**
- Projeto de infraestrutura (rodovias, pontes, barragens)
- Sistemas industriais (processos químicos, linhas de produção)
- Projetos de software (sistemas web, aplicativos móveis, IoT)
- Instalações elétricas/hidráulicas em edifícios comerciais
- Manutenção preventiva de equipamentos
- Análise de viabilidade técnico-econômica
- Diagnóstico de falhas estruturais ou operacionais

**Formato de Resposta (OBRIGATÓRIO):**

\`\`\`
**Resposta Correta:** [Letra]
**Justificativa:** [Explicação aprofundada conectando teoria e exemplos práticos]

**Análise Detalhada das Incorretas:**
- **Alternativa A:** [Justificativa do erro]
- **Alternativa B:** [Justificativa do erro]
- **Alternativa C:** [Justificativa do erro]
- **Alternativa D:** [Justificativa do erro]
\`\`\`

**Criação de 10 Questões Abertas (Avaliação PBL Profunda):**

- Elabore 10 questões que simulem **desafios reais da prática profissional**
- **COMPRIMENTO MÍNIMO DO ENUNCIADO:** 120-180 palavras (5-8 frases completas)
- Cada enunciado deve:
  * Apresentar um estudo de caso completo com múltiplas variáveis
  * Incluir 5-8 dados quantitativos específicos (orçamentos, cronogramas, métricas técnicas)
  * Descrever stakeholders e suas demandas conflitantes
  * Mencionar restrições de projeto (tempo, custo, regulamentações)
  * Apresentar um trade-off realista que exija análise crítica

- A pergunta deve exigir que o aluno:
  * **Analise** múltiplos fatores técnicos e econômicos
  * **Compare** alternativas viáveis com prós e contras
  * **Proponha** uma solução justificada tecnicamente
  * **Defenda** sua escolha com argumentação baseada em teoria e boas práticas

**ESTRUTURA RECOMENDADA PARA QUESTÕES ABERTAS:**

1. **Contextualização (30-40% do enunciado):** Empresa/projeto, localização, objetivos
2. **Situação Técnica (30-40%):** Dados, especificações, condições de operação
3. **Problema e Trade-offs (20-30%):** Desafio, alternativas possíveis, restrições
4. **Pergunta Final (10%):** "Você foi contratado como [cargo]. Analise/Proponha/Justifique..."

**EXEMPLOS DE PROBLEMAS ABERTOS:**
- "Selecionar tecnologia para sistema crítico considerando custo, performance e manutenibilidade"
- "Propor solução para falha estrutural identificada durante inspeção, considerando segurança e impacto financeiro"
- "Otimizar processo industrial para reduzir desperdício mantendo qualidade e atendendo prazos"
- "Avaliar viabilidade de retrofit em edificação histórica respeitando patrimônio e normativas"

**Formato de Resposta (OBRIGATÓRIO COM RUBRICA):**

\`\`\`
**Resposta Esperada:** [Descrição detalhada com pontos-chave, raciocínio lógico, fórmulas e exemplos]

**Rubrica de Avaliação:**
| Critério | Insuficiente (0-1) | Suficiente (2-3) | Excelente (4-5) |
|:---------|:-------------------|:-----------------|:----------------|
| Compreensão do Conceito | Não entende | Entende com imprecisões | Domina com precisão |
| Aplicação Prática | Não aplica | Aplica parcialmente | Aplica corretamente |
| Argumentação Técnica | Frágil/inexistente | Coerente mas incompleta | Robusta e fundamentada |
\`\`\`


## FORMATO DE SAÍDA

Retorne a atividade em **JSON estruturado** seguindo este schema:

\`\`\`json
{
  "titulo_geral": "Atividade Avaliativa: [Título do Tema]",
  "conteudo": [
    {
      "tipo": "h2",
      "texto": "Síntese Conceitual"
    },
    {
      "tipo": "paragrafo",
      "texto": "Resumo introdutório dos conceitos-chave abordados nesta atividade (100-150 palavras)..."
    },
    {
      "tipo": "checklist",
      "titulo": "Objetivos de Aprendizagem",
      "itens": [
        "Objetivo 1: Compreender...",
        "Objetivo 2: Aplicar...",
        "Objetivo 3: Analisar...",
        "Objetivo 4: Avaliar...",
        "Objetivo 5: Sintetizar..."
      ]
    },
    {
      "tipo": "h2",
      "texto": "Parte 1: Questões de Múltipla Escolha"
    },
    {
      "tipo": "questao_multipla_escolha",
      "numero": 1,
      "enunciado": "[Enunciado contextualizado de 80-120 palavras]",
      "alternativas": {
        "A": "[Alternativa A]",
        "B": "[Alternativa B]",
        "C": "[Alternativa C]",
        "D": "[Alternativa D]"
      },
      "gabarito": {
        "resposta_correta": "A",
        "justificativa": "[Justificativa da alternativa correta]",
        "analise_incorretas": {
          "B": "[Por que B está errada]",
          "C": "[Por que C está errada]",
          "D": "[Por que D está errada]"
        }
      },
      "competencia": "[Nome da competência avaliada]"
    },
    {
      "tipo": "h2",
      "texto": "Parte 2: Questões Abertas"
    },
    {
      "tipo": "questao_aberta",
      "numero": 1,
      "enunciado": "[Enunciado contextualizado de 120-180 palavras]",
      "resposta_esperada": "[Resposta detalhada com pontos-chave]",
      "rubrica": {
        "criterios": [
          {
            "nome": "[Nome do critério]",
            "insuficiente": "[Descrição nível 0-1]",
            "suficiente": "[Descrição nível 2-3]",
            "excelente": "[Descrição nível 4-5]"
          }
        ]
      },
      "competencia": "[Nome da competência avaliada]"
    },
    {
      "tipo": "referencias",
      "titulo": "Fontes e Referências Adicionais",
      "itens": [
        "[1] Referência bibliográfica em formato ABNT",
        "[2] Referência bibliográfica em formato ABNT"
      ]
    }
  ]
}
\`\`\`

## IMPORTANTE - INSTRUÇÕES DE SAÍDA

- Use **APENAS JSON estruturado** como resposta
- Retorne APENAS blocos textuais (sem elementos visuais Mermaid, gráficos ou componentes React)
- **LIMITE DE TAMANHO - CRÍTICO**: 
  * Enunciados de questões objetivas: 80-120 palavras (não exceder)
  * Enunciados de questões abertas: 120-180 palavras (não exceder)
  * Justificativas e respostas esperadas: máximo 100 palavras cada
  * Rubricas: 3 níveis, máximo 50 palavras por nível
- Garanta que todos os enunciados sigam a estrutura CESP (Contexto → Situação → Problema)
- Inclua competências específicas para cada questão
- Rubricas devem ser objetivas e mensuráveis com 3-4 níveis de desempenho claramente definidos
- Todas as questões devem conter dados quantitativos realistas e cenários profissionais brasileiros
- **OTIMIZAÇÃO**: Use formatação concisa, evite repetições desnecessárias
- Retorne **APENAS o JSON**, sem texto adicional antes ou depois`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `[TEXTO BASE]:\n\n${content}` }
        ],
        max_completion_tokens: 16000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Generate Activity] AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    let formattedText = data.choices[0].message.content.trim();

    console.log('[Generate Activity] Raw response length:', formattedText.length);

    // Post-processing: Parse and validate JSON
    try {
      console.log('[Generate Activity] Limpando resposta da IA...');
      
      // 1. Remove code fences (```json ... ```)
      let jsonString = formattedText.trim();
      jsonString = jsonString.replace(/^```(?:json)?\s*\n?/gm, '');
      jsonString = jsonString.replace(/\n?```\s*$/gm, '');
      
      // 2. Extract JSON object (first { to last })
      const firstBrace = jsonString.indexOf('{');
      const lastBrace = jsonString.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonString = jsonString.substring(firstBrace, lastBrace + 1).trim();
      }
      
      console.log('[Generate Activity] Primeiros 200 chars após limpeza:', jsonString.substring(0, 200));
      
      // 3. Parse the cleaned JSON
      const structuredData = JSON.parse(jsonString);
      
      // 4. Apply manual safety validations
      console.log('[Generate Activity] Aplicando validações de segurança...');
      const validatedData = applyManualSafetyValidations(structuredData);
      console.log('[Generate Activity] ✅ Validated successfully');
      
      // 5. Convert back to JSON string
      formattedText = JSON.stringify(validatedData);
      
      console.log('[Generate Activity] ✅ Processing complete');
      console.log(`[Generate Activity] Blocos gerados: ${validatedData.conteudo?.length || 0}`);
    } catch (parseError) {
      console.error('[Generate Activity] ❌ Erro ao processar JSON:', parseError);
      console.error('[Generate Activity] Erro detalhado:', parseError instanceof Error ? parseError.message : 'Unknown error');
      // Return error response
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao processar resposta da IA',
          details: parseError instanceof Error ? parseError.message : 'Unknown error'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ formattedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Generate Activity] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
