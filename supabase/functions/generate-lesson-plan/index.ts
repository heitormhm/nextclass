import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();

    if (!content) {
      return new Response(JSON.stringify({ error: 'Conteúdo não fornecido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('🎓 Iniciando geração de plano de aula em duas fases...');

    // FASE 1: Análise Pedagógica
    const fase1SystemPrompt = `# ARQUITETO DE EXPERIÊNCIAS DE APRENDIZAGEM

Você é um Designer Instrucional Sênior especializado em Educação Superior e Ensino de Engenharia.

## TAREFA FASE 1: ANÁLISE PEDAGÓGICA
Analise o [TEXTO_BASE] fornecido e retorne EXCLUSIVAMENTE um JSON seguindo esta estrutura:

{
  "grande_area": "string",
  "disciplina": "string",
  "contexto_aplicacao": "string",
  "conceitos_chave": ["string", "string", "string"],
  "conceitos_secundarios": ["string", "string"],
  "topico_central": "string",
  "problema_central_pbl": "string",
  "objetivo_aprendizagem_macro": "string",
  "artefatos_entregaveis": ["string", "string"],
  "roteiro_aprendizagem": [
    {
      "titulo_material": "string",
      "tipo": "Texto de Problematização | Texto Expositivo Aprofundado | Exemplo Prático Resolvido | Estudo de Caso Dirigido | Guia de Atividade | Curadoria de Fontes | Perguntas de Reflexão",
      "objetivo_especifico": "string",
      "justificativa_pedagogica": "string"
    }
  ]
}

## DIRETRIZES OBRIGATÓRIAS:
- Baseie-se em Aprendizagem Baseada em Problemas (PBL)
- Identifique exatamente 3-5 conceitos-chave fundamentais
- Crie um problema autêntico e complexo do mundo real profissional
- O problema deve exigir integração de múltiplos conceitos
- Sequencie materiais pedagogicamente: contexto → teoria → prática → aplicação
- Cada material do roteiro deve ter justificativa pedagógica clara
- Os artefatos devem ser tangíveis e avaliáveis

## CONTEXTO:
O conteúdo fornecido é material educacional de nível superior na área de Engenharia ou Medicina.
`;

    console.log('📊 Fase 1: Análise pedagógica iniciada...');

    const fase1Response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: fase1SystemPrompt },
          { role: 'user', content: `[TEXTO_BASE]:\n\n${content}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!fase1Response.ok) {
      const errorText = await fase1Response.text();
      console.error('Erro na Fase 1:', errorText);
      throw new Error(`Fase 1 falhou: ${fase1Response.status}`);
    }

    const fase1Data = await fase1Response.json();
    const fase1Content = fase1Data.choices[0].message.content;
    
    console.log('✅ Fase 1 concluída. Extraindo JSON...');
    
    // Extrair JSON da resposta
    let jsonAnalise;
    try {
      const jsonMatch = fase1Content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonAnalise = JSON.parse(jsonMatch[0]);
      } else {
        jsonAnalise = JSON.parse(fase1Content);
      }
    } catch (e) {
      console.error('Erro ao parsear JSON da Fase 1:', e);
      console.log('Conteúdo recebido:', fase1Content);
      throw new Error('Falha ao parsear análise pedagógica');
    }

    console.log('📚 Análise pedagógica:', {
      disciplina: jsonAnalise.disciplina,
      conceitos: jsonAnalise.conceitos_chave?.length || 0,
      materiais: jsonAnalise.roteiro_aprendizagem?.length || 0
    });

    // FASE 2: Geração de Conteúdo Estruturado
    const fase2SystemPrompt = `# MESTRE COMUNICADOR E ESPECIALISTA DE DOMÍNIO

Você é um Professor Doutor renomado na área de ${jsonAnalise.disciplina || 'Engenharia'} e autor de livros didáticos premiados.

## TAREFA FASE 2: GERAÇÃO DE CONTEÚDO ESTRUTURADO
Com base no {JSON_ANALISE} da Fase 1 e no {TEXTO_BASE}, gere um plano de aula completo em JSON estruturado.

## ESTRUTURA DO JSON DE SAÍDA:

{
  "titulo_geral": "string",
  "metadata": {
    "disciplina": "string",
    "grande_area": "string",
    "duracao_estimada": "string",
    "problema_central": "string"
  },
  "conteudo": [
    // Array de blocos pedagógicos
  ]
}

## TIPOS DE BLOCOS DISPONÍVEIS:

1. **h2, h3, h4**: Títulos hierárquicos
   { "tipo": "h2", "texto": "Título da Seção" }

2. **paragrafo**: Texto principal (pode conter HTML: strong, em, br, u)
   { "tipo": "paragrafo", "texto": "Texto do parágrafo..." }

3. **caixa_de_destaque**: Definições, fórmulas, teoremas importantes
   { "tipo": "caixa_de_destaque", "titulo": "Título", "texto": "Conteúdo destacado..." }

4. **post_it**: Dicas, alertas, reflexões (4 categorias)
   { "tipo": "post_it", "texto": "💡 <strong>Dica Profissional:</strong> conteúdo..." }
   Categorias:
   - 🤔 Pense Nisto: (reflexão/metacognição)
   - 💡 Dica Profissional: (prática/aplicação)
   - 🌍 Aplicação Prática: (mundo real)
   - ⚠️ Atenção: (alertas/erros comuns)

5. **checklist**: Lista de tarefas/objetivos verificáveis
   { "tipo": "checklist", "titulo": "Título do Checklist", "itens": ["item 1", "item 2"] }

6. **fluxograma/mapa_mental/diagrama**: Visualizações Mermaid
   { 
     "tipo": "fluxograma", 
     "titulo": "Título", 
     "descricao": "Descrição",
     "definicao_mermaid": "graph TD\\nA[Início] --> B[Fim]"
   }

7. **grafico**: Dados quantitativos
   { 
     "tipo": "grafico", 
     "titulo": "Título",
     "descricao": "Descrição",
     "tipo_grafico": "barras|pizza|linha",
     "dados": [{"x": "label", "y": valor}]
   }

8. **componente_react**: Accordion para conteúdo extenso
   {
     "tipo": "componente_react",
     "componente": "Accordion",
     "props": {
       "items": [
         {"trigger": "Título", "content": "Conteúdo..."}
       ]
     }
   }

9. **referencias**: Fontes bibliográficas (SEMPRE ao final)
   { "tipo": "referencias", "titulo": "Referências", "itens": ["[1] Autor. Título. Editora, ano.<br><br>"] }

## DIRETRIZES DE EQUILÍBRIO (OBRIGATÓRIAS):

### Variedade de Blocos:
- NO MÁXIMO 2-3 Accordions por material
- SEMPRE incluir 3-5 post_its estratégicos
- SEMPRE incluir 1-3 checklists para ações práticas
- SEMPRE incluir 1-2 diagramas Mermaid (fluxograma, mapa mental ou diagrama)
- Intercalar blocos textuais com elementos visuais a cada 2-3 parágrafos

### Priorização Visual:
- Processos sequenciais → fluxograma
- Hierarquias/estruturas → diagrama
- Conceito central com ramificações → mapa_mental
- Dados quantitativos → gráfico (variar tipos: barras, pizza, linha)

### Post-Its Estratégicos:
- Use em pontos críticos do conteúdo
- Varie as 4 categorias ao longo do material
- Não agrupe mais de 2 post-its seguidos
- Use HTML (strong, em) para destacar palavras-chave

### Checklists:
- Use para objetivos de aprendizagem verificáveis (início)
- Use para etapas de atividades práticas (meio)
- Use para critérios de avaliação ou auto-verificação (fim)
- Cada item deve ser claro e acionável

### Diagramas Mermaid:
- Use sintaxe simples e válida
- SEMPRE use \\n para quebras de linha (não \\\\n)
- SEMPRE use --> para setas (não →)
- Evite caracteres especiais em labels
- Máximo 8-10 nós por diagrama

## ESTRUTURA PEDAGÓGICA:

Para cada material do roteiro_aprendizagem, gere:

1. **Texto de Problematização**: Inicie com h2, use storytelling, apresente o problema PBL, termine com checklist de objetivos
2. **Texto Expositivo**: h2 + teoria aprofundada + caixa_de_destaque para fórmulas + post_its de dicas + mapa_mental dos conceitos
3. **Exemplo Prático**: h3 + estrutura "Dados/Hipóteses/Resolução/Análise" + fluxograma da metodologia + post_it de atenção
4. **Curadoria de Fontes**: h3 + lista explicada + referencias ao final

## RESTRIÇÕES:
- Precisão técnica inegociável (informações corretas)
- Tom acadêmico, encorajador e desafiador
- Markdown dentro de campos texto (strong, em, br, u)
- Referências com <br><br> entre itens
- NÃO copie trechos do texto base - sintetize e expanda
- Taxonomia de Bloom: focar em Aplicação/Análise/Criação

## EXEMPLO DE ESTRUTURA COMPLETA:

{
  "titulo_geral": "Hidrodinâmica Aplicada à Engenharia",
  "metadata": {
    "disciplina": "Mecânica dos Fluidos",
    "grande_area": "Engenharias",
    "duracao_estimada": "4 horas/aula",
    "problema_central": "Otimizar sistema de distribuição de água em cidade de médio porte"
  },
  "conteudo": [
    { "tipo": "h2", "texto": "O Desafio da Distribuição Eficiente" },
    { "tipo": "paragrafo", "texto": "Uma cidade de 50 mil habitantes..." },
    { "tipo": "caixa_de_destaque", "titulo": "Problema Central (PBL)", "texto": "Você foi contratado como engenheiro consultor..." },
    { "tipo": "checklist", "titulo": "✅ Objetivos de Aprendizagem", "itens": ["Aplicar equação de Bernoulli", "Calcular perdas de carga"] },
    { "tipo": "post_it", "texto": "🤔 <strong>Pense Nisto:</strong> Por que sistemas de água precisam de bombas?" },
    { "tipo": "h3", "texto": "Fundamentos Teóricos" },
    { "tipo": "paragrafo", "texto": "A equação de Bernoulli..." },
    { "tipo": "mapa_mental", "titulo": "Conceitos da Hidrodinâmica", "descricao": "Visão geral", "definicao_mermaid": "graph TD\\nA[Hidrodinâmica] --> B[Bernoulli]\\nA --> C[Continuidade]" },
    { "tipo": "post_it", "texto": "💡 <strong>Dica Profissional:</strong> Sempre identifique as hipóteses simplificadoras" },
    { "tipo": "fluxograma", "titulo": "Metodologia de Resolução", "descricao": "Passo a passo", "definicao_mermaid": "graph TD\\nStart[Identificar Sistema] --> Step1[Definir VC] --> Step2[Aplicar Bernoulli]" },
    { "tipo": "checklist", "titulo": "📋 Etapas da Atividade", "itens": ["Coletar dados", "Modelar sistema", "Calcular perdas"] },
    { "tipo": "post_it", "texto": "⚠️ <strong>Atenção:</strong> Erro comum - esquecer de converter unidades!" },
    { "tipo": "referencias", "titulo": "📚 Referências Bibliográficas", "itens": ["[1] Fox, R. W. <em>Introdução à Mecânica dos Fluidos</em>. LTC, 2018.<br><br>"] }
  ]
}

RETORNE APENAS O JSON ESTRUTURADO, SEM TEXTO ADICIONAL.
`;

    console.log('🎨 Fase 2: Geração de conteúdo iniciada...');

    const fase2Response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: fase2SystemPrompt },
          { 
            role: 'user', 
            content: `{JSON_ANALISE}:\n${JSON.stringify(jsonAnalise, null, 2)}\n\n{TEXTO_BASE}:\n${content}` 
          }
        ],
        temperature: 0.5,
      }),
    });

    if (!fase2Response.ok) {
      const errorText = await fase2Response.text();
      console.error('Erro na Fase 2:', errorText);
      throw new Error(`Fase 2 falhou: ${fase2Response.status}`);
    }

    const fase2Data = await fase2Response.json();
    let fase2Content = fase2Data.choices[0].message.content;
    
    console.log('✅ Fase 2 concluída. Extraindo e validando JSON...');

    // Extrair JSON da resposta
    let structuredContent;
    try {
      const jsonMatch = fase2Content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structuredContent = JSON.parse(jsonMatch[0]);
      } else {
        structuredContent = JSON.parse(fase2Content);
      }
    } catch (e) {
      console.error('Erro ao parsear JSON da Fase 2:', e);
      throw new Error('Falha ao parsear conteúdo estruturado');
    }

    // VALIDAÇÕES DE SEGURANÇA
    console.log('🔒 Aplicando validações de segurança...');

    if (structuredContent.conteudo && Array.isArray(structuredContent.conteudo)) {
      structuredContent.conteudo = structuredContent.conteudo.map((bloco: any) => {
        // Sanitizar Mermaid: remover caracteres Unicode problemáticos
        if (bloco.definicao_mermaid) {
          bloco.definicao_mermaid = bloco.definicao_mermaid
            .replace(/→/g, '-->')
            .replace(/\\\\n/g, '\\n')
            .replace(/[\u2192\u21D2\u27A1]/g, '-->')
            .trim();
          
          // Validar sintaxe básica Mermaid
          if (!bloco.definicao_mermaid.match(/^(graph|flowchart|sequenceDiagram|classDiagram|erDiagram|gantt|pie|journey)/)) {
            console.warn('⚠️ Diagrama Mermaid sem tipo válido, removendo:', bloco.titulo);
            delete bloco.definicao_mermaid;
          }
        }

        // Garantir <br><br> em referências
        if (bloco.tipo === 'referencias' && bloco.itens) {
          bloco.itens = bloco.itens.map((ref: string) => {
            if (!ref.endsWith('<br><br>')) {
              return ref + '<br><br>';
            }
            return ref;
          });
        }

        // Limitar HTML permitido em post_its e caixas
        const allowedTags = ['strong', 'em', 'br', 'u'];
        if (bloco.texto && typeof bloco.texto === 'string') {
          // Remove tags não permitidas (simplificado)
          bloco.texto = bloco.texto.replace(/<(?!\/?(?:strong|em|br|u)\b)[^>]+>/gi, '');
        }

        return bloco;
      });
    }

    // Adicionar metadata da Fase 1 se não existir
    if (!structuredContent.metadata) {
      structuredContent.metadata = {
        disciplina: jsonAnalise.disciplina,
        grande_area: jsonAnalise.grande_area,
        duracao_estimada: "4 horas/aula",
        problema_central: jsonAnalise.problema_central_pbl
      };
    }

    console.log('✅ Plano de aula gerado com sucesso!');
    console.log('📊 Estatísticas:', {
      blocos_totais: structuredContent.conteudo?.length || 0,
      checklists: structuredContent.conteudo?.filter((b: any) => b.tipo === 'checklist').length || 0,
      postits: structuredContent.conteudo?.filter((b: any) => b.tipo === 'post_it').length || 0,
      diagramas: structuredContent.conteudo?.filter((b: any) => ['fluxograma', 'mapa_mental', 'diagrama'].includes(b.tipo)).length || 0
    });

    return new Response(JSON.stringify({ structuredContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro na geração do plano de aula:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
