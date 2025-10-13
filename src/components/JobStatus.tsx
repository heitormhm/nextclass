import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface JobStatusProps {
  job: {
    status: string;
    type: string;
    result?: string;
  };
  onOpenQuiz?: (quizId: string) => void;
  onOpenFlashcards?: (setId: string) => void;
}

export const JobStatus = ({ job, onOpenQuiz, onOpenFlashcards }: JobStatusProps) => {
  if (!job) return null;
  
  switch (job.status) {
    case 'PENDING':
    case 'SYNTHESIZING':
      return (
        <div className="flex items-center gap-2 p-3 bg-pink-50 rounded-lg border border-pink-200 my-2">
          <Loader2 className="h-5 w-5 animate-spin text-pink-500" />
          <p className="text-sm text-gray-700">
            Processando: {job.type.replace('GENERATE_', '').replace('_', ' ').toLowerCase()}...
          </p>
        </div>
      );
    
    case 'COMPLETED':
      if (job.type === 'GENERATE_QUIZ') {
        return (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg my-2">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-800 font-medium">Seu quiz está pronto!</p>
            </div>
            <Button 
              size="sm" 
              onClick={() => job.result && onOpenQuiz?.(job.result)}
              className="bg-pink-500 hover:bg-pink-600 text-white"
            >
              Começar Quiz
            </Button>
          </div>
        );
      }
      if (job.type === 'GENERATE_FLASHCARDS') {
        return (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg my-2">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <p className="text-blue-800 font-medium">Seus flashcards foram criados!</p>
            </div>
            <Button 
              size="sm" 
              onClick={() => job.result && onOpenFlashcards?.(job.result)}
              className="bg-pink-500 hover:bg-pink-600 text-white"
            >
              Estudar Flashcards
            </Button>
          </div>
        );
      }
      if (job.type === 'GENERATE_SUGGESTIONS') {
        return (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg my-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-purple-600" />
              <p className="text-purple-800 font-medium">Sugestões geradas!</p>
            </div>
          </div>
        );
      }
      return null;
    
    case 'FAILED':
      return (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg my-2 flex items-center gap-2">
          <XCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-800">Falha ao processar. Tente novamente.</p>
        </div>
      );
    
    default:
      return null;
  }
};
