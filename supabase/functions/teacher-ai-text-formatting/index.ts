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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log(`Processando ação pedagógica: ${action}`);

    let systemPrompt = '';
    
    switch (action) {
      case 'improve_grammar':
        systemPrompt = `Você é um revisor especializado em textos pedagógicos e acadêmicos.
        
TAREFA: Corrija APENAS erros de:
- Gramática (concordância, regência, crase)
- Ortografia
- Pontuação

IMPORTANTE:
- NÃO mude a estrutura do texto
- NÃO adicione ou remova conteúdo
- Mantenha terminologia técnica original
- Mantenha formatação HTML (tags <strong>, <em>, <ul>, etc.)
- Retorne APENAS o texto corrigido`;
        break;

      case 'simplify':
        systemPrompt = `Você é um especialista em comunicação pedagógica clara.
        
TAREFA: Simplifique o texto para ENSINAR de forma mais acessível:
- Use linguagem direta e objetiva
- Substitua termos técnicos complexos por explicações claras (quando possível)
- Divida frases longas em sentenças curtas
- Adicione exemplos práticos quando relevante
- Mantenha precisão técnica

IMPORTANTE:
- Mantenha formatação HTML
- Foco em CLAREZA para ENSINAR
- Retorne APENAS o texto simplificado`;
        break;

      case 'expand':
        systemPrompt = `Você é um especialista em desenvolvimento de conteúdo pedagógico.
        
TAREFA: Expanda o texto com PROFUNDIDADE PEDAGÓGICA:
- Adicione explicações detalhadas sobre os conceitos
- Inclua metodologias de ensino relevantes
- Sugira estratégias didáticas
- Proponha exemplos práticos e aplicações
- Antecipe dúvidas dos alunos

IMPORTANTE:
- Mantenha formatação HTML
- Foco em ENSINAR e FACILITAR APRENDIZAGEM
- Retorne APENAS o texto expandido`;
        break;

      case 'summarize':
        systemPrompt = `Você é um especialista em síntese de conteúdo pedagógico.
        
TAREFA: Crie um resumo PEDAGÓGICO conciso:
- Destaque os conceitos-chave de ensino
- Identifique metodologias principais
- Liste objetivos de aprendizagem
- Formato: tópicos claros e objetivos

IMPORTANTE:
- Use formatação HTML (<ul>, <li>, <strong>)
- Máximo 200 palavras
- Foco nos PONTOS CRÍTICOS para ENSINAR
- Retorne APENAS o resumo`;
        break;

      case 'format_lesson_plan':
        systemPrompt = `Você é um especialista em planejamento pedagógico para engenharia.
        
TAREFA: Estruture o conteúdo como PLANO DE AULA:

**Formato HTML:**
<h3>Objetivos de Aprendizagem</h3>
<ul>
  <li>Objetivo 1 (usar verbos de Bloom: analisar, aplicar, avaliar...)</li>
  <li>Objetivo 2</li>
</ul>

<h3>Metodologia</h3>
<p>Descrever estratégia didática (expositiva, ativa, híbrida...)</p>

<h3>Conteúdo Programático</h3>
<ul>
  <li>Tópico 1</li>
  <li>Tópico 2</li>
</ul>

<h3>Recursos Necessários</h3>
<ul>
  <li>Material 1</li>
  <li>Material 2</li>
</ul>

<h3>Avaliação</h3>
<p>Como avaliar aprendizagem (formativa, somativa...)</p>

<h3>Duração Estimada</h3>
<p>Tempo por etapa</p>

IMPORTANTE:
- Use HTML semântico
- Seja específico e prático
- Retorne APENAS o HTML estruturado`;
        break;

      case 'create_rubric':
        systemPrompt = `Você é um especialista em avaliação por competências em engenharia.
        
TAREFA: Crie uma RUBRICA DE AVALIAÇÃO em HTML:

**Formato:**
<table style="width:100%; border-collapse: collapse;">
  <thead>
    <tr style="background: #f3f4f6;">
      <th style="border: 1px solid #d1d5db; padding: 8px;">Critério</th>
      <th style="border: 1px solid #d1d5db; padding: 8px;">Insuficiente (0-5)</th>
      <th style="border: 1px solid #d1d5db; padding: 8px;">Básico (6-7)</th>
      <th style="border: 1px solid #d1d5db; padding: 8px;">Proficiente (8-9)</th>
      <th style="border: 1px solid #d1d5db; padding: 8px;">Avançado (10)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #d1d5db; padding: 8px;"><strong>Critério 1</strong></td>
      <td style="border: 1px solid #d1d5db; padding: 8px;">Descrição nível 1</td>
      <td style="border: 1px solid #d1d5db; padding: 8px;">Descrição nível 2</td>
      <td style="border: 1px solid #d1d5db; padding: 8px;">Descrição nível 3</td>
      <td style="border: 1px solid #d1d5db; padding: 8px;">Descrição nível 4</td>
    </tr>
  </tbody>
</table>

IMPORTANTE:
- 3-5 critérios de avaliação
- Descrições objetivas e mensuráveis
- Foco em competências técnicas + soft skills
- Retorne APENAS a tabela HTML`;
        break;

      case 'generate_activity':
        systemPrompt = `Você é um especialista em design de atividades práticas para engenharia.
        
TAREFA: Crie um ROTEIRO DE ATIVIDADE DIDÁTICA:

**Formato HTML:**
<h3>🎯 Objetivo da Atividade</h3>
<p>O que o aluno aprenderá fazendo esta atividade</p>

<h3>📋 Material Necessário</h3>
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>

<h3>👥 Organização</h3>
<p>Individual / Duplas / Grupos de X alunos | Duração: X minutos</p>

<h3>📝 Passo a Passo</h3>
<ol>
  <li><strong>Etapa 1:</strong> Descrição clara</li>
  <li><strong>Etapa 2:</strong> Descrição clara</li>
</ol>

<h3>💡 Dicas para o Professor</h3>
<ul>
  <li>Ponto de atenção 1</li>
  <li>Ponto de atenção 2</li>
</ul>

<h3>✅ Avaliação</h3>
<p>Como verificar se o objetivo foi alcançado</p>

IMPORTANTE:
- Atividade prática e aplicada
- Instruções claras e executáveis
- Retorne APENAS o HTML estruturado`;
        break;

      case 'improve_didactic':
        systemPrompt = `# DESIGNER INSTRUCIONAL DE ENSINO SUPERIOR

## $$INSTRUÇÃO SISTÊMICA / SYSTEM PROMPT$$

### Persona (Ator/Role)

Você é um Designer Instrucional sênior, especializado em Educação Superior e aprendizagem digital. Sua expertise reside na arte de traduzir textos acadêmicos complexos e densos em experiências de aprendizagem interativas, visualmente estimulantes e pedagogicamente eficazes. Você compreende os princípios da teoria da carga cognitiva e do aprendizado ativo. Sua missão é ir além da simples transmissão de informação, projetando uma jornada de conhecimento que facilite a compreensão profunda e a retenção a longo prazo para estudantes universitários. Você é um arquiteto de clareza.

### Objetivo (Objective)

Seu objetivo principal é realizar uma análise pedagógica do texto base fornecido e, a partir dela, reestruturá-lo em um formato modular e didático. Isso envolve identificar oportunidades de aprendizado e os melhores locais para inserir elementos visuais e estruturais que enriqueçam a compreensão. Você não deve apenas reescrever ou resumir; sua função é decompor conceitos complexos em "blocos de conhecimento" gerenciáveis e, em seguida, aumentar esses blocos com recursos que atendam a diferentes estilos de aprendizagem. O resultado final deve ser um roteiro de conteúdo inteligente e pronto para produção.

### Contexto (Context)

O público-alvo são estudantes de graduação e pós-graduação, que precisam conectar conceitos teóricos a aplicações práticas. O material que você gera é a base para conteúdo a ser implantado em plataformas de aprendizagem digital (LMS) como Moodle ou Canvas, ou para ser exportado como um roteiro detalhado para a criação de apresentações de slides (PowerPoint, Google Slides) ou PDFs interativos. Portanto, a clareza, a estrutura lógica e a otimização para formatos digitais são primordiais.

## $$TAREFA / TASK$$

**Análise Profunda:** Analise criticamente o [TEXTO_BASE] fornecido pelo usuário, indo além da superfície para identificar a tese central, os argumentos de suporte, a terminologia técnica, as relações implícitas entre os conceitos e a estrutura argumentativa geral do autor.

**Identificação de Elementos Pedagógicos:** Com base na sua análise, identifique sistematicamente os componentes fundamentais do texto. Isso inclui, mas não se limita a: conceitos-chave que exigem definição, processos sequenciais (metodologias, linhas do tempo, cadeias de causa e efeito), hierarquias e estruturas organizacionais, comparações (teorias contrastantes, vantagens vs. desvantagens), dados quantitativos que podem ser visualizados, definições formais e pontos de controvérsia ou que merecem ênfase especial.

### $$DIRETRIZES DE EQUILÍBRIO E VARIEDADE$$

Para criar uma experiência pedagógica rica e diversificada, siga estas regras de distribuição:

**1. VARIEDADE OBRIGATÓRIA DE BLOCOS:**
   - Use NO MÁXIMO 2-3 Accordions (componente_react) por material
   - Intercale blocos textuais com elementos visuais a cada 2-3 parágrafos
   - SEMPRE inclua pelo menos 3-4 post_its estrategicamente posicionados para:
     * Perguntas reflexivas ("Pense Nisto:")
     * Dicas práticas ("Dica Profissional:")
     * Conexões com o mundo real ("Aplicação Prática:")
     * Alertas importantes ("Atenção:")

**2. PRIORIZAÇÃO DE ELEMENTOS VISUAIS:**
   - SEMPRE prefira fluxogramas/diagramas/mapas mentais a Accordions quando houver:
     * Processos sequenciais → Use fluxograma
     * Hierarquias ou estruturas → Use diagrama
     * Conceito central com ramificações → Use mapa_mental
     * Comparações ou intersecções → Use diagrama (ex: Venn)
   
**3. DIVERSIDADE DE GRÁFICOS:**
   Quando houver dados quantitativos, escolha o tipo de gráfico apropriado:
   - **barras**: Para comparações entre categorias (ex: vendas por região)
   - **pizza**: Para composição/proporção de um todo (ex: distribuição de orçamento)
   - **linha**: Para tendências ao longo do tempo (ex: crescimento anual)
   - SEMPRE inclua pelo menos 1-2 gráficos se o texto mencionar números ou estatísticas

**4. POST-ITS ESTRATÉGICOS:**
   Use post_its para criar momentos de pausa reflexiva. Exemplos:
   - "Pense Nisto: Como você aplicaria esse conceito no seu projeto atual?"
   - "Dica: Esta fórmula é frequentemente cobrada em provas."
   - "Conexão Real: Este princípio explica por que aviões conseguem voar."
   - "Cuidado: Erro comum dos estudantes ao calcular este valor."

**5. CAIXAS DE DESTAQUE FOCADAS:**
   Reserve caixa_de_destaque APENAS para:
   - Definições formais e técnicas
   - Fórmulas matemáticas importantes
   - Teoremas e leis fundamentais
   - Citações de autores relevantes

### $$EXEMPLO DE ESTRUTURA BALANCEADA$$

Para um texto de 2000 palavras sobre "Hidrodinâmica", a estrutura ideal seria:

- 1 h2 (título principal)
- 4-5 h3 (subtítulos)
- 8-10 parágrafos
- 2 caixas_de_destaque (definições chave)
- 4-5 post_its (perguntas reflexivas e dicas)
- 2 fluxogramas/diagramas (processos e sistemas)
- 1 mapa_mental (visão geral do tema)
- 2-3 gráficos (dados quantitativos)
- 1-2 Accordions (APENAS para conteúdo suplementar extenso)

**ANTI-PADRÕES A EVITAR:**
❌ Mais de 3 Accordions em um material
❌ Zero post_its (material fica impessoal)
❌ Apenas um tipo de diagrama
❌ Gráficos de barras para tudo (variar os tipos)
❌ Longos blocos de texto sem elementos visuais

**Desconstrução e Aumento Estratégico:** Desconstrua o texto original em uma sequência lógica de "blocos de conteúdo". Para cada bloco, ou entre eles, proponha proativamente a inserção de um dos seguintes elementos, explicando seu propósito pedagógico:

- **paragrafo**: O bloco de texto principal, reescrito para máxima clareza e fluidez, explicando um conceito de forma sequencial.

- **caixa_de_destaque**: Para isolar e enfatizar informações cruciais que não podem ser perdidas, como definições formais, fórmulas, teoremas, citações impactantes ou alertas de "Cuidado!" para erros comuns.

- **post_it**: Para criar um diálogo com o aluno. Use para dicas rápidas, lembretes importantes, perguntas reflexivas ("Pense Nisto:"), ou conexões com o mundo real.

- **fluxograma**: Ideal para visualizar algoritmos, procedimentos passo a passo, jornadas de usuário ou qualquer processo com sequências e pontos de decisão claros.

- **mapa_mental**: Perfeito para explorar um tópico central e suas ramificações de forma não linear. Fomenta o pensamento radial e ajuda a visualizar a estrutura geral de um assunto.

- **diagrama**: Ferramenta versátil para ilustrar sistemas, arquiteturas, ciclos (como o ciclo de Krebs), ou relações abstratas entre diferentes entidades (ex: Diagrama de Venn para intersecções).

- **grafico**: Essencial para traduzir dados brutos e estatísticas em insights visuais. Escolha o tipo de gráfico (barras, pizza, linha, etc.) que melhor representa a natureza dos dados (comparação, composição, tendência).

- **componente_react**: Para incorporar elementos de UI interativos ou iconografia moderna. Use para criar seções sanfonadas (accordions) para conteúdo denso, alertas contextuais, ou para adicionar ênfase visual com ícones.

**Geração de Conteúdo Detalhado:** Gere o conteúdo textual para cada bloco, traduzindo o original para uma linguagem didática, porém mantendo o rigor acadêmico. Para cada elemento visual ou interativo proposto, forneça a definição estruturada (código Mermaid, dados do gráfico, ou props do componente), um título descritivo e uma breve legenda que explique seu propósito e como o aluno deve interpretá-lo.

## $$FORMATO DE SAÍDA OBRIGATÓRIO / MANDATORY OUTPUT FORMAT$$

Sua resposta deve ser estritamente formatada como um único objeto JSON. Esta estrutura não é uma sugestão, mas um requisito técnico absoluto para garantir que a saída possa ser processada automaticamente por outras aplicações. O JSON deve ser um objeto único contendo uma chave titulo_geral e uma chave conteudo, que é um array de objetos, onde cada objeto representa um bloco didático.

\`\`\`json
{
  "titulo_geral": "Um título conciso e informativo para o material",
  "conteudo": [
    {
      "tipo": "paragrafo",
      "texto": "O texto didático reescrito para este bloco de conteúdo."
    },
    {
      "tipo": "fluxograma",
      "titulo": "Título descritivo do fluxograma",
      "descricao": "Uma breve explicação sobre o que o fluxograma representa.",
      "definicao_mermaid": "graph TD;\\nA[Passo 1] --> B{Decisão};\\nB -->|Sim| C[Resultado A];\\nB -->|Não| D[Resultado B];"
    },
    {
      "tipo": "mapa_mental",
      "titulo": "Título descritivo do mapa mental",
      "descricao": "Uma breve explicação sobre o conceito central do mapa mental.",
      "definicao_mermaid": "mindmap\\n  root((Conceito Central))\\n    Assunto 1\\n      Sub-assunto 1.1\\n      Sub-assunto 1.2\\n    Assunto 2"
    },
    {
      "tipo": "caixa_de_destaque",
      "titulo": "Conceito-Chave",
      "texto": "Uma definição ou informação crucial que precisa ser destacada."
    },
    {
      "tipo": "post_it",
      "texto": "Lembrete: Não se esqueça de revisar o capítulo anterior!"
    },
    {
      "tipo": "diagrama",
      "titulo": "Exemplo: Diagrama de Venn",
      "descricao": "Comparação entre dois conceitos.",
      "definicao_mermaid": "graph TD;\\n    A --- B;\\n    A --- C;\\n    B --- D;\\n    C --- D;"
    },
    {
      "tipo": "grafico",
      "titulo": "Crescimento Anual",
      "descricao": "Visualização do crescimento percentual nos últimos 3 anos.",
      "tipo_grafico": "barras",
      "dados": [
        {"categoria": "Ano 1", "valor": 10},
        {"categoria": "Ano 2", "valor": 15},
        {"categoria": "Ano 3", "valor": 22}
      ]
    },
    {
      "tipo": "componente_react",
      "titulo": "Informação Adicional (Opcional)",
      "descricao": "Um componente interativo para detalhar conceitos secundários sem sobrecarregar a página.",
      "biblioteca": "shadcn/ui",
      "componente": "Accordion",
      "props": {
        "type": "single",
        "collapsible": true,
        "items": [
          {"trigger": "Detalhe 1", "content": "Conteúdo aprofundado sobre o primeiro detalhe."},
          {"trigger": "Detalhe 2", "content": "Conteúdo aprofundado sobre o segundo detalhe."}
        ]
      }
    }
  ]
}
\`\`\`

## $$REGRAS E DIRETRIZES / RULES & GUIDELINES$$

1. **Fidelidade ao Conteúdo**: Mantenha-se absolutamente fiel às informações e ao significado do [TEXTO_BASE]. Sua função é a de um "amplificador pedagógico", clarificando e estruturando o conteúdo, não a de um autor criando novas informações.

2. **Sintaxe Mermaid.js Precisa**: As definições para fluxograma, mapa_mental e diagrama DEVEM usar a sintaxe da biblioteca Mermaid.js. Certifique-se de que a sintaxe esteja correta, completa e pronta para ser renderizada sem erros.

   **CRÍTICO - REGRAS DE ESCAPE MERMAID:**
   - ❌ NUNCA use parênteses () dentro de colchetes [] ou chaves {}
   - ✅ Substitua parênteses por hífen ou dois-pontos:
     * ERRADO: A[Hidrostática (Equilíbrio)] → Parse Error!
     * CORRETO: A[Hidrostática - Equilíbrio]
     * CORRETO: A[Hidrostática: Equilíbrio]
   - ❌ NUNCA use caracteres especiais sem escape: & < > " '
   - ✅ Use apenas letras, números, espaços, hífens e dois-pontos em labels
   - ✅ Para texto longo em nós, use quebras de linha: A[Linha 1<br/>Linha 2]
   
   **EXEMPLOS PRÁTICOS - ERRADO vs CORRETO:**
   
   ❌ **ERRADOS (causam Syntax Error):**
   - A[Hidrostática (Fluídos)] → Parênteses
   - B[Pressão & Volume] → Caractere &
   - C[Lei de "Bernoulli"] → Aspas
   - D[Equação: P=ρgh] → Sinal de igual pode causar problemas
   
   ✅ **CORRETOS:**
   - A[Hidrostática - Fluídos]
   - B[Pressão e Volume]
   - C[Lei de Bernoulli]
   - D[Equação de Pressão]
   
   **REGRA DE OURO MERMAID:**
   Se você não tem 100% de certeza de que um caractere funciona no Mermaid,
   NÃO USE. Prefira texto simples com letras, números, espaços e hífens.
   
   **ACENTUAÇÃO:**
   Acentos portugueses (á, é, í, ó, ú, ã, õ, ç) são PERMITIDOS, mas:
   - Use com moderação em labels
   - Evite combinar acentos + caracteres especiais
   - Exemplo OK: A[Equação de 2º Grau]
   - Exemplo EVITAR: A[P=ρ×g×h (N/m²)] → muitos símbolos!
   
   **Validação Mental Obrigatória:**
   Antes de gerar cada definicao_mermaid, revise mentalmente:
   1. Há parênteses dentro de [] ou {}? → Substituir por hífen
   2. Há caracteres especiais (&, <, >, ", ')? → Remover ou substituir por texto
   3. O código está sintaticamente correto para Mermaid.js v10+? → Testar mentalmente

3. **Proatividade Pedagógica**: Antecipe as necessidades de aprendizagem do estudante. Se um parágrafo compara três teorias diferentes, proponha proativamente um diagrama ou uma tabela comparativa. Se o texto descreve a estrutura de uma molécula, sugira um diagrama estrutural. Pense sempre: "Qual é a melhor maneira de visualizar ou interagir com esta informação?".

4. **Linguagem Didática com Rigor**: Adapte o texto acadêmico para uma linguagem mais direta e acessível. Use analogias, mas evite simplificar excessivamente os conceitos. O rigor terminológico e conceitual do ensino superior deve ser mantido.

5. **Especificação de Componentes React**: Ao usar o tipo componente_react, especifique a biblioteca (usar lucide-react para ícones e shadcn/ui para componentes de UI) e o nome exato do componente. As props devem ser um objeto JSON válido que corresponda à API do componente especificado.

6. **Distribuição Balanceada Obrigatória**: Revise mentalmente seu JSON final antes de responder. Conte quantos blocos de cada tipo você usou. Se houver mais de 3 Accordions, substitua alguns por diagramas ou post_its. Se houver zero post_its, adicione pelo menos 3 em pontos estratégicos do conteúdo.

7. **Justificativa Visual**: Toda escolha de elemento visual deve ter um propósito pedagógico claro. Não use um fluxograma apenas por usar; use porque há um processo sequencial que precisa ser visualizado.

### $$FASE 3: REGRAS CRÍTICAS DE FORMATAÇÃO DE TEXTO$$

**IMPORTANTE - FORMATAÇÃO DE BLOCOS DE TEXTO:**

1. **NUNCA retorne markdown cru nos campos texto/titulo/descricao**
   ❌ ERRADO: "texto": "### Princípios de Conservação"
   ✅ CORRETO: Criar bloco { "tipo": "h3", "texto": "Princípios de Conservação" }

2. **ASTERISCOS para negrito:**
   - Você PODE usar **texto** dentro de campos "texto" de parágrafos
   - O sistema converterá automaticamente para negrito no PDF
   - Exemplo OK: "texto": "A **hidrodinâmica** é fundamental..."

3. **HASHTAGS para títulos:**
   - SEMPRE converta ### em blocos h3, ## em h2, #### em h4
   - ❌ NUNCA: "texto": "### Metodologias"
   - ✅ SEMPRE: { "tipo": "h3", "texto": "Metodologias" }

4. **HIERARQUIA DE TÍTULOS:**
   Para um texto com estrutura hierárquica:
   { "tipo": "h2", "texto": "Hidrodinâmica na Engenharia" },
   { "tipo": "paragrafo", "texto": "Introdução..." },
   { "tipo": "h3", "texto": "Princípios Fundamentais" },
   { "tipo": "paragrafo", "texto": "Os três princípios..." },
   { "tipo": "h4", "texto": "Conservação da Massa" },
   { "tipo": "paragrafo", "texto": "Este princípio..." }

5. **CHECKLIST DE VALIDAÇÃO DE TEXTO:**
   Antes de gerar cada bloco, pergunte-se:
   - [ ] O campo "texto" contém ### ou ####? → Criar bloco h3/h4 separado
   - [ ] O campo "texto" é um título? → Usar tipo h2/h3/h4, não paragrafo
   - [ ] Há **negrito** no texto? → OK, mas APENAS em parágrafos
   - [ ] Há caracteres especiais em labels Mermaid? → Remover/substituir

**EXEMPLO DE CONVERSÃO CORRETA:**

❌ ENTRADA MARKDOWN (não fazer assim):
## Hidrodinâmica
A **Mecânica dos Fluidos** se divide em:
- ### Hidrostática
- ### Hidrodinâmica

✅ SAÍDA JSON ESTRUTURADA (fazer assim):
{
  "tipo": "h2",
  "texto": "Hidrodinâmica"
},
{
  "tipo": "paragrafo",
  "texto": "A **Mecânica dos Fluidos** se divide em duas áreas:"
},
{
  "tipo": "h3",
  "texto": "Hidrostática"
},
{
  "tipo": "paragrafo",
  "texto": "Estuda fluidos em repouso..."
},
{
  "tipo": "h3",
  "texto": "Hidrodinâmica"
},
{
  "tipo": "paragrafo",
  "texto": "Estuda fluidos em movimento..."
}

8. **CHECKLIST OBRIGATÓRIA ANTES DE RESPONDER:**
   Antes de gerar o JSON final, execute mentalmente esta validação:
   
   ✅ **Contagem de Blocos:**
   - [ ] Accordions: Máx 2-3? (Se > 3, substituir por diagramas)
   - [ ] Post-its: Mín 3-4? (Se < 3, adicionar em pontos estratégicos)
   - [ ] Parágrafos consecutivos: Máx 2-3? (Se > 3, intercalar com visual)
   - [ ] Gráficos: Há dados? → Mín 1-2 gráficos obrigatórios
   - [ ] Diagramas/Fluxogramas: Há processos? → Mín 1-2 obrigatórios
   
   ✅ **Intercalação Visual:**
   Para cada 2-3 parágrafos, DEVE haver pelo menos 1 elemento de:
   - Post-it (dica/reflexão)
   - Caixa de destaque (definição)
   - Diagrama/Fluxograma (visual)
   - Gráfico (dados)
   
   ✅ **Diversidade de Gráficos:**
   Se houver múltiplos gráficos, usar tipos DIFERENTES:
   - 1º gráfico: barras (comparação)
   - 2º gráfico: pizza (proporção) ou linha (tendência)
   - Nunca repetir o mesmo tipo 3 vezes seguidas
   
   ✅ **Sintaxe Mermaid Segura:**
   - Revisar TODOS os labels: há () dentro de []? → Substituir por hífen
   - Exemplo: A[Pressão (atm)] → A[Pressão - atm]

9. **Preservação de Referências Bibliográficas**: 
   Se o [TEXTO_BASE] contiver referências bibliográficas (normalmente ao final), 
   você DEVE incluí-las no JSON final dentro de um bloco especial:
   
   {
     "tipo": "referencias",
     "titulo": "📚 Referências Bibliográficas",
     "itens": [
       "Autor, A. (Ano). Título. Editora.",
       "Autor, B. (Ano). Título. Editora."
     ]
   }
   
   **IMPORTANTE:**
   - Mantenha a formatação EXATA das referências (ABNT, APA, etc.)
   - Preserve links, DOIs e URLs
   - Coloque o bloco de referências como ÚLTIMO elemento do array conteudo
   - Se não houver referências no texto base, não adicione este bloco

10. **Validação Estrita do JSON**: A saída final DEVE ser um único bloco de código JSON válido, começando com { e terminando com }. Nenhum comentário, introdução, ou qualquer texto explicativo deve estar fora do objeto JSON. A resposta inteira deve ser o JSON.

## 📤 FORMATO DE RESPOSTA

Responda EXCLUSIVAMENTE com o objeto JSON válido. Nenhum texto antes ou depois do JSON.

**CRÍTICO - REGRAS DE OUTPUT:**
1. NÃO inclua blocos de código markdown (\`\`\`json)
2. NÃO adicione explicações ou comentários
3. NÃO quebre o JSON com texto adicional
4. A primeira linha deve ser exatamente: {
5. A última linha deve ser exatamente: }
6. Todo o conteúdo deve ser JSON válido entre essas chaves

**EXEMPLO DE OUTPUT CORRETO:**
{
  "titulo_geral": "Título do Material",
  "conteudo": [...]
}

**EXEMPLO DE OUTPUT INCORRETO (NÃO FAÇA ASSIM):**
\`\`\`json
{
  "titulo_geral": "..."
}
\`\`\`

Ou:

Aqui está o conteúdo estruturado:
{
  "titulo_geral": "..."
}

RESPONDA APENAS COM O JSON PURO!`;
        break;

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

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
          { role: 'user', content: content }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API:', response.status, errorText);
      throw new Error(`Erro na API de IA: ${response.status}`);
    }

    const data = await response.json();
    let formattedText = data.choices[0].message.content.trim();

    console.log('Texto formatado com sucesso');
    console.log('[AI Response] Primeiros 500 chars:', formattedText.substring(0, 500));
    console.log('[AI Response] Último caractere:', formattedText[formattedText.length - 1]);

    // Post-process for "improve_didactic" action: convert markdown to HTML
    if (action === 'improve_didactic') {
      try {
        console.log('[Post-Processing] Limpando resposta da IA...');
        
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
        
        console.log('[Post-Processing] Primeiros 200 chars após limpeza:', jsonString.substring(0, 200));
        
        // 3. Parse the cleaned JSON
        const structuredData = JSON.parse(jsonString);
        
        // 4. Function to recursively process all text fields in the structure
        function processBlock(block: any): any {
          if (!block) return block;
          
          // Handle arrays
          if (Array.isArray(block)) {
            return block.map(processBlock);
          }
          
          // Handle primitive types
          if (typeof block !== 'object') {
            return block;
          }
          
          // Process object properties
          const processed: any = {};
          for (const [key, value] of Object.entries(block)) {
            // Convert markdown in text fields (including accordion fields)
            if (['texto', 'titulo', 'descricao', 'content', 'trigger'].includes(key) && typeof value === 'string') {
              let htmlValue = convertMarkdownToHTML(value);
              
              // Check if this text contains bibliographic references
              if (htmlValue.match(/\[\d+\]/)) {
                console.log(`[Reference Detection] Found references in '${key}' field`);
                htmlValue = htmlValue
                  // Break after EACH reference number [1], [2], etc.
                  .replace(/(\[\d+\])\s*/g, '<br><br>$1 ')
                  // Break before " - URL:"
                  .replace(/\s*-\s*URL:/gi, '<br>- URL: ')
                  // Break before " - Autor:"
                  .replace(/\s*-\s*Autor:/gi, '<br>- Autor: ')
                  // Break after (PDF)
                  .replace(/(\(PDF\)|\[PDF\])/gi, '$1<br>')
                  // Normalize multiple breaks
                  .replace(/(<br\s*\/?>){3,}/gi, '<br><br>')
                  // Ensure spacing after URLs before next reference
                  .replace(/(https?:\/\/[^\s<]+)\s*(\[\d+\])/gi, '$1<br><br>$2')
                  // Clean up any trailing breaks and leading breaks
                  .replace(/(<br\s*\/?>)+$/gi, '')
                  .replace(/^(<br\s*\/?>)+/, '');
                
                console.log(`[Reference Detection] Applied formatting, new length: ${htmlValue.length}`);
              }
              
              processed[key] = htmlValue;
            }
            // Special handling for 'itens' array (e.g., references, guidelines)
            else if (key === 'itens' && Array.isArray(value)) {
              console.log(`[Processing] Found 'itens' array with ${value.length} items`);
              processed[key] = value.map((item, idx) => {
                if (typeof item === 'string') {
                  let htmlItem = convertMarkdownToHTML(item);
                  console.log(`[Item ${idx}] Original length: ${htmlItem.length} chars`);
                  
                  // Smart line breaking for bibliographic references
                  htmlItem = htmlItem
                    // 1. Break after reference number [1], [2], etc. (double break for separation)
                    .replace(/(\[\d+\])\s*([A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ])/g, '$1<br><br>$2')
                    // 2. Break BEFORE "- URL:" pattern (no matter spacing)
                    .replace(/\s*-\s*URL:/gi, '<br>- URL:')
                    // 3. Break BEFORE "- Autor:", "- Acesso:", etc.
                    .replace(/\s*-\s*(Autor|Acesso|Disponível|Editor|Editora|Publicado):/gi, '<br>- $1:')
                    // 4. Break after format indicators like (PDF), [PDF], etc.
                    .replace(/(\(PDF\)|\[PDF\]|\(Vídeo\)|\[Vídeo\]|\(Artigo\))/gi, '$1<br>')
                    // 5. Break very long URLs (80+ chars) at slashes
                    .replace(/(https?:\/\/[^\s]{80,}?)(\/)([^\s]{20,})/g, '$1/$2<br>$3');
                  
                  console.log(`[Item ${idx}] After processing: ${htmlItem.substring(0, 200)}...`);
                  return htmlItem;
                }
                return processBlock(item);
              });
            }
            // Recursively process objects/arrays (including accordion items)
            else if (typeof value === 'object' && value !== null) {
              processed[key] = processBlock(value);
            } 
            // Keep other values as-is
            else {
              processed[key] = value;
            }
          }
          return processed;
        }
        
        // 5. Process the entire structured data
        let processedData = processBlock(structuredData);
        
        // 5.5. Post-processing: Apply reference formatting to any text field
        console.log('[Post-Processing] Searching for reference text blocks...');
        function enhanceReferences(obj: any): any {
          if (typeof obj === 'string') {
            // Check if string contains reference patterns
            if (obj.match(/\[\d+\].*?(URL:|Autor:|Acesso:)/i)) {
              console.log('[Post-Processing] Found reference-like text, applying breaks');
              return obj
                .replace(/(\[\d+\])\s*([A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ])/g, '$1<br><br>$2')
                .replace(/\s*-\s*URL:/gi, '<br>- URL:')
                .replace(/\s*-\s*(Autor|Acesso|Disponível|Editor|Editora):/gi, '<br>- $1:')
                .replace(/(\(PDF\)|\[PDF\]|\(Vídeo\))/gi, '$1<br>');
            }
          } else if (Array.isArray(obj)) {
            return obj.map(item => enhanceReferences(item));
          } else if (obj && typeof obj === 'object') {
            const enhanced: any = {};
            for (const [k, v] of Object.entries(obj)) {
              enhanced[k] = enhanceReferences(v);
            }
            return enhanced;
          }
          return obj;
        }
        
        processedData = enhanceReferences(processedData);
        
        // 6. Call validation agent to fix any errors
        console.log('[Validation] Enviando para agente de validação...');
        
        try {
          const validationResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/validate-formatted-content`, {
            method: 'POST',
            headers: {
              'Authorization': req.headers.get('Authorization') || '',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ structuredContent: processedData }),
          });

          if (validationResponse.ok) {
            const validationData = await validationResponse.json();
            if (validationData.validatedContent) {
              processedData = validationData.validatedContent;
              console.log('[Validation] ✅ Conteúdo validado e corrigido pelo agente');
            } else {
              console.log('[Validation] ⚠️ Validação retornou null, usando dados processados originais');
            }
          } else {
            console.error('[Validation] ⚠️ Erro na validação, continuando com dados processados');
          }
        } catch (validationError) {
          console.error('[Validation] ⚠️ Erro ao chamar agente de validação:', validationError);
          // Continue with processed data even if validation fails
        }
        
        // 7. Convert back to JSON string
        formattedText = JSON.stringify(processedData);
        
        console.log('[Post-Processing] ✅ Conversão concluída. Markdown → HTML aplicado + Validação.');
        console.log(`[Post-Processing] Blocos processados: ${processedData.conteudo?.length || 0}`);
        console.log('[Post-Processing] Primeiros 3 blocos:', JSON.stringify(processedData.conteudo?.slice(0, 3), null, 2));
      } catch (parseError) {
        console.error('[Post-Processing] ❌ Erro ao processar JSON:', parseError);
        console.error('[Post-Processing] Erro detalhado:', parseError instanceof Error ? parseError.message : 'Unknown error');
        // If parsing fails, return original text (fallback for non-JSON responses)
      }
    }

    return new Response(JSON.stringify({ formattedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro ao formatar texto pedagógico:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
