import { FileQuestion, Layers, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface GeneratedContentCardProps {
  type: 'quiz' | 'flashcard';
  title: string;
  itemCount: number;
  createdAt: string;
  onOpen: () => void;
  onDelete: () => void;
}

export const GeneratedContentCard = ({ 
  type, 
  title, 
  itemCount, 
  createdAt, 
  onOpen,
  onDelete
}: GeneratedContentCardProps) => {
  const Icon = type === 'quiz' ? FileQuestion : Layers;
  const label = type === 'quiz' ? 'Quiz' : 'Flashcards';
  const countLabel = type === 'quiz' ? 'perguntas' : 'cards';
  
  return (
    <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 hover:shadow-md transition-shadow group">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-gray-900 truncate">
            {title}
          </h4>
          <p className="text-xs text-gray-600 mt-1">
            {itemCount} {countLabel} • {new Date(createdAt).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button
            onClick={onOpen}
            size="sm"
            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
          >
            Abrir
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            size="sm"
            variant="ghost"
            className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600"
            title={`Excluir ${label}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
