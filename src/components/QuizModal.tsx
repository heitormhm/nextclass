import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Trophy, ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuizModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizId: string;
}

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizData {
  title: string;
  topic: string;
  questions: Question[];
}

export const QuizModal = ({ open, onOpenChange, quizId }: QuizModalProps) => {
  const [loading, setLoading] = useState(true);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [showFeedback, setShowFeedback] = useState<{ [key: number]: boolean }>({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [attemptSaved, setAttemptSaved] = useState(false);

  useEffect(() => {
    if (open && quizId) {
      loadQuiz();
    }
  }, [open, quizId]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('generated_quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (error) throw error;

      const questions = Array.isArray(data.questions) ? data.questions : [];
      setQuizData({
        title: data.title,
        topic: data.topic,
        questions: questions as unknown as Question[],
      });
      setAnswers(new Array(questions.length).fill(null));
    } catch (error) {
      console.error('Error loading quiz:', error);
      toast.error('Erro ao carregar quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = optionIndex;
    setAnswers(newAnswers);
    
    setShowFeedback({ ...showFeedback, [currentQuestion]: true });
    
    setTimeout(() => {
      if (currentQuestion < (quizData?.questions.length || 0) - 1) {
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
        topic: quizData.topic,
        score: correctAnswers,
        max_score: quizData.questions.length,
        percentage: (correctAnswers / quizData.questions.length) * 100,
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
    setCurrentQuestion(0);
    setAnswers([]);
    setShowFeedback({});
    setQuizCompleted(false);
    setAttemptSaved(false);
    onOpenChange(false);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!quizData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="text-center p-8">
            <p className="text-muted-foreground">Quiz não encontrado</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
            <p className="text-lg font-medium">{currentQ.question}</p>
          </div>

          <div className="space-y-3">
            {currentQ.options.map((option, idx) => {
              const isSelected = selectedAnswer === idx;
              const isCorrect = idx === currentQ.correctAnswer;
              const showAsCorrect = showCurrentFeedback && isCorrect;
              const showAsIncorrect = showCurrentFeedback && isSelected && !isCorrect;

              return (
                <button
                  key={idx}
                  onClick={() => !isAnswered && handleAnswer(idx)}
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
                    <span className="flex-1">{option}</span>
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
