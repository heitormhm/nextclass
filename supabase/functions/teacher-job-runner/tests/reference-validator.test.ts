/**
 * Unit tests for reference validator
 * 
 * PHASE 5: Validation Tests
 * 
 * Run these tests to ensure the corrected validateReferences() function
 * behaves as expected in different scenarios.
 * 
 * Usage (in Deno):
 * deno test supabase/functions/teacher-job-runner/tests/reference-validator.test.ts
 */

import { validateReferences } from '../validators/reference-validator.ts';
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

// ============================================================================
// TEST 1: Material WITHOUT reference section (should APPROVE by default)
// ============================================================================
Deno.test('validateReferences - should approve materials without reference section', () => {
  const noRefsMarkdown = `# Material Didático

## 1. Introdução

Este é um material educacional completo.

## 2. Conceitos Fundamentais

Conteúdo técnico detalhado aqui...

## 3. Conclusão

Resumo final do material.`;

  const result = validateReferences(noRefsMarkdown);
  
  assertEquals(result.valid, true, 'Should approve materials without ref section');
  assertEquals(result.academicPercentage, 0);
  assertEquals(result.bannedCount, 0);
  console.log('✅ TEST 1 PASSED: Materials without refs are approved');
});

// ============================================================================
// TEST 2: Material with 3 ACADEMIC references (should APPROVE)
// ============================================================================
Deno.test('validateReferences - should approve 3+ academic references', () => {
  const validMarkdown = `# Material Didático

## 1. Introdução
Conteúdo...

## 7. Fontes e Referências

[1] MIT (2020). Thermodynamics Study. https://mit.edu/paper-2020
[2] Nature Publishing Group (2021). Engineering Research. https://nature.com/article/12345
[3] IEEE (2022). Control Systems Paper. https://ieee.org/document/98765
`;

  const result = validateReferences(validMarkdown);
  
  assertEquals(result.valid, true, 'Should approve 3+ academic refs');
  assertEquals(result.academicPercentage, 100, 'Should be 100% academic');
  assertEquals(result.bannedCount, 0, 'Should have 0 banned sources');
  console.log('✅ TEST 2 PASSED: 3 academic refs approved');
});

// ============================================================================
// TEST 3: Material with 6 BANNED sources (should REJECT)
// ============================================================================
Deno.test('validateReferences - should reject 6+ banned sources', () => {
  const bannedMarkdown = `# Material Didático

## Referencias

[1] Brasil Escola. Termodinâmica. https://brasilescola.uol.com.br/fisica/termodinamica
[2] Mundo Educação. Primeira Lei. https://mundoeducacao.uol.com.br/fisica/primeira-lei
[3] Toda Matéria. Energia. https://todamateria.com.br/energia-termica
[4] Wikipedia. Thermodynamics. https://en.wikipedia.org/wiki/Thermodynamics
[5] YouTube Video. Aula de Física. https://youtube.com/watch?v=abc123
[6] Quora Answer. Termodinâmica básica. https://quora.com/Thermodynamics-basics
`;

  const result = validateReferences(bannedMarkdown);
  
  assertEquals(result.valid, false, 'Should reject 6+ banned sources');
  assertEquals(result.bannedCount, 6, 'Should detect 6 banned sources');
  console.log('✅ TEST 3 PASSED: 6 banned sources rejected');
});

// ============================================================================
// TEST 4: Mixed quality (3 academic + 2 banned = should APPROVE)
// ============================================================================
Deno.test('validateReferences - should approve mixed quality within limits', () => {
  const mixedMarkdown = `# Material

## 7. Referências

[1] Stanford University (2023). Engineering Principles. https://stanford.edu/papers/2023
[2] SciELO Brasil. Análise Térmica. https://scielo.br/article/s0100-40422023000100001
[3] Springer Nature. Advanced Thermodynamics. https://springer.com/chapter/10.1007/978-3-030-12345-6_7
[4] Brasil Escola. Conceitos básicos. https://brasilescola.uol.com.br/fisica
[5] Wikipedia. History. https://pt.wikipedia.org/wiki/Termodin%C3%A2mica
`;

  const result = validateReferences(mixedMarkdown);
  
  assertEquals(result.valid, true, 'Should approve: 2 banned ≤ 5 limit');
  assertEquals(result.bannedCount, 2, 'Should detect 2 banned sources');
  assertEquals(result.academicPercentage, 60, 'Should be 60% academic (3/5)');
  console.log('✅ TEST 4 PASSED: Mixed quality (3 academic + 2 banned) approved');
});

// ============================================================================
// TEST 5: Exactly 5 banned sources (edge case - should APPROVE)
// ============================================================================
Deno.test('validateReferences - should approve exactly 5 banned sources (edge case)', () => {
  const edgeCaseMarkdown = `# Material

## Fontes e Referências

[1] MIT (2023). Paper. https://mit.edu/research
[2] Brasil Escola. Conteúdo. https://brasilescola.uol.com.br/fisica
[3] Wikipedia. Article. https://en.wikipedia.org/wiki/Physics
[4] Mundo Educação. Texto. https://mundoeducacao.uol.com.br/fisica
[5] YouTube. Vídeo. https://youtube.com/watch?v=xyz
[6] Quora. Resposta. https://quora.com/question-123
`;

  const result = validateReferences(edgeCaseMarkdown);
  
  assertEquals(result.valid, true, 'Should approve: 5 banned = limit');
  assertEquals(result.bannedCount, 5, 'Should detect exactly 5 banned sources');
  console.log('✅ TEST 5 PASSED: Exactly 5 banned sources approved (edge case)');
});

// ============================================================================
// TEST 6: Less than 3 references (should REJECT)
// ============================================================================
Deno.test('validateReferences - should reject less than 3 references', () => {
  const tooFewMarkdown = `# Material

## 7. Referências

[1] MIT (2023). Paper 1. https://mit.edu/paper1
[2] Stanford (2023). Paper 2. https://stanford.edu/paper2
`;

  const result = validateReferences(tooFewMarkdown);
  
  assertEquals(result.valid, false, 'Should reject <3 references');
  assertEquals(result.errors[0], 'Menos de 3 referências fornecidas (encontradas: 2)');
  console.log('✅ TEST 6 PASSED: Less than 3 refs rejected');
});

// ============================================================================
// TEST 7: Alternative section titles (should APPROVE)
// ============================================================================
Deno.test('validateReferences - should support alternative section titles', () => {
  const altTitleMarkdown = `# Material

## Bibliografia

[1] MIT (2023). Paper. https://mit.edu/research
[2] IEEE (2022). Standard. https://ieee.org/standard
[3] Nature (2021). Article. https://nature.com/article
`;

  const result = validateReferences(altTitleMarkdown);
  
  assertEquals(result.valid, true, 'Should approve alternative section titles');
  assertEquals(result.academicPercentage, 100);
  console.log('✅ TEST 7 PASSED: Alternative section title "Bibliografia" recognized');
});

console.log('\n🎉 ALL TESTS PASSED! Reference validator is working correctly.\n');
