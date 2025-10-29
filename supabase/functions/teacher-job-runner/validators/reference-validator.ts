/**
 * Academic reference validation utilities
 */

export interface ReferenceValidationResult {
  valid: boolean;
  academicPercentage: number;
  bannedCount: number;
  errors: string[];
}

/**
 * Validate academic quality of references
 * Rejects materials with excessive banned sources (low-quality sites)
 */
export function validateReferences(markdown: string): ReferenceValidationResult {
  console.log('[References Validator] 🔍 Checking reference quality...');
  
  const refSection = markdown.match(/##\s*\d+\.\s*Fontes e Referências(.+?)$/s)?.[1] || '';
  
  if (!refSection || refSection.trim().length < 50) {
    return { 
      valid: false, 
      academicPercentage: 0, 
      bannedCount: 0,
      errors: ['Seção de referências não encontrada ou vazia'] 
    };
  }
  
  const allRefs = refSection.match(/\[\d+\].+/g) || [];
  
  if (allRefs.length < 5) {
    return { 
      valid: false, 
      academicPercentage: 0,
      bannedCount: 0, 
      errors: ['Menos de 5 referências fornecidas'] 
    };
  }
  
  // Domínios banidos (baixa qualidade)
  const bannedDomains = [
    'brasilescola.uol.com.br',
    'mundoeducacao.uol.com.br',
    'todamateria.com.br',
    'wikipedia.org', 'pt.wikipedia.org', 'en.wikipedia.org',
    'infoescola.com',
    'soescola.com',
    'escolakids.uol.com.br',
    'educacao.uol.com.br',
    'blogspot.com',
    'wordpress.com',
    'uol.com.br/educacao',
    'youtube.com', 'youtu.be',
    'facebook.com', 'instagram.com',
    'quora.com', 'answers.yahoo.com',
    'brainly.com.br',
    'passeiweb.com', 'coladaweb.com', 'suapesquisa.com'
  ];
  
  // Domínios acadêmicos (alta qualidade)
  const academicDomains = [
    '.edu', '.edu.br', '.ac.uk', '.ac.br',
    '.gov', '.gov.br', '.gov.uk',
    'scielo.org', 'scielo.br',
    'journals.', 'journal.',
    'pubmed', 'ncbi.nlm.nih.gov',
    'springer.com', 'springerlink.com',
    'elsevier.com', 'sciencedirect.com',
    'wiley.com', 'nature.com', 'science.org',
    'researchgate.net', 'academia.edu',
    'ieee.org', 'ieeexplore.ieee.org',
    'acm.org', 'doi.org'
  ];
  
  let bannedCount = 0;
  let academicCount = 0;
  const errors: string[] = [];
  
  allRefs.forEach((ref, idx) => {
    const isBanned = bannedDomains.some(domain => ref.includes(domain));
    const isAcademic = academicDomains.some(domain => ref.includes(domain));
    
    if (isBanned) {
      bannedCount++;
      errors.push(`Referência [${idx + 1}] é de fonte banida: ${ref.substring(0, 80)}...`);
    }
    
    if (isAcademic) academicCount++;
  });
  
  const academicPercentage = (academicCount / allRefs.length) * 100;
  
  // ✅ VALIDAÇÃO SUAVE: Apenas bloquear excesso de fontes não confiáveis
  const MAX_BANNED_COUNT = 5; // Permitir até 5 fontes não confiáveis
  const isValid = bannedCount <= MAX_BANNED_COUNT;
  
  if (!isValid) {
    errors.push(`REJECTED: ${bannedCount} fontes banidas (máx: ${MAX_BANNED_COUNT})`);
  }
  
  console.log(`[References] ${academicCount}/${allRefs.length} academic (${academicPercentage.toFixed(0)}%), ${bannedCount} banned (max: ${MAX_BANNED_COUNT})`);
  
  if (!isValid) {
    console.error('[References Validator] ❌ INVALID REFERENCES:', errors);
  } else {
    console.log('[References Validator] ✅ References validated');
  }
  
  return { 
    valid: isValid, 
    academicPercentage,
    bannedCount, 
    errors 
  };
}
