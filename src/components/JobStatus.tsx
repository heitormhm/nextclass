import { Loader2, CheckCircle, XCircle, FileQuestion, Layers, BookOpen, CheckSquare, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JobStatusProps {
  job: {
    status: string;
    type: string;
    result?: string;
    payload?: any;
  };
  conversationTitle?: string;
  onOpenQuiz?: (quizId: string) => void;
  onOpenFlashcards?: (setId: string) => void;
}

export const JobStatus = ({ job, conversationTitle, onOpenQuiz, onOpenFlashcards }: JobStatusProps) => {
  console.log('🎨 JobStatus render:', {
    status: job?.status,
    type: job?.type,
    hasResult: !!job?.result,
    resultPreview: job?.result?.substring(0, 100)
  });
  
  if (!job) {
    console.log('⚠️ JobStatus: job is null/undefined');
    return null;
  }
  
  switch (job.status) {
    case 'PENDING':
    case 'SYNTHESIZING':
      const displayTitle = conversationTitle || job.payload?.topic || 'este tópico';
      let processingMessage = '';
      
      switch (job.type) {
        case 'GENERATE_QUIZ':
          processingMessage = `Criando seu quiz sobre "${displayTitle}"... Isso pode levar um momento.`;
          break;
        case 'GENERATE_FLASHCARDS':
          processingMessage = `Estruturando flashcards para "${displayTitle}"...`;
          break;
        case 'GENERATE_SUGGESTIONS':
          processingMessage = `Gerando sugestões de aprofundamento...`;
          break;
        case 'GENERATE_LESSON_PLAN':
          processingMessage = `Gerando plano de aula sobre "${displayTitle}"... Estruturando conteúdo pedagógico.`;
          break;
        case 'GENERATE_MULTIPLE_CHOICE_ACTIVITY':
          processingMessage = `Criando atividade de múltipla escolha sobre "${displayTitle}"... Elaborando questões.`;
          break;
        case 'GENERATE_OPEN_ENDED_ACTIVITY':
          processingMessage = `Elaborando atividade dissertativa sobre "${displayTitle}"... Preparando rubricas.`;
          break;
        default:
          processingMessage = `Processando...`;
      }
      
      return (
        <div className="flex items-center gap-2 p-3 bg-pink-50 rounded-lg border border-pink-200 my-2">
          <Loader2 className="h-5 w-5 animate-spin text-pink-500" />
          <p className="text-sm text-gray-700">{processingMessage}</p>
        </div>
      );
    
    case 'COMPLETED':
      if (job.type === 'GENERATE_QUIZ' && job.result) {
        try {
          const resultData = JSON.parse(job.result);
          const { quizId, title, questionCount } = resultData;
          
          return (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg my-2">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-green-800 font-medium text-sm">
                  ✅ Quiz criado com sucesso!
                </p>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                <strong>{title}</strong> com {questionCount} perguntas está pronto.
              </p>
              <Button
                onClick={() => onOpenQuiz?.(quizId)}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                size="sm"
              >
                <FileQuestion className="w-4 h-4 mr-2" />
                Abrir Quiz
              </Button>
            </div>
          );
        } catch (error) {
          console.error('Error parsing quiz result:', error);
        }
      }
      
      if (job.type === 'GENERATE_FLASHCARDS' && job.result) {
        try {
          const resultData = JSON.parse(job.result);
          const { flashcardSetId, title, cardCount } = resultData;
          
          return (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg my-2">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-green-800 font-medium text-sm">
                  ✅ Flashcards criados com sucesso!
                </p>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                <strong>{title}</strong> com {cardCount} cards está pronto.
              </p>
              <Button
                onClick={() => onOpenFlashcards?.(flashcardSetId)}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                size="sm"
              >
                <Layers className="w-4 h-4 mr-2" />
                Abrir Flashcards
              </Button>
            </div>
          );
        } catch (error) {
          console.error('Error parsing flashcard result:', error);
        }
      }
      
      if (job.type === 'GENERATE_SUGGESTIONS') {
        return (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg my-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-purple-600" />
              <p className="text-purple-800 font-medium text-sm">Sugestões prontas! Veja abaixo ↓</p>
            </div>
          </div>
        );
      }
      
      if (job.type === 'GENERATE_LESSON_PLAN' && job.result) {
        try {
          const resultData = JSON.parse(job.result);
          const { lessonPlanId, title } = resultData;
          
          return (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg my-2">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-green-800 font-medium text-sm">
                  ✅ Plano de Aula criado com sucesso!
                </p>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                <strong>{title}</strong> está pronto para uso.
              </p>
              <Button
                onClick={() => window.open(`/teacher/lesson-plans/${lessonPlanId}`, '_blank')}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                size="sm"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Abrir Plano de Aula
              </Button>
            </div>
          );
        } catch (error) {
          console.error('Error parsing lesson plan result:', error);
        }
      }
      
      if (job.type === 'GENERATE_MULTIPLE_CHOICE_ACTIVITY' && job.result) {
        try {
          const resultData = JSON.parse(job.result);
          const { activityId, title, questionCount } = resultData;
          
          return (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg my-2">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-green-800 font-medium text-sm">
                  ✅ Atividade de Múltipla Escolha criada!
                </p>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                <strong>{title}</strong> com {questionCount} questões está pronta.
              </p>
              <Button
                onClick={() => window.open(`/teacher-activities/${activityId}`, '_blank')}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                size="sm"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Ver Atividade
              </Button>
            </div>
          );
        } catch (error) {
          console.error('Error parsing activity result:', error);
        }
      }
      
      if (job.type === 'GENERATE_OPEN_ENDED_ACTIVITY' && job.result) {
        try {
          const resultData = JSON.parse(job.result);
          const { activityId, title } = resultData;
          
          return (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg my-2">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-green-800 font-medium text-sm">
                  ✅ Atividade Dissertativa criada!
                </p>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                <strong>{title}</strong> com rubrica de avaliação está pronta.
              </p>
              <Button
                onClick={() => window.open(`/teacher-activities/${activityId}`, '_blank')}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                size="sm"
              >
                <Edit className="w-4 h-4 mr-2" />
                Ver Atividade
              </Button>
            </div>
          );
        } catch (error) {
          console.error('Error parsing activity result:', error);
        }
      }
      
      return null;
    
    case 'FAILED':
      const failureMessages: Record<string, string> = {
        'GENERATE_QUIZ': 'Falha ao criar quiz. Tente novamente com um contexto diferente.',
        'GENERATE_FLASHCARDS': 'Falha ao criar flashcards. Tente novamente com um contexto diferente.',
        'GENERATE_LESSON_PLAN': 'Falha ao gerar plano de aula. Revise o contexto fornecido.',
        'GENERATE_MULTIPLE_CHOICE_ACTIVITY': 'Falha ao criar atividade. Tente um tópico mais específico.',
        'GENERATE_OPEN_ENDED_ACTIVITY': 'Falha ao elaborar atividade dissertativa. Reformule sua solicitação.',
      };
      
      const failureMessage = failureMessages[job.type] || 'Falha ao processar. Tente novamente.';
      
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg my-2">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800 font-medium text-sm">{failureMessage}</p>
          </div>
          <p className="text-xs text-red-600">
            💡 Dica: Tente reformular sua pergunta ou usar um tópico mais específico.
          </p>
        </div>
      );
    
    default:
      return null;
  }
};
