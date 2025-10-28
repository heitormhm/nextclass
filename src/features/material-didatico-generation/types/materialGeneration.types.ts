import { Loader2, Search, BookOpen, Wand2, CheckCircle2 } from "lucide-react";

// Job status types
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

// Generation step definition
export interface GenerationStep {
  label: string;
  icon: typeof Loader2;
}

// Job data structure
export interface MaterialGenerationJob {
  id: string;
  status: JobStatus;
  progress?: number;
  progress_message?: string;
  error_message?: string;
  result_payload?: any;
  created_at: string;
  updated_at: string;
}

// Request payload
export interface MaterialGenerationRequest {
  lectureId: string;
  lectureTitle: string;
  transcript?: string;
}

// Callback functions
export interface MaterialGenerationCallbacks {
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
  onProgress?: (step: number, message: string) => void;
}

// Processing steps
export const GENERATION_STEPS: GenerationStep[] = [
  { label: "Iniciando geração...", icon: Loader2 },
  { label: "Pesquisando fontes acadêmicas...", icon: Search },
  { label: "Estruturando conteúdo...", icon: BookOpen },
  { label: "Gerando material didático...", icon: Wand2 },
  { label: "Finalizando...", icon: CheckCircle2 },
];
