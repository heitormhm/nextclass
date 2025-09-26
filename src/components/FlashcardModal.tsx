import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  tags: string[];
}

interface FlashcardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mockFlashcards: Flashcard[] = [
  { 
    id: 'fc1', 
    question: 'Qual a função do Nó Sinoatrial?', 
    answer: 'É o marcapasso natural do coração, iniciando o impulso elétrico para a contração.',
    tags: ['Fisiologia', 'Anatomia'] 
  },
  { 
    id: 'fc2', 
    question: 'Sintomas clássicos do Infarto Agudo do Miocárdio', 
    answer: 'Dor torácica opressiva com irradiação para o membro superior esquerdo, sudorese e dispneia.',
    tags: ['Sintomas-chave', 'Correlação Clínica'] 
  },
  { 
    id: 'fc3', 
    question: 'Tratamento inicial para Angina Estável', 
    answer: 'Nitratos, beta-bloqueadores e aspirina são a base do tratamento.',
    tags: ['Tratamento', 'Farmacologia'] 
  },
  {
    id: 'fc4',
    question: 'Como interpretar um eletrocardiograma normal?',
    answer: 'Onda P positiva, intervalo PR entre 0,12-0,20s, complexo QRS menor que 0,12s.',
    tags: ['Exames', 'Diagnóstico']
  },
  {
    id: 'fc5',
    question: 'Principais causas de hipertensão secundária',
    answer: 'Doença renal, hiperaldosteronismo, feocromocitoma e coarctação da aorta.',
    tags: ['Fisiopatologia', 'Diagnóstico Diferencial']
  }
];

const tagColors = {
  'Fisiologia': 'bg-blue-100 text-blue-800 border-blue-200',
  'Anatomia': 'bg-green-100 text-green-800 border-green-200',
  'Sintomas-chave': 'bg-red-100 text-red-800 border-red-200',
  'Correlação Clínica': 'bg-purple-100 text-purple-800 border-purple-200',
  'Tratamento': 'bg-orange-100 text-orange-800 border-orange-200',
  'Farmacologia': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'Exames': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Diagnóstico': 'bg-pink-100 text-pink-800 border-pink-200',
  'Fisiopatologia': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Diagnóstico Diferencial': 'bg-gray-100 text-gray-800 border-gray-200'
};

export const FlashcardModal: React.FC<FlashcardModalProps> = ({ open, onOpenChange }) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const handlePrevious = () => {
    setCurrentCardIndex((prev) => (prev === 0 ? mockFlashcards.length - 1 : prev - 1));
    setIsFlipped(false);
  };

  const handleNext = () => {
    setCurrentCardIndex((prev) => (prev === mockFlashcards.length - 1 ? 0 : prev + 1));
    setIsFlipped(false);
  };

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  const handleSaveAsImage = () => {
    toast.success("Flashcard salvo como imagem! (funcionalidade simulada)");
  };

  const handleClose = () => {
    onOpenChange(false);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  if (!open) return null;

  const currentCard = mockFlashcards[currentCardIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl h-[90vh] sm:h-[80vh] p-0 overflow-hidden mx-2 sm:mx-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Flashcards Interativos</h2>
            <p className="text-sm text-muted-foreground">
              Card {currentCardIndex + 1} de {mockFlashcards.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveAsImage}
              className="hidden sm:flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Salvar como Imagem
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 sm:h-10 sm:w-10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 3D Flashcard Deck with Navigation Arrows */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-primary/5 to-secondary/10 relative">
          {/* Left Navigation Arrow */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            className="absolute left-2 sm:left-8 top-1/2 -translate-y-1/2 h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-background/80 hover:bg-background shadow-lg z-20"
          >
            <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
          </Button>

          {/* Right Navigation Arrow */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="absolute right-2 sm:right-8 top-1/2 -translate-y-1/2 h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-background/80 hover:bg-background shadow-lg z-20"
          >
            <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
          </Button>

          <div className="relative w-full max-w-2xl h-64 sm:h-80">
            {/* Background Cards (Deck Effect) */}
            <div className="absolute inset-0 flex items-center justify-center">
              {[...Array(3)].map((_, index) => (
                <div
                  key={index}
                  className="absolute w-full h-full rounded-2xl border-2 border-border/20 bg-card shadow-lg"
                  style={{
                    transform: `translateX(${(index - 1) * 4}px) translateY(${(index - 1) * 4}px) rotateZ(${(index - 1) * 1}deg)`,
                    zIndex: index,
                    opacity: 0.3 + (index * 0.2)
                  }}
                />
              ))}
            </div>

            {/* Main Card with 3D Flip */}
            <div 
              className="relative w-full h-full cursor-pointer"
              style={{ perspective: '1000px', zIndex: 10 }}
              onClick={handleCardClick}
            >
              <div
                className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
              >
                {/* Front of Card (Question) */}
                <div className="absolute inset-0 w-full h-full rounded-2xl border-2 border-primary/20 bg-card shadow-2xl p-4 sm:p-8 flex flex-col justify-between backface-hidden">
                  <div className="flex-1 flex items-center justify-center text-center">
                    <h3 className="text-lg sm:text-2xl font-semibold leading-tight text-foreground">
                      {currentCard.question}
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center mt-4 sm:mt-6">
                    {currentCard.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium border ${
                          tagColors[tag as keyof typeof tagColors] || 'bg-gray-100 text-gray-800 border-gray-200'
                        }`}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="absolute top-4 right-4 bg-primary/10 rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">
                      {currentCardIndex + 1}
                    </span>
                  </div>

                  <div className="absolute top-4 left-4 text-xs text-muted-foreground">
                    Pergunta
                  </div>
                </div>

                {/* Back of Card (Answer) */}
                <div className="absolute inset-0 w-full h-full rounded-2xl border-2 border-secondary/20 bg-secondary/5 shadow-2xl p-4 sm:p-8 flex flex-col justify-between backface-hidden rotate-y-180">
                  <div className="flex-1 flex items-center justify-center text-center">
                    <p className="text-base sm:text-xl leading-relaxed text-foreground">
                      {currentCard.answer}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center mt-4 sm:mt-6">
                    {currentCard.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium border ${
                          tagColors[tag as keyof typeof tagColors] || 'bg-gray-100 text-gray-800 border-gray-200'
                        }`}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="absolute top-4 right-4 bg-secondary/20 rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                    <span className="text-xs font-bold text-secondary">
                      {currentCardIndex + 1}
                    </span>
                  </div>

                  <div className="absolute top-4 left-4 text-xs text-muted-foreground">
                    Resposta
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 p-4 sm:p-6 border-t bg-background/50">
          {/* Progress Dots */}
          <div className="flex items-center gap-2">
            {mockFlashcards.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentCardIndex(index);
                  setIsFlipped(false);
                }}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentCardIndex
                    ? 'bg-primary scale-125'
                    : 'bg-border hover:bg-primary/50'
                }`}
              />
            ))}
          </div>

          <div className="text-sm text-muted-foreground text-center">
            Clique no card para ver a resposta
          </div>
          
          {/* Mobile Download Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveAsImage}
            className="sm:hidden flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};