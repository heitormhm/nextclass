import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Trophy, ArrowLeft, ArrowRight, FileCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TeacherQuizModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizData: {
    id: string;
    title: string;
    questions: Array<{
      question: string;
      options: { A: string; B: string; C: string; D: string };
      correctAnswer: string;
      explanation: string;
      bloomLevel?: string;
    }>;
  };
}

export const TeacherQuizModal = ({ open, onOpenChange, quizData }: TeacherQuizModalProps) => {
  const [viewMode, setViewMode] = useState<'list' | 'interactive'>('list');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [showFeedback, setShowFeedback] = useState<{ [key: number]: boolean }>({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [attemptSaved, setAttemptSaved] = useState(false);

  useEffect(() => {
    if (open && quizData) {
      setViewMode('list');
      setAnswers(new Array(quizData.questions.length).fill(null));
      setCurrentQuestion(0);
      setShowFeedback({});
      setQuizCompleted(false);
      setAttemptSaved(false);
    }
  }, [open, quizData]);

  const handleAnswer = (letter: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = letter;
    setAnswers(newAnswers);
    
    setShowFeedback({ ...showFeedback, [currentQuestion]: true });
    
    setTimeout(() => {
      if (currentQuestion < quizData.questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        setQuizCompleted(true);
      }
    }, 1500);
  };

  const saveQuizAttempt = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !quizData) return;

    const correctAnswers = answers.filter((answer, idx) => 
      answer === quizData.questions[idx].correctAnswer
    ).length;

    const { error } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: user.id,
        topic: quizData.title,
        score: correctAnswers,
        max_score: quizData.questions.length,
        percentage: (correctAnswers / quizData.questions.length) * 100,
        quiz_source: 'teacher_official',
        lecture_id: null,
      });

    if (error) {
      console.error('Error saving quiz attempt:', error);
      toast.error('Erro ao salvar resultado');
    } else {
      toast.success('Resultado salvo com sucesso!');
    }
  };

  useEffect(() => {
    if (quizCompleted && !attemptSaved && quizData) {
      saveQuizAttempt();
      setAttemptSaved(true);
    }
  }, [quizCompleted, attemptSaved, quizData]);

  const calculateScore = () => {
    if (!quizData) return { correct: 0, total: 0, percentage: 0 };
    const correct = answers.filter((answer, idx) => 
      answer === quizData.questions[idx].correctAnswer
    ).length;
    return {
      correct,
      total: quizData.questions.length,
      percentage: Math.round((correct / quizData.questions.length) * 100)
    };
  };

  const handleClose = () => {
    setViewMode('list');
    setCurrentQuestion(0);
    setAnswers([]);
    setShowFeedback({});
    setQuizCompleted(false);
    setAttemptSaved(false);
    onOpenChange(false);
  };

  if (!quizData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quiz não disponível</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Nenhum quiz foi gerado ainda. Por favor, gere um quiz primeiro.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  // VIEW MODE: Lista de Perguntas
  if (viewMode === 'list') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <FileCheck className="h-6 w-6 text-purple-600" />
              {quizData.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* Estatísticas */}
            <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
              <div>
                <p className="text-sm text-muted-foreground">Total de Questões</p>
                <p className="text-3xl font-bold text-purple-600">{quizData.questions.length}</p>
              </div>
              <Button
                onClick={() => setViewMode('interactive')}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                ▶️ Iniciar Quiz Interativo
              </Button>
            </div>

            {/* Lista de Perguntas */}
            <div className="space-y-4">
              {quizData.questions.map((q, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3 mb-3">
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 font-semibold">
                      Questão {index + 1}
                    </Badge>
                    {q.bloomLevel && (
                      <Badge variant="secondary" className="text-xs">
                        {q.bloomLevel}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-base font-semibold text-slate-900 mb-4 leading-relaxed">
                    {q.question}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    {['A', 'B', 'C', 'D'].map((letter) => {
                      const isCorrect = letter === q.correctAnswer;
                      return (
                        <div 
                          key={letter}
                          className={cn(
                            "p-3 rounded-md border-2 transition-colors",
                            isCorrect 
                              ? "bg-green-50 border-green-300" 
                              : "bg-slate-50 border-slate-200"
                          )}
                        >
                          <span className="font-semibold mr-2">{letter})</span>
                          <span className={isCorrect ? "text-green-900" : "text-slate-700"}>
                            {q.options[letter as keyof typeof q.options]}
                          </span>
                          {isCorrect && (
                            <CheckCircle className="inline-block ml-2 h-4 w-4 text-green-600" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {q.explanation && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <p className="text-sm font-medium text-blue-900 mb-1">💡 Explicação:</p>
                      <p className="text-sm text-blue-800">{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Fechar
            </Button>
            <Button
              onClick={() => setViewMode('interactive')}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              ▶️ Iniciar Quiz Interativo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // VIEW MODE: Quiz Interativo

  if (quizCompleted) {
    const score = calculateScore();
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">
              Quiz Concluído!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="flex justify-center">
              <div className="relative">
                <Trophy className="h-24 w-24 text-yellow-500 animate-bounce" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-5xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                {score.percentage}%
              </p>
              <p className="text-xl text-muted-foreground">
                {score.correct} de {score.total} questões corretas
              </p>
              {score.percentage >= 90 && (
                <p className="text-lg text-green-600 font-medium">
                  🎉 Excelente desempenho!
                </p>
              )}
              {score.percentage >= 70 && score.percentage < 90 && (
                <p className="text-lg text-blue-600 font-medium">
                  👏 Muito bom!
                </p>
              )}
              {score.percentage < 70 && (
                <p className="text-lg text-orange-600 font-medium">
                  📚 Continue estudando!
                </p>
              )}
            </div>
            <Button 
              onClick={handleClose} 
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const currentQ = quizData.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quizData.questions.length) * 100;
  const selectedAnswer = answers[currentQuestion];
  const isAnswered = selectedAnswer !== null;
  const showCurrentFeedback = showFeedback[currentQuestion];

  // Converter options object para array com labels
  const optionsArray = [
    { letter: 'A', text: currentQ.options.A },
    { letter: 'B', text: currentQ.options.B },
    { letter: 'C', text: currentQ.options.C },
    { letter: 'D', text: currentQ.options.D },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{quizData.title}</DialogTitle>
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Questão {currentQuestion + 1} de {quizData.questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        <div className="space-y-6 py-6">
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 rounded-lg">
            {currentQ.bloomLevel && (
              <Badge variant="outline" className="mb-3 bg-purple-50 text-purple-700 border-purple-300">
                {currentQ.bloomLevel}
              </Badge>
            )}
            <p className="text-lg font-medium">{currentQ.question}</p>
          </div>

          <div className="space-y-3">
            {optionsArray.map((option) => {
              const isSelected = selectedAnswer === option.letter;
              const isCorrect = option.letter === currentQ.correctAnswer;
              const showAsCorrect = showCurrentFeedback && isCorrect;
              const showAsIncorrect = showCurrentFeedback && isSelected && !isCorrect;

              return (
                <button
                  key={option.letter}
                  onClick={() => !isAnswered && handleAnswer(option.letter)}
                  disabled={isAnswered}
                  className={cn(
                    "w-full p-4 rounded-lg border-2 text-left transition-all duration-300",
                    "hover:border-pink-500 hover:bg-pink-50",
                    isSelected && !showCurrentFeedback && "border-pink-500 bg-pink-50",
                    showAsCorrect && "border-green-500 bg-green-50",
                    showAsIncorrect && "border-red-500 bg-red-50",
                    isAnswered && "cursor-not-allowed opacity-75"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex-1">
                      <span className="font-semibold mr-2">{option.letter})</span>
                      {option.text}
                    </span>
                    {showAsCorrect && <CheckCircle className="h-6 w-6 text-green-600" />}
                    {showAsIncorrect && <XCircle className="h-6 w-6 text-red-600" />}
                  </div>
                </button>
              );
            })}
          </div>

          {showCurrentFeedback && (
            <div className={cn(
              "p-4 rounded-lg border-2 animate-fade-in",
              selectedAnswer === currentQ.correctAnswer 
                ? "bg-green-50 border-green-200" 
                : "bg-orange-50 border-orange-200"
            )}>
              <p className="font-medium mb-2">
                {selectedAnswer === currentQ.correctAnswer ? "✅ Correto!" : "ℹ️ Explicação:"}
              </p>
              <p className="text-sm text-muted-foreground">{currentQ.explanation}</p>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>
          <Button
            onClick={() => {
              if (currentQuestion < quizData.questions.length - 1) {
                setCurrentQuestion(currentQuestion + 1);
              }
            }}
            disabled={currentQuestion === quizData.questions.length - 1}
          >
            Próxima
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};