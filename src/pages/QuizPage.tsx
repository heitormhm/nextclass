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
import { StudentBackgroundGrid } from '@/components/ui/student-background-grid';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const fromChat = location.state?.fromChat || false;
  const conversationId = location.state?.conversationId;
  const lectureId = id || '1';

  useEffect(() => {
    const loadQuizFromDB = async () => {
      setLoading(true);
      try {
        // ✅ Carregar quiz do banco de dados ao invés de gerar novo
        const { data, error } = await supabase
          .from('generated_quizzes')
          .select('*')
          .eq('id', lectureId)
          .single();

        if (error) throw error;

        // Converter formato do banco para formato esperado
        const questions = Array.isArray(data.questions) ? data.questions : [];
        const convertedQuestions = questions.map((q: any, idx: number) => ({
          id: idx + 1,
          type: 'multiple-choice',
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          sourceTimestamp: '00:00'
        }));

        setQuizQuestions(convertedQuestions as QuizQuestion[]);
        setTotalQuestions(convertedQuestions.length);
      } catch (error) {
        console.error('Error loading quiz:', error);
        toast.error('Erro ao carregar quiz. Redirecionando...');
        setTimeout(() => navigate('/ai-chat'), 2000);
      } finally {
        setLoading(false);
      }
    };

    loadQuizFromDB();
  }, [lectureId, navigate]);

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
            <div className="space-y-3">
              {question.options?.map((option, index) => {
                const isSelected = userAnswer?.answer === index.toString();
                const isCorrect = question.correctAnswer === index;
                const showResult = showQuestionFeedback && userAnswer;
                
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => !showQuestionFeedback && handleAnswer(question.id, index.toString())}
                    disabled={showQuestionFeedback}
                    className={`
                      w-full p-4 text-left rounded-xl border-2 transition-all duration-300
                      ${!showQuestionFeedback && !isSelected ? 'border-slate-200 bg-white/40 hover:border-primary hover:bg-white/60 hover:scale-[1.02]' : ''}
                      ${!showQuestionFeedback && isSelected ? 'border-primary bg-white/80 scale-[1.02] shadow-lg' : ''}
                      ${showResult && isCorrect ? 'border-green-500 bg-green-50/80 animate-fade-in' : ''}
                      ${showResult && isSelected && !isCorrect ? 'border-red-500 bg-red-50/80 animate-fade-in' : ''}
                      ${showResult && !isSelected && !isCorrect ? 'border-slate-200 bg-white/20 opacity-50' : ''}
                      ${!showQuestionFeedback ? 'cursor-pointer' : 'cursor-not-allowed'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                        ${!showQuestionFeedback && !isSelected ? 'border-gray-300' : ''}
                        ${!showQuestionFeedback && isSelected ? 'border-primary bg-primary' : ''}
                        ${showResult && isCorrect ? 'border-green-500 bg-green-500' : ''}
                        ${showResult && isSelected && !isCorrect ? 'border-red-500 bg-red-500' : ''}
                      `}>
                        {((showQuestionFeedback && isCorrect) || (!showQuestionFeedback && isSelected)) && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                        {showQuestionFeedback && isSelected && !isCorrect && (
                          <XCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <span className={`
                        flex-1 text-sm
                        ${showResult && isCorrect ? 'font-semibold text-green-700' : ''}
                        ${showResult && isSelected && !isCorrect ? 'font-semibold text-red-700' : ''}
                      `}>
                        {option}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {question.type === "true-false" && (
            <div className="space-y-3">
              {['true', 'false'].map((value) => {
                const isSelected = userAnswer?.answer?.toString() === value;
                const isCorrect = question.correctAnswer.toString() === value;
                const showResult = showQuestionFeedback && userAnswer;
                
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => !showQuestionFeedback && handleAnswer(question.id, value === "true")}
                    disabled={showQuestionFeedback}
                    className={`
                      w-full p-4 text-left rounded-xl border-2 transition-all duration-200
                      ${!showQuestionFeedback && !isSelected ? 'border-gray-200 bg-white hover:border-primary hover:bg-primary/5' : ''}
                      ${!showQuestionFeedback && isSelected ? 'border-primary bg-primary/10' : ''}
                      ${showResult && isCorrect ? 'border-green-500 bg-green-50' : ''}
                      ${showResult && isSelected && !isCorrect ? 'border-red-500 bg-red-50' : ''}
                      ${showResult && !isSelected && !isCorrect ? 'border-gray-200 bg-gray-50 opacity-60' : ''}
                      ${!showQuestionFeedback ? 'cursor-pointer' : 'cursor-not-allowed'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                        ${!showQuestionFeedback && !isSelected ? 'border-gray-300' : ''}
                        ${!showQuestionFeedback && isSelected ? 'border-primary bg-primary' : ''}
                        ${showResult && isCorrect ? 'border-green-500 bg-green-500' : ''}
                        ${showResult && isSelected && !isCorrect ? 'border-red-500 bg-red-500' : ''}
                      `}>
                        {((showQuestionFeedback && isCorrect) || (!showQuestionFeedback && isSelected)) && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                        {showQuestionFeedback && isSelected && !isCorrect && (
                          <XCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <span className={`
                        flex-1 text-sm font-medium
                        ${showResult && isCorrect ? 'text-green-700' : ''}
                        ${showResult && isSelected && !isCorrect ? 'text-red-700' : ''}
                      `}>
                        {value === 'true' ? 'Verdadeiro' : 'Falso'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
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
          <div className={`p-5 rounded-xl border-2 animate-fade-in transition-all ${
            userAnswer.isCorrect 
              ? 'bg-green-50/80 border-green-300 shadow-lg' 
              : 'bg-orange-50/80 border-orange-300 shadow-lg'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              {userAnswer.isCorrect ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-orange-600" />
              )}
              <span className={`font-bold text-lg ${
                userAnswer.isCorrect ? 'text-green-700' : 'text-orange-700'
              }`}>
                {userAnswer.isCorrect ? '✅ Correto!' : '💡 Vamos aprender!'}
              </span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed pl-9">
              {question.explanation}
            </p>
          </div>
        )}

        {showQuestionFeedback && (
          <div className="flex justify-end pt-2">
            <Button 
              onClick={nextQuestion} 
              className="gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              size="lg"
            >
              {currentQuestion === totalQuestions ? 'Ver Resultados' : 'Próxima Pergunta'}
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
        <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/30 flex items-center justify-center">
          {/* Grid PRIMEIRO (z-0) */}
          <StudentBackgroundGrid className="z-0" />
          
          {/* Gradient Blobs DEPOIS (z-10) */}
          <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-pink-100/40 to-purple-100/40 rounded-full filter blur-3xl opacity-40 z-10 pointer-events-none" />
          <div className="absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-br from-purple-100/40 to-teal-100/40 rounded-full filter blur-3xl opacity-40 z-10 pointer-events-none" />
          
          <Card className="relative z-20 border-0 shadow-sm bg-white/20 backdrop-blur-xl p-8 animate-fade-in">
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
        <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/30">
          {/* Grid PRIMEIRO (z-0) */}
          <StudentBackgroundGrid className="z-0" />
          
          {/* Gradient Blobs DEPOIS (z-10) */}
          <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-pink-100/40 to-purple-100/40 rounded-full filter blur-3xl opacity-40 z-10 pointer-events-none" />
          <div className="absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-br from-purple-100/40 to-teal-100/40 rounded-full filter blur-3xl opacity-40 z-10 pointer-events-none" />
          
          <div className="relative z-20 container mx-auto px-4 py-8">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Score Card */}
              <Card className="border-0 shadow-sm bg-white/20 backdrop-blur-xl overflow-hidden animate-fade-in">
                <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-1">
                  <div className="bg-white/90 backdrop-blur-xl">
                    <CardHeader className="text-center pb-6 pt-8">
                      <CardTitle className="text-3xl font-bold mb-4 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                        Quiz Concluído!
                      </CardTitle>
                      <div className="space-y-6">
                        <div className="relative">
                          <div className="text-7xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                            {Math.round(score)}%
                          </div>
                        </div>
                        <Badge 
                          variant={score >= 70 ? "default" : "secondary"} 
                          className={`text-lg px-6 py-2 ${
                            score >= 90 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                            score >= 70 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                            'bg-gradient-to-r from-orange-500 to-red-500'
                          }`}
                        >
                          {score >= 90 ? "🎉 Excelente!" : score >= 70 ? "👍 Bom Trabalho!" : "📚 Continue Estudando"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="text-center space-y-6 pb-8">
                      <div className="space-y-2">
                        <p className="text-lg font-medium text-foreground">
                          Você acertou {answers.filter(a => a.isCorrect).length} de {totalQuestions} perguntas
                        </p>
                        <p className="text-sm text-foreground-muted">
                          {score >= 90 ? "Domínio excepcional do conteúdo!" :
                           score >= 70 ? "Você está no caminho certo!" :
                           "Revise os conceitos e tente novamente"}
                        </p>
                      </div>
                      <div className="flex gap-4 justify-center flex-wrap">
                        <Button 
                          variant="outline" 
                          size="lg"
                          onClick={() => {
                            if (fromChat && conversationId) {
                              navigate('/aichat', { state: { conversationId } });
                            } else {
                              navigate('/courses');
                            }
                          }}
                        >
                          <ChevronLeft className="h-4 w-4 mr-2" />
                          Voltar {fromChat ? 'ao Chat' : 'aos Cursos'}
                        </Button>
                        <Button 
                          onClick={() => window.location.reload()}
                          className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                          size="lg"
                        >
                          Refazer Quiz
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </div>
              </Card>

              {/* Remediation Section - Incorrect Answers Review */}
              {incorrectAnswers.length > 0 && (
                <Card className="border-0 shadow-sm bg-white/20 backdrop-blur-xl animate-fade-in">
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
                        <div key={answer.questionId} className="p-5 border-2 border-orange-200 rounded-xl bg-orange-50/50">
                          <div className="space-y-4">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-orange-700 font-bold text-sm">{question.id}</span>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground text-lg mb-2">
                                  {question.question}
                                </h4>
                              </div>
                            </div>
                            
                            <div className="ml-11 space-y-3">
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm font-medium text-green-800 mb-1">
                                  ✓ Resposta Correta:
                                </p>
                                <p className="text-sm text-green-700">
                                  {question.type === 'multiple-choice' 
                                    ? question.options?.[question.correctAnswer as number]
                                    : String(question.correctAnswer)}
                                </p>
                              </div>
                              
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm font-medium text-blue-800 mb-1">
                                  💡 Explicação:
                                </p>
                                <p className="text-sm text-blue-700 leading-relaxed">
                                  {question.explanation}
                                </p>
                              </div>

                              <Button
                                variant="outline"
                                size="default"
                                onClick={() => handleReviewInLecture(question.sourceTimestamp)}
                                className="gap-2 border-2 border-primary hover:bg-primary/10 w-full sm:w-auto"
                              >
                                <BookOpen className="h-4 w-4" />
                                Revisar na Aula • {question.sourceTimestamp}
                              </Button>
                            </div>
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
      <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/30">
        {/* Grid PRIMEIRO (z-0) */}
        <StudentBackgroundGrid className="z-0" />
        
        {/* Gradient Blobs DEPOIS (z-10) */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-pink-100/40 to-purple-100/40 rounded-full filter blur-3xl opacity-40 z-10 pointer-events-none" />
        <div className="absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-br from-purple-100/40 to-teal-100/40 rounded-full filter blur-3xl opacity-40 z-10 pointer-events-none" />
        
        <div className="relative z-20 container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-8 animate-fade-in">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  if (fromChat && conversationId) {
                    navigate('/aichat', { state: { conversationId } });
                  } else {
                    navigate('/courses');
                  }
                }}
                className="hover:scale-110 transition-transform"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Quiz Interativo</h1>
                <p className="text-sm text-slate-600">Teste seus conhecimentos</p>
              </div>
            </div>

            <div className="mb-8 bg-white/20 backdrop-blur-xl rounded-xl p-6 shadow-sm animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-700">Progresso do Quiz</span>
                <span className="text-sm font-bold text-primary">
                  Pergunta {currentQuestion} de {totalQuestions}
                </span>
              </div>
              <div className="relative h-3 bg-slate-200/50 rounded-full overflow-hidden">
                <div 
                  className="absolute h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500 ease-out shadow-lg"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <Card className="border-0 shadow-sm bg-white/20 backdrop-blur-xl animate-fade-in">
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
