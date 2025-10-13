import { Button } from "@/components/ui/button";
import { FileQuestion, Layers } from "lucide-react";

interface ActionButtonsProps {
  messageContent: string;
  topic: string;
  onAction: (jobType: string, payload: any) => void;
  disabled?: boolean;
}

export const ActionButtons = ({ messageContent, topic, onAction, disabled }: ActionButtonsProps) => {
  return (
    <div className="flex gap-2 mt-3 flex-wrap">
      <Button
        size="sm"
        onClick={() => onAction('GENERATE_QUIZ', { context: messageContent, topic })}
        disabled={disabled}
        className="bg-pink-500 hover:bg-pink-600 text-white"
      >
        <FileQuestion className="w-4 h-4 mr-1" />
        Criar Quiz
      </Button>
      
      <Button
        size="sm"
        onClick={() => onAction('GENERATE_FLASHCARDS', { context: messageContent, topic })}
        disabled={disabled}
        className="bg-pink-500 hover:bg-pink-600 text-white"
      >
        <Layers className="w-4 h-4 mr-1" />
        Criar Flashcards
      </Button>
    </div>
  );
};
