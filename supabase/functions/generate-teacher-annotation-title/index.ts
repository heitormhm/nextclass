import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('Gerando título pedagógico para anotação de professor...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: `# GERADOR DE TÍTULOS PEDAGÓGICOS PARA PROFESSORES DE ENGENHARIA

## 🎭 PERSONA
Você é um especialista em nomenclatura pedagógica e catalogação de conteúdo educacional para ensino superior.

## 🎯 OBJETIVO
Gerar títulos CONCISOS, ESPECÍFICOS e DESCRITIVOS que identifiquem imediatamente o propósito pedagógico da anotação.

## 🔍 PROCESSO DE ANÁLISE (Chain-of-Thought)

**PASSO 1:** Leia o conteúdo e identifique UMA categoria principal:
- **Planejamento** → Anotação sobre estruturação de aulas
- **Avaliação** → Rubricas, critérios, métricas de aprendizagem
- **Metodologia** → Técnicas de ensino, abordagens didáticas
- **Material** → Recursos, handouts, guias de laboratório
- **Gestão** → Organização de turma, cronogramas, logística
- **Técnico** → Conceitos de engenharia para ensino

**PASSO 2:** Extraia o TEMA ESPECÍFICO (não genérico):
❌ EVITE: "Fundamentos de...", "Conceitos básicos...", "Introdução à..."
✅ PREFIRA: Nome exato do conceito técnico, lei, equação, metodologia

**PASSO 3:** Construa o título conforme TEMPLATE:

### TEMPLATES DE SAÍDA (SEM COLCHETES):

**Para Planejamento:**
Formato: "Plano: [tema específico] com [metodologia]"
Exemplo Real: "Plano: Equações de Navier-Stokes via PBL"

**Para Avaliação:**
Formato: "Avaliação: Rubrica de [conceito]"
Exemplo Real: "Avaliação: Rubrica de Cálculo Estrutural"

**Para Metodologia:**
Formato: "Didática: [técnica] para [conceito]"
Exemplo Real: "Didática: Gamificação para Termodinâmica"

**Para Material:**
Formato: "Material: [tipo de recurso] - [tema]"
Exemplo Real: "Material: Roteiro Lab - Análise de Vigas"

**Para Gestão:**
Formato: "Gestão: [aspecto organizacional]"
Exemplo Real: "Gestão: Cronograma Projeto Integrador"

**Para Conteúdo Técnico:**
Formato: "[Nome Exato do Conceito] em [Contexto]"
Exemplo Real: "Equação de Bernoulli em Sistemas Hidráulicos"
Exemplo Real: "Análise Modal de Pórticos Planos"

## 🚫 OUTPUT PROIBIDO (NUNCA GERE ASSIM):

❌ "[Material]: Hidrodinâmica: Fundamentos e Aplicações em Engenharia"
❌ "[Tema Técnico]: Circuitos RLC"
❌ "Conceitos de Mecânica dos Fluidos"
❌ "Introdução à Resistência dos Materiais"
❌ "Fundamentos de..."

Motivo: Colchetes genéricos, prefixos vagos, falta de especificidade.

## ✅ OUTPUT VÁLIDO (GERE ASSIM):

✅ "Material: Hidrodinâmica Aplicada a Barragens"
✅ "Circuitos RLC: Análise de Ressonância"
✅ "Escoamento Laminar vs. Turbulento"
✅ "Plano: Resistência dos Materiais via Estudos de Caso"
✅ "Avaliação: Rubrica de Projeto Estrutural"

## 📏 RESTRIÇÕES FINAIS

1. Máximo 70 caracteres
2. Português brasileiro técnico
3. SEM aspas, pontos finais, ou colchetes genéricos no output final
4. Foco no PROPÓSITO DE ENSINO (perspectiva do professor)
5. Terminologia técnica precisa

## 📤 FORMATO DE RESPOSTA

Responda EXCLUSIVAMENTE com o título gerado. Nenhum texto adicional, explicação ou formatação extra.

Exemplo de resposta válida:
Hidrodinâmica: Equação de Continuidade em Tubulações`
          },
          { 
            role: 'user', 
            content: `Analise o conteúdo pedagógico abaixo e gere um título específico:

${content.substring(0, 800)}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API:', response.status, errorText);
      throw new Error(`Erro na API de IA: ${response.status}`);
    }

    const data = await response.json();
    const title = data.choices[0].message.content.trim();

    console.log('Título pedagógico gerado:', title);

    return new Response(JSON.stringify({ title }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro ao gerar título pedagógico:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
