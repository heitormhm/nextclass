export interface StructuredContent {
  titulo_aula: string;
  resumo: string;
  material_didatico?: string | object;
  topicos_principais: Array<{ conceito: string; definicao: string }>;
  referencias_externas: Array<{ titulo: string; url: string; tipo: string }>;
  perguntas_revisao: Array<{
    pergunta: string;
    opcoes: string[];
    resposta_correta: string;
    explicacao?: string;
  }>;
  flashcards: Array<{ termo: string; definicao: string }>;
  thumbnail?: string;
}

export interface Lecture {
  id: string;
  title: string;
  teacher_id: string;
  status: 'processing' | 'ready' | 'published';
  structured_content?: StructuredContent;
  raw_transcript?: string;
  class_id?: string;
  disciplina_id?: string;
  turma_id?: string;
  tags?: string[];
  audio_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UploadedFile {
  name: string;
  url: string;
  type: string;
}

export interface Student {
  id: string;
  name: string;
  hasAccess: boolean;
}
