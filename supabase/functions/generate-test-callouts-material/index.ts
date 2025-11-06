/**
 * ==========================================
 * GENERATE TEST CALLOUTS MATERIAL
 * ==========================================
 * 
 * Edge function para gerar material didático de TESTE
 * contendo TODOS os 12 tipos de callouts para validação
 * de cores e renderização.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[TestCallouts] 🧪 Generating test material with all 12 callout types...');

    // Material de teste com TODOS os 12 callouts
    const testMaterial = `# Material de Teste: Validação de Callouts

Este material foi gerado automaticamente para testar a renderização de **todos os 12 tipos de callouts** do sistema NextClass.

---

## 1. Conceito-Chave (Roxo)

> ✏️ Conceito-Chave: A **Primeira Lei da Termodinâmica** estabelece que a energia não pode ser criada nem destruída, apenas transformada de uma forma para outra. Matematicamente: $\\Delta U = Q - W$

---

## 2. Pergunta para Reflexão (Roxo)

> 🤔 Pergunta para Reflexão: Se um sistema recebe 500 J de calor e realiza 200 J de trabalho, qual será a variação de energia interna? Como você explicaria isso em termos físicos?

---

## 3. Dica Importante (Amarelo)

> 💡 Dica Importante: Para resolver problemas de termodinâmica rapidamente, sempre defina PRIMEIRO se o sistema é aberto ou fechado. Isso determina quais equações você pode usar!

---

## 4. Atenção (Laranja)

> ⚠️ Atenção: **Erro comum**: Muitos estudantes confundem calor ($Q$) com temperatura ($T$). Calor é energia em trânsito, temperatura é uma propriedade do sistema!

---

## 5. Exemplo Prático (Azul)

> 🔬 Exemplo Prático: Um motor a combustão recebe 10.000 J de calor da queima de gasolina e realiza 3.500 J de trabalho mecânico. A eficiência térmica é: $\\eta = \\frac{W}{Q_H} = \\frac{3.500}{10.000} = 0,35$ ou 35%

---

## 6. Resumo Executivo (Verde)

> 📊 Resumo Executivo: **Pontos-chave da Primeira Lei:**
> 1. Energia total do universo é constante ($\\Delta U_{universo} = 0$)
> 2. Calor e trabalho são formas de transferência de energia
> 3. A equação fundamental é $\\Delta U = Q - W$
> 4. Sistemas isolados não trocam energia com o ambiente

---

## 7. Aplicação Profissional (Índigo)

> 🏭 Aplicação Profissional: Engenheiros mecânicos usam a Primeira Lei para calcular a eficiência de turbinas em usinas termelétricas. Uma turbina típica converte apenas 40-50% da energia térmica em trabalho útil.

---

## 8. Exercício Rápido (Lima)

> ✍️ Exercício Rápido: Calcule a variação de energia interna de um gás que recebe 800 J de calor e sobre o qual é realizado um trabalho de 300 J. **Resposta**: $\\Delta U = 800 - (-300) = 1.100$ J

---

## 9. Erro Comum (Vermelho)

> ❌ Erro Comum: **NUNCA** use $\\Delta U = Q + W$ no sistema internacional! A convenção correta é $\\Delta U = Q - W$, onde $W$ é o trabalho realizado PELO sistema (positivo quando o sistema expande).

---

## 10. Aprofundamento (Violeta)

> 🔍 Aprofundamento: A Primeira Lei da Termodinâmica é uma consequência direta do **Princípio da Conservação da Energia** proposto por Julius von Mayer em 1842 e James Joule em 1843, que demonstraram experimentalmente a equivalência entre calor e trabalho.

---

## 11. Citação do Especialista (Cinza)

> 🎓 Citação do Especialista: "A energia do universo é constante; a entropia do universo tende a um máximo." - Rudolf Clausius, estabelecendo as duas primeiras leis da termodinâmica em 1865

---

## 12. Conexão com Outros Conceitos (Ciano)

> 🔗 Conexão com Outros Conceitos: A Primeira Lei conecta-se diretamente com:
> - **Segunda Lei**: determina a DIREÇÃO dos processos
> - **Entalpia**: definida como $H = U + PV$
> - **Ciclo de Carnot**: eficiência máxima teórica de máquinas térmicas
> - **Balanço de Massa**: conservação simultânea de massa e energia

---

## Conclusão

Este material de teste contém **todos os 12 tipos de callouts** do sistema NextClass:

| Tipo | Emoji | Cor | Status |
|------|-------|-----|--------|
| Conceito-Chave | ✏️ | Roxo | ✅ Testado |
| Pergunta para Reflexão | 🤔 | Roxo | ✅ Testado |
| Dica Importante | 💡 | Amarelo | ✅ Testado |
| Atenção | ⚠️ | Laranja | ✅ Testado |
| Exemplo Prático | 🔬 | Azul | ✅ Testado |
| Resumo Executivo | 📊 | Verde | ✅ Testado |
| Aplicação Profissional | 🏭 | Índigo | ✅ Testado |
| Exercício Rápido | ✍️ | Lima | ✅ Testado |
| Erro Comum | ❌ | Vermelho | ✅ Testado |
| Aprofundamento | 🔍 | Violeta | ✅ Testado |
| Citação do Especialista | 🎓 | Cinza | ✅ Testado |
| Conexão com Outros Conceitos | 🔗 | Ciano | ✅ Testado |

**Validação**: Se você vê 12 caixas coloridas diferentes acima, o sistema de callouts está funcionando perfeitamente! 🎉

---

*Material de teste gerado automaticamente pela edge function \`generate-test-callouts-material\`*
`;

    console.log('[TestCallouts] ✅ Test material generated successfully');
    console.log(`[TestCallouts] 📏 Material length: ${testMaterial.length} characters`);
    console.log('[TestCallouts] 📊 Contains all 12 callout types');

    return new Response(
      JSON.stringify({
        success: true,
        markdown_content: testMaterial,
        stats: {
          total_characters: testMaterial.length,
          total_callouts: 12,
          callout_types: [
            '✏️ Conceito-Chave',
            '🤔 Pergunta para Reflexão',
            '💡 Dica Importante',
            '⚠️ Atenção',
            '🔬 Exemplo Prático',
            '📊 Resumo Executivo',
            '🏭 Aplicação Profissional',
            '✍️ Exercício Rápido',
            '❌ Erro Comum',
            '🔍 Aprofundamento',
            '🎓 Citação do Especialista',
            '🔗 Conexão com Outros Conceitos'
          ]
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('[TestCallouts] ❌ Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
