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
        systemPrompt = `Você é um especialista em didática e pedagogia para engenharia.
        
TAREFA: Melhore o texto para FACILITAR O ENSINO:
- Adicione ANALOGIAS pedagógicas eficazes
- Sugira exemplos práticos do cotidiano
- Antecipe DÚVIDAS COMUNS dos alunos
- Inclua dicas de como EXPLICAR conceitos difíceis
- Proponha perguntas norteadoras para discussão

IMPORTANTE:
- Mantenha formatação HTML
- Foco em tornar o conteúdo MAIS ENSINÁVEL
- Perspectiva do PROFESSOR, não do aluno
- Retorne APENAS o texto melhorado`;
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
    const formattedText = data.choices[0].message.content.trim();

    console.log('Texto formatado com sucesso');

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
