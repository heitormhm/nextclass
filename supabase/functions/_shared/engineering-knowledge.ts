// Enhanced Engineering Books Database for Teacher AI Chat
// Shared module for all teacher functions

export const ENGINEERING_BOOKS = [
  // Original 12 books from material-didatico-generator-v2
  { 
    title: 'Termodinâmica', 
    authors: 'Yunus A. Çengel & Michael A. Boles', 
    topics: ['termodinâmica', 'primeira lei', 'segunda lei', 'entropia', 'entalpia', 'ciclos térmicos', 'energia', 'calor', 'trabalho'], 
    trustScore: 10.0, 
    isbn: '978-0073398174' 
  },
  { 
    title: 'Mecânica dos Fluidos', 
    authors: 'Frank M. White', 
    topics: ['fluidos', 'escoamento', 'viscosidade', 'reynolds', 'bernoulli', 'turbulência', 'hidrodinâmica', 'pressão', 'vazão'], 
    trustScore: 10.0, 
    isbn: '978-0073398273' 
  },
  { 
    title: 'Resistência dos Materiais', 
    authors: 'Ferdinand P. Beer & E. Russell Johnston Jr.', 
    topics: ['tensão', 'deformação', 'flexão', 'torção', 'fadiga', 'estruturas', 'materiais', 'tração', 'compressão'], 
    trustScore: 10.0, 
    isbn: '978-0073398235' 
  },
  { 
    title: 'Fundamentos de Transferência de Calor e Massa', 
    authors: 'Frank P. Incropera & David P. DeWitt', 
    topics: ['transferência de calor', 'condução', 'convecção', 'radiação', 'massa', 'difusão', 'trocadores'], 
    trustScore: 10.0, 
    isbn: '978-0471457282' 
  },
  { 
    title: 'Fenômenos de Transporte', 
    authors: 'R. Byron Bird & Warren E. Stewart', 
    topics: ['transporte', 'momento', 'energia', 'massa', 'difusão', 'viscosidade', 'fluidos'], 
    trustScore: 9.5, 
    isbn: '978-0470115398' 
  },
  { 
    title: 'Cálculo - Volume 1', 
    authors: 'James Stewart', 
    topics: ['cálculo', 'derivadas', 'integrais', 'limites', 'funções', 'matemática', 'análise'], 
    trustScore: 10.0, 
    isbn: '978-1285740621' 
  },
  { 
    title: 'Cálculo - Volume 2', 
    authors: 'James Stewart', 
    topics: ['cálculo multivariável', 'integrais múltiplas', 'campos vetoriais', 'derivadas parciais', 'séries'], 
    trustScore: 10.0, 
    isbn: '978-1285741550' 
  },
  { 
    title: 'Álgebra Linear com Aplicações', 
    authors: 'Howard Anton', 
    topics: ['álgebra linear', 'matrizes', 'vetores', 'determinantes', 'sistemas lineares', 'autovalores'], 
    trustScore: 9.5, 
    isbn: '978-0471669593' 
  },
  { 
    title: 'Equações Diferenciais', 
    authors: 'Dennis G. Zill', 
    topics: ['equações diferenciais', 'edo', 'edp', 'transformada de laplace', 'séries de fourier'], 
    trustScore: 9.5, 
    isbn: '978-1111827052' 
  },
  { 
    title: 'Física para Cientistas e Engenheiros - Volume 1', 
    authors: 'Raymond A. Serway & John W. Jewett', 
    topics: ['mecânica', 'cinemática', 'dinâmica', 'energia', 'trabalho', 'física', 'newton'], 
    trustScore: 10.0, 
    isbn: '978-1133947271' 
  },
  { 
    title: 'Circuitos Elétricos', 
    authors: 'James W. Nilsson & Susan Riedel', 
    topics: ['circuitos', 'elétrica', 'resistência', 'capacitância', 'indutância', 'corrente', 'tensão'], 
    trustScore: 10.0, 
    isbn: '978-0136114994' 
  },
  { 
    title: 'Sistemas de Controle Modernos', 
    authors: 'Richard C. Dorf & Robert H. Bishop', 
    topics: ['controle', 'automação', 'sistemas', 'realimentação', 'estabilidade', 'pid', 'controlador'], 
    trustScore: 9.5, 
    isbn: '978-0136156734' 
  },
  
  // NEW ENHANCED BOOKS (10 additions for broader coverage)
  { 
    title: 'Eletrônica de Potência', 
    authors: 'Ned Mohan', 
    topics: ['eletrônica', 'potência', 'conversores', 'inversores', 'retificadores', 'tiristores', 'igbt'], 
    trustScore: 10.0, 
    isbn: '978-1118074800' 
  },
  { 
    title: 'Engenharia de Software', 
    authors: 'Ian Sommerville', 
    topics: ['software', 'programação', 'desenvolvimento', 'arquitetura', 'testes', 'requisitos', 'uml'], 
    trustScore: 9.5, 
    isbn: '978-0133943030' 
  },
  { 
    title: 'Álgebra Linear e Aplicações', 
    authors: 'Gilbert Strang', 
    topics: ['álgebra', 'matrizes', 'vetores', 'transformações', 'aplicações', 'espaços vetoriais'], 
    trustScore: 9.5, 
    isbn: '978-0980232776' 
  },
  { 
    title: 'Probabilidade e Estatística para Engenharia', 
    authors: 'Douglas C. Montgomery & George C. Runger', 
    topics: ['probabilidade', 'estatística', 'análise de dados', 'regressão', 'inferência', 'distribuições'], 
    trustScore: 9.5, 
    isbn: '978-1118539712' 
  },
  { 
    title: 'Ciência e Engenharia dos Materiais', 
    authors: 'William D. Callister Jr. & David G. Rethwisch', 
    topics: ['materiais', 'propriedades', 'estrutura', 'processamento', 'cerâmicas', 'polímeros', 'metais'], 
    trustScore: 10.0, 
    isbn: '978-1118324578' 
  },
  { 
    title: 'Química Geral', 
    authors: 'Raymond Chang', 
    topics: ['química', 'reações', 'estequiometria', 'termodinâmica química', 'ligações', 'ácidos', 'bases'], 
    trustScore: 9.0, 
    isbn: '978-0073402758' 
  },
  { 
    title: 'Desenho Técnico Moderno', 
    authors: 'Arlindo Silva & Carlos Tavares Ribeiro', 
    topics: ['desenho', 'cad', 'projetos', 'normas abnt', 'geometria', 'vistas', 'cotagem'], 
    trustScore: 9.0, 
    isbn: '978-8521634768' 
  },
  { 
    title: 'Gestão de Projetos - Guia PMBOK', 
    authors: 'PMI (Project Management Institute)', 
    topics: ['gestão', 'projetos', 'planejamento', 'custos', 'riscos', 'cronograma', 'escopo'], 
    trustScore: 9.0, 
    isbn: '978-1628256642' 
  },
  { 
    title: 'Sustentabilidade em Engenharia', 
    authors: 'Paulo Sérgio Barbosa dos Santos', 
    topics: ['sustentabilidade', 'meio ambiente', 'energia renovável', 'green engineering', 'impacto ambiental'], 
    trustScore: 8.5, 
    isbn: '978-8521634089' 
  },
  { 
    title: 'Normas ABNT para Engenharia Civil', 
    authors: 'ABNT (Associação Brasileira de Normas Técnicas)', 
    topics: ['normas', 'abnt', 'construção', 'segurança', 'especificações', 'nbr', 'estruturas'], 
    trustScore: 10.0, 
    isbn: 'N/A' 
  }
];

// Domain Trust Scoring (copied from material-didatico-generator-v2)
export const TRUSTED_DOMAINS = {
  tier1_books: [
    'mheducation.com', 'pearson.com', 'cengage.com', 'blucher.com.br', 
    'grupo-gen.com.br', 'grupoa.com.br', 'wiley.com', 'springer.com', 
    'cambridge.org', 'elsevier.com'
  ],
  tier2_academic: [
    'sciencedirect.com', 'ieeexplore.ieee.org', 'asme.org', 'scielo.br', 
    'periodicos.capes.gov.br', 'tandfonline.com', 'sagepub.com', 'jstor.org'
  ],
  tier3_universities: [
    'mit.edu', 'stanford.edu', 'caltech.edu', 'usp.br', 'unicamp.br', 
    'ita.br', 'ufrj.br', 'ufsc.br', 'poli.usp.br', '.edu'
  ]
};

export const BLACKLISTED_DOMAINS = [
  'wikipedia.org', 'wikihow.com', 'fandom.com', 'brainly.com', 'medium.com', 
  'blogspot.com', 'wordpress.com', 'sparknotes.com', 'cliffsnotes.com', 
  'shmoop.com', 'yahoo.com', 'answers.com', 'quora.com'
];

// Trust Score Calculator
export function calculateTrustScore(url: string, title: string): number {
  let score = 0;
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();
  
  // Check blacklist first - immediate disqualification
  if (BLACKLISTED_DOMAINS.some(domain => urlLower.includes(domain))) {
    return 0;
  }
  
  // Tier scoring
  if (TRUSTED_DOMAINS.tier1_books.some(d => urlLower.includes(d))) {
    score = 10;
  } else if (TRUSTED_DOMAINS.tier2_academic.some(d => urlLower.includes(d))) {
    score = 8;
  } else if (TRUSTED_DOMAINS.tier3_universities.some(d => urlLower.includes(d))) {
    score = 7;
  } else {
    score = 3; // Default for other sources
  }
  
  // Keyword bonuses
  if (titleLower.includes('textbook') || titleLower.includes('livro')) score += 2;
  if (titleLower.includes('engineering') || titleLower.includes('engenharia')) score += 1;
  if (urlLower.includes('pdf') || urlLower.includes('.edu/') || urlLower.includes('springer') || urlLower.includes('ieee')) score += 1;
  
  return Math.min(score, 10);
}

// Book Identifier Function - finds relevant books based on query
export function identifyRelevantBooks(query: string): typeof ENGINEERING_BOOKS {
  const queryLower = query.toLowerCase();
  
  const relevantBooks = ENGINEERING_BOOKS.filter(book => {
    // Check if any topic matches the query
    const topicMatch = book.topics.some(topic => 
      queryLower.includes(topic.toLowerCase()) || 
      topic.toLowerCase().includes(queryLower)
    );
    
    // Check if title matches
    const titleMatch = queryLower.includes(book.title.toLowerCase()) ||
                       book.title.toLowerCase().includes(queryLower);
    
    return topicMatch || titleMatch;
  });
  
  // Sort by trust score and return
  return relevantBooks.sort((a, b) => b.trustScore - a.trustScore);
}

// Format books for AI context
export function formatBooksForContext(books: typeof ENGINEERING_BOOKS): string {
  if (books.length === 0) return '';
  
  let context = '\n📚 **LIVROS DE ENGENHARIA RELEVANTES:**\n\n';
  
  books.slice(0, 5).forEach((book, index) => {
    context += `${index + 1}. **"${book.title}"** por ${book.authors}\n`;
    context += `   - ISBN: ${book.isbn}\n`;
    context += `   - Tópicos: ${book.topics.slice(0, 4).join(', ')}\n`;
    context += `   - Confiabilidade: ${book.trustScore}/10\n\n`;
  });
  
  return context;
}
