import { Button } from "@/components/ui/button";
import { FileQuestion, Layers, Lightbulb } from "lucide-react";

interface ActionButtonsProps {
  messageContent: string;
  topic: string;
  onAction: (jobType: string, payload: any) => void;
  disabled?: boolean;
  activeJobs?: Map<string, any>;
  messageJobIds?: string[];
}

export const ActionButtons = ({ messageContent, topic, onAction, disabled, activeJobs, messageJobIds }: ActionButtonsProps) => {
  // 🔍 VERIFICAÇÃO 1: Se esta mensagem JÁ tem jobs associados, não mostrar botões
  if (messageJobIds && messageJobIds.length > 0) {
    console.log('🚫 ActionButtons hidden: message already has jobs', {
      messageJobIds,
      jobCount: messageJobIds.length
    });
    return null;
  }
  
  // 🔍 VERIFICAÇÃO 2: Se há jobs globais ativos do mesmo tipo
  const hasActiveQuizJob = Array.from(activeJobs?.entries() || []).some(
    ([_, job]) => job.type === 'GENERATE_QUIZ' && 
                 (job.status === 'PENDING' || job.status === 'SYNTHESIZING')
  );

  const hasActiveFlashcardJob = Array.from(activeJobs?.entries() || []).some(
    ([_, job]) => job.type === 'GENERATE_FLASHCARDS' && 
                 (job.status === 'PENDING' || job.status === 'SYNTHESIZING')
  );

  const hasActiveSuggestionsJob = Array.from(activeJobs?.entries() || []).some(
    ([_, job]) => job.type === 'GENERATE_SUGGESTIONS' && 
                 (job.status === 'PENDING' || job.status === 'SYNTHESIZING')
  );

  return (
    <div className="flex gap-2 sm:gap-3 mt-4 w-full">
      <Button
        size="sm"
        onClick={() => onAction('GENERATE_QUIZ', { context: messageContent, topic })}
        disabled={disabled || hasActiveQuizJob}
        className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 border-0 px-3 sm:px-6 py-2.5 rounded-xl"
      >
        <FileQuestion className="w-4 h-4 mr-1 sm:mr-2" />
        <span className="font-bold text-xs sm:text-sm">Criar Quiz</span>
      </Button>
      
      <Button
        size="sm"
        onClick={() => onAction('GENERATE_FLASHCARDS', { context: messageContent, topic })}
        disabled={disabled || hasActiveFlashcardJob}
        className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 border-0 px-3 sm:px-6 py-2.5 rounded-xl"
      >
        <Layers className="w-4 h-4 mr-1 sm:mr-2" />
        <span className="font-bold text-xs sm:text-sm">Criar Flashcards</span>
      </Button>

      <Button
        size="sm"
        onClick={() => onAction('GENERATE_SUGGESTIONS', { context: messageContent, topic })}
        disabled={disabled || hasActiveSuggestionsJob}
        className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 border-0 px-3 sm:px-6 py-2.5 rounded-xl"
      >
        <Lightbulb className="w-4 h-4 mr-1 sm:mr-2" />
        <span className="font-bold text-xs sm:text-sm">Sugestões</span>
      </Button>
    </div>
  );
};
