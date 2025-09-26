// Engineering module data for lectures, quizzes, and flashcards

export interface ModuleData {
  id: number;
  title: string;
  description: string;
  professor: string;
  summary: string;
  topics: string[];
  moduleProgress: number;
  currentLessonIndex: number;
  enhancedContent: string;
  transcript: string;
}

export interface QuizData {
  title: string;
  description: string;
  totalQuestions: number;
  questions: Array<{
    id: number;
    type: "multiple-choice" | "true-false" | "fill-blank" | "short-answer";
    question: string;
    options?: string[];
    correctAnswer?: number | boolean;
    correctAnswers?: string[];
    expectedKeywords?: string[];
    explanation: string;
  }>;
}

export interface FlashcardSet {
  id: string;
  question: string;
  answer: string;
  tags: string[];
}

export const engineeringModules: Record<number, ModuleData> = {
  1: {
    id: 1,
    title: "Princípios de Termodinâmica",
    description: "Esta aula aborda os conceitos fundamentais da termodinâmica, incluindo as leis zero, primeira e segunda, e sua aplicação em ciclos de potência e máquinas térmicas.",
    professor: "Prof. Beatriz Lima",
    summary: "Fundamentos da termodinâmica aplicados à engenharia",
    topics: ["Leis da Termodinâmica", "Ciclo de Carnot", "Entropia", "Transferência de Calor"],
    moduleProgress: 45,
    currentLessonIndex: 2,
    enhancedContent: "**Conceitos Fundamentais**: O sistema termodinâmico é a região do universo que estamos estudando. A Primeira Lei (Conservação de Energia) afirma que a energia não pode ser criada nem destruída. A Segunda Lei introduz o conceito de entropia e a direção dos processos naturais.\n\n**Aplicações Práticas**: Os princípios termodinâmicos são aplicados em motores de combustão interna, turbinas a vapor, refrigeradores e bombas de calor.",
    transcript: "[00:00:15] Professor: Bom dia, turma. Hoje vamos abordar os princípios da termodinâmica, começando pela definição de sistema, vizinhança e fronteira..."
  },
  2: {
    id: 2,
    title: "Circuitos Elétricos I: Análise DC",
    description: "Análise de circuitos resistivos em corrente contínua, aplicando as Leis de Ohm e de Kirchhoff para resolver circuitos complexos.",
    professor: "Prof. Ana Santos",
    summary: "Fundamentos de análise de circuitos em corrente contínua",
    topics: ["Lei de Ohm", "Leis de Kirchhoff", "Circuitos em Série e Paralelo", "Análise Nodal"],
    moduleProgress: 60,
    currentLessonIndex: 3,
    enhancedContent: "**Lei de Ohm**: V = I × R estabelece a relação fundamental entre tensão, corrente e resistência.\n\n**Leis de Kirchhoff**: A Lei das Correntes (LCK) afirma que a soma das correntes entrando em um nó é igual à soma das correntes saindo. A Lei das Tensões (LTK) estabelece que a soma das tensões em uma malha fechada é zero.",
    transcript: "[00:00:20] Professor: Vamos começar revisando a Lei de Ohm. Esta lei fundamental relaciona tensão, corrente e resistência através da equação V = I × R..."
  },
  3: {
    id: 3,
    title: "Análise Estrutural: Vigas e Treliças",
    description: "Estudo do comportamento de estruturas sob carregamento, incluindo análise de tensões, deformações e critérios de falha.",
    professor: "Prof. Carlos Rodriguez",
    summary: "Princípios de análise estrutural aplicados a vigas e treliças",
    topics: ["Diagrama de Esforços", "Flexão em Vigas", "Análise de Treliças", "Critérios de Falha"],
    moduleProgress: 35,
    currentLessonIndex: 1,
    enhancedContent: "**Análise de Vigas**: O momento fletor causa tensões normais que variam linearmente na seção transversal. A força cortante produz tensões cisalhantes.\n\n**Treliças**: Estruturas formadas por barras articuladas que trabalham apenas à tração ou compressão.",
    transcript: "[00:00:10] Professor: Na análise estrutural, precisamos compreender como as forças atuam nas estruturas. Vamos começar com o conceito de equilíbrio..."
  },
  4: {
    id: 4,
    title: "Mecânica dos Fluidos: Escoamento Viscoso",
    description: "Estudo do comportamento de fluidos em movimento, incluindo viscosidade, perda de carga e análise dimensional.",
    professor: "Prof. Marina Silva",
    summary: "Fundamentos do escoamento de fluidos viscosos",
    topics: ["Viscosidade", "Número de Reynolds", "Perda de Carga", "Análise Dimensional"],
    moduleProgress: 50,
    currentLessonIndex: 2,
    enhancedContent: "**Viscosidade**: Propriedade que caracteriza a resistência do fluido ao cisalhamento. Fluidos newtonianos apresentam viscosidade constante.\n\n**Número de Reynolds**: Re = ρVD/μ determina se o escoamento é laminar ou turbulento.",
    transcript: "[00:00:25] Professor: A mecânica dos fluidos estuda o comportamento de líquidos e gases em repouso e movimento. Começaremos com o conceito de viscosidade..."
  },
  5: {
    id: 5,
    title: "Sistemas de Controle: Resposta Transitória",
    description: "Análise da resposta de sistemas de controle, incluindo estabilidade, controladores PID e técnicas de compensação.",
    professor: "Prof. Roberto Chen",
    summary: "Fundamentos de sistemas de controle automático",
    topics: ["Função de Transferência", "Estabilidade", "Controladores PID", "Resposta Transitória"],
    moduleProgress: 25,
    currentLessonIndex: 1,
    enhancedContent: "**Função de Transferência**: G(s) = Y(s)/X(s) relaciona saída e entrada no domínio da frequência.\n\n**Controladores PID**: Combinam ação proporcional, integral e derivativa para melhorar a resposta do sistema.",
    transcript: "[00:00:18] Professor: Os sistemas de controle são essenciais na engenharia moderna. Vamos estudar como analisar e projetar controladores automáticos..."
  }
};

export const engineeringQuizzes: Record<number, QuizData> = {
  1: {
    title: "Teste de Fundamentos de Termodinâmica",
    description: "Avalie seus conhecimentos sobre leis termodinâmicas e ciclos de potência",
    totalQuestions: 4,
    questions: [
      {
        id: 1,
        type: "multiple-choice",
        question: "Qual é a principal consequência da Segunda Lei da Termodinâmica?",
        options: [
          "A energia total de um sistema isolado é constante",
          "A entropia de um sistema isolado tende a aumentar",
          "A temperatura absoluta zero é inatingível",
          "A pressão e o volume são inversamente proporcionais"
        ],
        correctAnswer: 1,
        explanation: "A Segunda Lei da Termodinâmica estabelece que a entropia de um sistema isolado nunca diminui, sempre aumenta ou permanece constante em processos reversíveis."
      },
      {
        id: 2,
        type: "true-false",
        question: "O Ciclo de Carnot é o ciclo termodinâmico mais eficiente possível entre duas temperaturas fixas.",
        correctAnswer: true,
        explanation: "Correto! O Ciclo de Carnot estabelece o limite superior teórico de eficiência para qualquer máquina térmica operando entre dois reservatórios térmicos."
      },
      {
        id: 3,
        type: "fill-blank",
        question: "A Primeira Lei da Termodinâmica pode ser expressa como: ΔU = _____ - _____",
        correctAnswers: ["Q", "W"],
        explanation: "A Primeira Lei estabelece que a variação da energia interna (ΔU) é igual ao calor adicionado (Q) menos o trabalho realizado pelo sistema (W)."
      },
      {
        id: 4,
        type: "short-answer",
        question: "Explique o conceito de entropia e sua importância na termodinâmica.",
        expectedKeywords: ["desordem", "irreversibilidade", "energia", "disponível"],
        explanation: "A entropia é uma medida da desordem de um sistema e está relacionada à irreversibilidade dos processos. É fundamental para determinar a direção natural dos processos termodinâmicos."
      }
    ]
  },
  2: {
    title: "Quiz de Análise de Circuitos DC",
    description: "Teste seus conhecimentos sobre circuitos resistivos em corrente contínua",
    totalQuestions: 4,
    questions: [
      {
        id: 1,
        type: "multiple-choice",
        question: "Qual lei estabelece que a soma das correntes entrando em um nó é igual à soma das correntes saindo?",
        options: [
          "Lei de Ohm",
          "Lei de Kirchhoff das Correntes (LCK)",
          "Lei de Kirchhoff das Tensões (LTK)",
          "Lei de Watt"
        ],
        correctAnswer: 1,
        explanation: "A Lei de Kirchhoff das Correntes (LCK) é baseada na conservação de carga elétrica e estabelece que a corrente total entrando em um nó deve ser igual à corrente total saindo."
      },
      {
        id: 2,
        type: "true-false",
        question: "Em um circuito série, a corrente é a mesma através de todos os componentes.",
        correctAnswer: true,
        explanation: "Correto! Em um circuito série, há apenas um caminho para a corrente, portanto ela é a mesma em todos os componentes."
      },
      {
        id: 3,
        type: "fill-blank",
        question: "A Lei de Ohm é expressa matematicamente como: V = _____ × _____",
        correctAnswers: ["I", "R"],
        explanation: "A Lei de Ohm estabelece que a tensão (V) é igual ao produto da corrente (I) pela resistência (R)."
      },
      {
        id: 4,
        type: "short-answer",
        question: "Como você calcularia a resistência equivalente de três resistores em paralelo?",
        expectedKeywords: ["inverso", "soma", "paralelo", "1/R"],
        explanation: "Para resistores em paralelo: 1/Req = 1/R1 + 1/R2 + 1/R3. A resistência equivalente é o inverso da soma dos inversos das resistências individuais."
      }
    ]
  },
  3: {
    title: "Avaliação de Análise Estrutural",
    description: "Teste seus conhecimentos sobre comportamento estrutural e análise de esforços",
    totalQuestions: 4,
    questions: [
      {
        id: 1,
        type: "multiple-choice",
        question: "O momento fletor máximo em uma viga simplesmente apoiada com carga uniformemente distribuída ocorre:",
        options: [
          "Nos apoios",
          "A 1/4 do vão",
          "No centro do vão",
          "A 3/4 do vão"
        ],
        correctAnswer: 2,
        explanation: "Para uma viga simplesmente apoiada com carga uniformemente distribuída, o momento fletor máximo ocorre no centro do vão, onde o momento é igual a wL²/8."
      },
      {
        id: 2,
        type: "true-false",
        question: "As barras de uma treliça ideal trabalham apenas com esforços axiais (tração ou compressão).",
        correctAnswer: true,
        explanation: "Correto! Em treliças ideais, as barras são consideradas articuladas nas extremidades e trabalham apenas com esforços normais (tração ou compressão)."
      },
      {
        id: 3,
        type: "fill-blank",
        question: "A tensão normal máxima devido à flexão em uma viga é calculada por σ = _____/_____ ",
        correctAnswers: ["M", "W"],
        explanation: "A tensão normal máxima devido à flexão é σ = M/W, onde M é o momento fletor e W é o módulo de resistência da seção."
      },
      {
        id: 4,
        type: "short-answer",
        question: "Explique a diferença entre tensão normal e tensão cisalhante em estruturas.",
        expectedKeywords: ["normal", "perpendicular", "cisalhante", "paralela", "seção"],
        explanation: "Tensão normal atua perpendicular à seção transversal (tração/compressão), enquanto tensão cisalhante atua paralela à seção transversal."
      }
    ]
  },
  4: {
    title: "Teste de Mecânica dos Fluidos",
    description: "Avalie seus conhecimentos sobre escoamento de fluidos e suas propriedades",
    totalQuestions: 4,
    questions: [
      {
        id: 1,
        type: "multiple-choice",
        question: "O Número de Reynolds é usado para determinar:",
        options: [
          "A viscosidade do fluido",
          "O tipo de escoamento (laminar ou turbulento)",
          "A densidade do fluido",
          "A velocidade crítica"
        ],
        correctAnswer: 1,
        explanation: "O Número de Reynolds (Re = ρVD/μ) é um parâmetro adimensional que caracteriza o tipo de escoamento: laminar (Re < 2300) ou turbulento (Re > 4000) para tubos."
      },
      {
        id: 2,
        type: "true-false",
        question: "A viscosidade de líquidos diminui com o aumento da temperatura.",
        correctAnswer: true,
        explanation: "Correto! Para líquidos, a viscosidade diminui com o aumento da temperatura, pois as moléculas ganham energia cinética e se movem mais facilmente."
      },
      {
        id: 3,
        type: "fill-blank",
        question: "A equação de Bernoulli relaciona _____, _____ e energia de elevação ao longo de uma linha de corrente.",
        correctAnswers: ["pressão", "velocidade"],
        explanation: "A equação de Bernoulli relaciona energia de pressão, energia cinética (velocidade) e energia potencial (elevação) para escoamento incompressível."
      },
      {
        id: 4,
        type: "short-answer",
        question: "Qual a importância da análise dimensional em mecânica dos fluidos?",
        expectedKeywords: ["parâmetros", "adimensional", "semelhança", "experimentos"],
        explanation: "A análise dimensional permite formar parâmetros adimensionais que facilitam a modelagem, reduzem variáveis experimentais e estabelecem leis de semelhança."
      }
    ]
  },
  5: {
    title: "Quiz de Sistemas de Controle",
    description: "Teste seus conhecimentos sobre análise e projeto de sistemas de controle",
    totalQuestions: 4,
    questions: [
      {
        id: 1,
        type: "multiple-choice",
        question: "Em um controlador PID, a ação integral serve para:",
        options: [
          "Reduzir o tempo de resposta",
          "Eliminar erro em regime permanente",
          "Reduzir o overshoot",
          "Aumentar a estabilidade"
        ],
        correctAnswer: 1,
        explanation: "A ação integral do controlador PID elimina o erro em regime permanente, integrando o erro ao longo do tempo e fornecendo correção acumulada."
      },
      {
        id: 2,
        type: "true-false",
        question: "Um sistema é estável se todos os polos da função de transferência em malha fechada estão no semi-plano esquerdo do plano s.",
        correctAnswer: true,
        explanation: "Correto! Para estabilidade BIBO (Bounded Input-Bounded Output), todos os polos devem ter parte real negativa, ou seja, estar no semi-plano esquerdo."
      },
      {
        id: 3,
        type: "fill-blank",
        question: "A função de transferência relaciona a saída Y(s) com a entrada X(s): G(s) = _____/_____",
        correctAnswers: ["Y(s)", "X(s)"],
        explanation: "A função de transferência G(s) é definida como a razão entre a transformada de Laplace da saída e da entrada, com condições iniciais nulas."
      },
      {
        id: 4,
        type: "short-answer",
        question: "Explique o conceito de margem de fase em sistemas de controle.",
        expectedKeywords: ["estabilidade", "frequência", "fase", "ganho", "graus"],
        explanation: "Margem de fase é a quantidade adicional de atraso de fase que pode ser tolerada antes que o sistema se torne instável, medida na frequência onde o ganho é 0 dB."
      }
    ]
  }
};

export const engineeringFlashcards: Record<number, FlashcardSet[]> = {
  1: [
    {
      id: 'fc1-1',
      question: 'O que define a Primeira Lei da Termodinâmica?',
      answer: 'O princípio da conservação de energia, afirmando que a variação da energia interna de um sistema é igual ao calor adicionado menos o trabalho realizado (ΔU = Q - W).',
      tags: ['Termodinâmica', 'Leis Fundamentais']
    },
    {
      id: 'fc1-2',
      question: 'O que é Entropia?',
      answer: 'Uma medida da desordem ou aleatoriedade de um sistema. Em um sistema isolado, a entropia sempre tende a aumentar ou permanecer constante.',
      tags: ['Termodinâmica', 'Segunda Lei']
    },
    {
      id: 'fc1-3',
      question: 'Qual é a eficiência máxima teórica de uma máquina térmica?',
      answer: 'A eficiência do Ciclo de Carnot: η = 1 - Tc/Th, onde Tc é a temperatura da fonte fria e Th da fonte quente (em Kelvin).',
      tags: ['Termodinâmica', 'Ciclo de Carnot']
    },
    {
      id: 'fc1-4',
      question: 'O que caracteriza um processo reversível?',
      answer: 'Um processo que pode ser invertido sem deixar vestígios no sistema e no meio ambiente. É um processo quase-estático sem atrito ou outras irreversibilidades.',
      tags: ['Termodinâmica', 'Processos']
    },
    {
      id: 'fc1-5',
      question: 'Como se calcula o trabalho em um processo termodinâmico?',
      answer: 'W = ∫P dV para processos com variação de volume. O trabalho é a área sob a curva P-V no diagrama termodinâmico.',
      tags: ['Termodinâmica', 'Trabalho']
    }
  ],
  2: [
    {
      id: 'fc2-1',
      question: 'Qual é a Lei de Ohm?',
      answer: 'V = I × R, onde V é a tensão (volts), I é a corrente (ampères) e R é a resistência (ohms).',
      tags: ['Circuitos', 'Leis Fundamentais']
    },
    {
      id: 'fc2-2',
      question: 'O que estabelece a Lei de Kirchhoff das Correntes (LCK)?',
      answer: 'A soma algébrica das correntes entrando em um nó é igual à soma das correntes saindo. Baseada na conservação de carga elétrica.',
      tags: ['Circuitos', 'Análise Nodal']
    },
    {
      id: 'fc2-3',
      question: 'Como calcular resistência equivalente em série?',
      answer: 'Req = R1 + R2 + R3 + ... A resistência equivalente é a soma das resistências individuais.',
      tags: ['Circuitos', 'Série']
    },
    {
      id: 'fc2-4',
      question: 'Como calcular resistência equivalente em paralelo?',
      answer: '1/Req = 1/R1 + 1/R2 + 1/R3 + ... O inverso da resistência equivalente é a soma dos inversos.',
      tags: ['Circuitos', 'Paralelo']
    },
    {
      id: 'fc2-5',
      question: 'O que é potência elétrica?',
      answer: 'P = V × I = I²R = V²/R. É a taxa de conversão de energia elétrica, medida em watts.',
      tags: ['Circuitos', 'Potência']
    }
  ],
  3: [
    {
      id: 'fc3-1',
      question: 'O que é momento fletor em uma viga?',
      answer: 'É o momento interno que causa flexão na viga, resultando em tensões normais de tração e compressão na seção transversal.',
      tags: ['Estruturas', 'Flexão']
    },
    {
      id: 'fc3-2',
      question: 'Como se calcula a tensão normal devido à flexão?',
      answer: 'σ = M×y/I ou σ = M/W, onde M é o momento fletor, y é a distância da linha neutra, I é o momento de inércia e W é o módulo de resistência.',
      tags: ['Estruturas', 'Tensões']
    },
    {
      id: 'fc3-3',
      question: 'Principais tipos de cargas estruturais',
      answer: 'Cargas permanentes (peso próprio), cargas variáveis (sobrecarga de uso) e cargas excepcionais (vento, sismos, impacto).',
      tags: ['Estruturas', 'Carregamentos']
    },
    {
      id: 'fc3-4',
      question: 'O que caracteriza uma treliça ideal?',
      answer: 'Estrutura formada por barras retas conectadas por articulações, onde as barras trabalham apenas à tração ou compressão pura.',
      tags: ['Estruturas', 'Treliças']
    },
    {
      id: 'fc3-5',
      question: 'Como determinar se uma barra está tracionada ou comprimida?',
      answer: 'Se o esforço normal for positivo (convenção: afastando-se da seção), a barra está tracionada. Se negativo, está comprimida.',
      tags: ['Estruturas', 'Esforços']
    }
  ],
  4: [
    {
      id: 'fc4-1',
      question: 'O que é viscosidade dinâmica?',
      answer: 'Propriedade que caracteriza a resistência do fluido à deformação por cisalhamento. Relaciona tensão cisalhante com gradiente de velocidade (τ = μ du/dy).',
      tags: ['Fluidos', 'Propriedades']
    },
    {
      id: 'fc4-2',
      question: 'Como se calcula o Número de Reynolds?',
      answer: 'Re = ρVD/μ = VD/ν, onde ρ é densidade, V é velocidade, D é diâmetro, μ é viscosidade dinâmica e ν é viscosidade cinemática.',
      tags: ['Fluidos', 'Análise Dimensional']
    },
    {
      id: 'fc4-3',
      question: 'O que estabelece a Equação de Bernoulli?',
      answer: 'P/ρ + V²/2 + gz = constante. Relaciona pressão, velocidade e elevação ao longo de uma linha de corrente para escoamento incompressível.',
      tags: ['Fluidos', 'Energia']
    },
    {
      id: 'fc4-4',
      question: 'Diferença entre escoamento laminar e turbulento',
      answer: 'Laminar: escoamento ordenado em camadas (Re < 2300). Turbulento: escoamento caótico com mistura (Re > 4000). Entre eles: zona de transição.',
      tags: ['Fluidos', 'Tipos de Escoamento']
    },
    {
      id: 'fc4-5',
      question: 'O que é perda de carga?',
      answer: 'Redução da energia mecânica do fluido devido ao atrito e turbulência. Pode ser distribuída (ao longo do tubo) ou localizada (singularidades).',
      tags: ['Fluidos', 'Perdas']
    }
  ],
  5: [
    {
      id: 'fc5-1',
      question: 'O que é uma função de transferência?',
      answer: 'G(s) = Y(s)/X(s). Relação entre transformadas de Laplace da saída e entrada de um sistema linear, com condições iniciais nulas.',
      tags: ['Controle', 'Modelagem']
    },
    {
      id: 'fc5-2',
      question: 'Como funciona um controlador PID?',
      answer: 'Combina três ações: Proporcional (Kp×e), Integral (Ki∫e dt) e Derivativa (Kd de/dt). U(s) = Kp + Ki/s + Kd×s.',
      tags: ['Controle', 'Controladores']
    },
    {
      id: 'fc5-3',
      question: 'Critério de estabilidade para sistemas lineares',
      answer: 'Sistema é estável se todos os polos da função de transferência em malha fechada têm parte real negativa (semi-plano esquerdo do plano s).',
      tags: ['Controle', 'Estabilidade']
    },
    {
      id: 'fc5-4',
      question: 'O que é erro em regime permanente?',
      answer: 'Diferença entre valor desejado e valor final da saída após o sistema atingir regime permanente. Depende do tipo de sistema e entrada.',
      tags: ['Controle', 'Desempenho']
    },
    {
      id: 'fc5-5',
      question: 'Diferença entre controle em malha aberta e fechada',
      answer: 'Malha aberta: sem realimentação, sensível a distúrbios. Malha fechada: com realimentação, compara saída com referência, mais robusto.',
      tags: ['Controle', 'Estruturas']
    }
  ]
};

// Module content structure for lessons
export const getModuleContent = (moduleId: number) => {
  const topics = [
    "Introdução aos Conceitos",
    "Fundamentos Teóricos",
    "Aplicações Práticas",
    "Metodologia de Análise",
    "Exercícios Resolvidos",
    "Casos de Estudo"
  ];
  
  return topics.map((topic, index) => ({
    id: index + 1,
    title: topic,
    duration: `${8 + Math.floor(Math.random() * 15)} min`,
    status: index < 2 ? "completed" : index === 2 ? "current" : "locked"
  }));
};