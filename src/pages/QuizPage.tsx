import { useState, useEffect } from 'react';
import { ChevronLeft, CheckCircle, XCircle, ArrowRight, Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/MainLayout';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuizQuestion {
  id: number;
  type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'short-answer';
  question: string;
  options?: string[];
  correctAnswer: number | boolean | string[];
  explanation: string;
  sourceTimestamp: string;
  correctAnswers?: string[];
  expectedKeywords?: string[];
}

interface Answer {
  questionId: number;
  answer: string | boolean | string[];
  isCorrect?: boolean;
}

const QuizPage = () => {
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [showFeedback, setShowFeedback] = useState<{[key: number]: boolean}>({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  
  const { id } = useParams();
  const navigate = useNavigate();
  const lectureId = id || '1';

  useEffect(() => {
    const generateQuiz = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-quiz', {
          body: { 
            lectureId,
            transcript: 'Sample lecture transcript about cardiovascular physiology and pathology'
          }
        });

        if (error) throw error;

        if (data.success && data.quiz.questions) {
          setQuizQuestions(data.quiz.questions);
          setTotalQuestions(data.totalQuestions);
        } else {
          throw new Error('Invalid quiz data received');
        }
      } catch (error) {
        console.error('Error generating quiz:', error);
        toast.error('Erro ao gerar quiz. Por favor, tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    generateQuiz();
  }, [lectureId]);

  const progress = totalQuestions > 0 ? (currentQuestion / totalQuestions) * 100 : 0;
  const currentQuestionData = quizQuestions.find(q => q.id === currentQuestion);

  const handleAnswer = (questionId: number, answer: string | boolean | string[]) => {
    const existingAnswerIndex = answers.findIndex(a => a.questionId === questionId);
    const question = quizQuestions.find(q => q.id === questionId);
    
    let isCorrect = false;
    if (question) {
      switch (question.type) {
        case "multiple-choice":
          isCorrect = parseInt(answer as string) === question.correctAnswer;
          break;
        case "true-false":
          isCorrect = answer === question.correctAnswer;
          break;
        case "fill-blank":
          const userAnswers = (answer as string).toLowerCase().split(',').map(a => a.trim());
          const correctAnswers = question.correctAnswers?.map(a => a.toLowerCase()) || [];
          isCorrect = correctAnswers.every(correct => 
            userAnswers.some(user => user.includes(correct))
          );
          break;
        case "short-answer":
          const keywords = question.expectedKeywords || [];
          const answerText = (answer as string).toLowerCase();
          isCorrect = keywords.some(keyword => answerText.includes(keyword.toLowerCase()));
          break;
      }
    }

    const newAnswer: Answer = { questionId, answer, isCorrect };
    
    if (existingAnswerIndex >= 0) {
      const newAnswers = [...answers];
      newAnswers[existingAnswerIndex] = newAnswer;
      setAnswers(newAnswers);
    } else {
      setAnswers([...answers, newAnswer]);
    }

    setShowFeedback(prev => ({ ...prev, [questionId]: true }));
  };

  const nextQuestion = () => {
    if (currentQuestion < totalQuestions) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      const correctAnswers = answers.filter(a => a.isCorrect).length;
      setScore((correctAnswers / totalQuestions) * 100);
      setQuizCompleted(true);
    }
  };

  const getCurrentAnswer = (questionId: number) => {
    return answers.find(a => a.questionId === questionId);
  };

  const handleReviewInLecture = (timestamp: string) => {
    navigate(`/lecture/${lectureId}?timestamp=${timestamp}`);
  };

  const renderQuestion = (question: typeof currentQuestionData) => {
    if (!question) return null;
    
    const userAnswer = getCurrentAnswer(question.id);
    const showQuestionFeedback = showFeedback[question.id];

    return (
      <div key={question.id} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            Pergunta {question.id}: {question.question}
          </h3>

          {question.type === "multiple-choice" && (
            <RadioGroup
              value={userAnswer?.answer as string}
              onValueChange={(value) => handleAnswer(question.id, value)}
              className="space-y-3"
            >
              {question.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {question.type === "true-false" && (
            <RadioGroup
              value={userAnswer?.answer?.toString()}
              onValueChange={(value) => handleAnswer(question.id, value === "true")}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="true" id="true" />
                <Label htmlFor="true" className="cursor-pointer">Verdadeiro</Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="false" id="false" />
                <Label htmlFor="false" className="cursor-pointer">Falso</Label>
              </div>
            </RadioGroup>
          )}

          {question.type === "fill-blank" && (
            <Input
              placeholder="Sua resposta aqui... (separe múltiplas respostas com vírgula)"
              value={userAnswer?.answer as string || ""}
              onChange={(e) => handleAnswer(question.id, e.target.value)}
              className="w-full"
            />
          )}

          {question.type === "short-answer" && (
            <Textarea
              placeholder="Digite sua resposta detalhada aqui..."
              value={userAnswer?.answer as string || ""}
              onChange={(e) => handleAnswer(question.id, e.target.value)}
              className="min-h-[100px] resize-none"
            />
          )}
        </div>

        {showQuestionFeedback && userAnswer && (
          <div className={`p-4 rounded-lg border ${
            userAnswer.isCorrect 
              ? 'bg-success/10 border-success/20' 
              : 'bg-destructive/10 border-destructive/20'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {userAnswer.isCorrect ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <span className={`font-semibold ${
                userAnswer.isCorrect ? 'text-success' : 'text-destructive'
              }`}>
                {userAnswer.isCorrect ? 'Correto!' : 'Incorreto'}
              </span>
            </div>
            <p className="text-sm text-foreground-muted">
              {question.explanation}
            </p>
          </div>
        )}

        {showQuestionFeedback && (
          <div className="flex justify-end">
            <Button onClick={nextQuestion} className="gap-2">
              {currentQuestion === totalQuestions ? 'Finalizar Quiz' : 'Próxima Pergunta'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 flex items-center justify-center">
          <Card className="border-0 shadow-lg bg-white/60 backdrop-blur-xl p-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Gerando seu quiz...</h3>
                <p className="text-sm text-foreground-muted">
                  Estamos criando perguntas personalizadas baseadas na aula
                </p>
              </div>
            </div>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (quizCompleted) {
    const incorrectAnswers = answers.filter(a => !a.isCorrect);
    
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Score Card */}
              <Card className="border-0 shadow-lg bg-white/60 backdrop-blur-xl">
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl font-bold mb-2">Quiz Concluído!</CardTitle>
                  <div className="space-y-4">
                    <div className="text-6xl font-bold text-primary">{Math.round(score)}%</div>
                    <Badge variant={score >= 70 ? "default" : "secondary"} className="text-lg px-4 py-2">
                      {score >= 90 ? "Excelente!" : score >= 70 ? "Bom Trabalho!" : "Precisa Melhorar"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                  <p className="text-foreground-muted">
                    Você acertou {answers.filter(a => a.isCorrect).length} de {totalQuestions} perguntas.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button variant="outline" asChild>
                      <Link to="/courses">
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Voltar aos Cursos
                      </Link>
                    </Button>
                    <Button onClick={() => window.location.reload()}>
                      Refazer Quiz
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Remediation Section - Incorrect Answers Review */}
              {incorrectAnswers.length > 0 && (
                <Card className="border-0 shadow-lg bg-white/60 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Revisar Conceitos
                    </CardTitle>
                    <p className="text-sm text-foreground-muted">
                      Revise os conceitos que você errou para melhorar seu entendimento
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {incorrectAnswers.map(answer => {
                      const question = quizQuestions.find(q => q.id === answer.questionId);
                      if (!question) return null;

                      return (
                        <div key={answer.questionId} className="p-4 border rounded-lg bg-white/40">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-foreground">
                              Pergunta {question.id}: {question.question}
                            </h4>
                            
                            <div className="text-sm">
                              <p className="text-foreground-muted mb-2">
                                <span className="font-medium">Resposta correta: </span>
                                {question.type === 'multiple-choice' 
                                  ? question.options?.[question.correctAnswer as number]
                                  : String(question.correctAnswer)}
                              </p>
                              <p className="text-foreground-muted">
                                {question.explanation}
                              </p>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReviewInLecture(question.sourceTimestamp)}
                              className="gap-2"
                            >
                              <BookOpen className="h-4 w-4" />
                              Revisar na Aula ({question.sourceTimestamp})
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/courses">
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              </Button>
              <h1 className="text-xl font-semibold">Quiz Interativo</h1>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground-muted">Progresso do Quiz</span>
                <span className="text-sm font-semibold">
                  Pergunta {currentQuestion} de {totalQuestions}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <Card className="border-0 shadow-lg bg-white/60 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xl">Quiz Gerado por IA</CardTitle>
                <p className="text-foreground-muted">Baseado no conteúdo da aula</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {renderQuestion(currentQuestionData)}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default QuizPage;
