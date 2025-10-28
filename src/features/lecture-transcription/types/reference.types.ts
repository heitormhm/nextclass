export type ReferenceType = 'site' | 'livro' | 'artigo' | 'apresentação' | 'vídeo';

export interface Reference {
  titulo: string;
  url: string;
  tipo: ReferenceType;
}
