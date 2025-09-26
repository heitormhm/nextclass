import { useState, useEffect } from 'react';
import { ChevronLeft, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/MainLayout';
import { Link } from 'react-router-dom';

// Quiz data structure
const quizData = {
  title: "Quiz de Fundamentos de Cardiologia",
  description: "Teste seus conhecimentos sobre anatomia cardíaca e fisiologia cardiovascular",
  totalQuestions: 4,
  questions: [
    {
      id: 1,
      type: "multiple-choice",
      question: "Qual é a principal função do nó sinoatrial?",
      options: [
        "Bombear sangue para os pulmões",
        "Gerar impulsos elétricos para iniciar o batimento cardíaco",
        "Filtrar o sangue",
        "Regular a pressão arterial"
      ],
      correctAnswer: 1,
      explanation: "O nó sinoatrial é o marcapasso natural do coração, responsável por gerar os impulsos elétricos que iniciam cada batimento cardíaco."
    },
    {
      id: 2,
      type: "true-false",
      question: "O nó sinoatrial está localizado no átrio direito e é considerado o marcapasso natural do coração.",
      correctAnswer: true,
      explanation: "Correto! O nó sinoatrial está localizado no átrio direito e é responsável por iniciar o impulso elétrico que controla o ritmo cardíaco."
    },
    {
      id: 3,
      type: "fill-blank",
      question: "O ciclo cardíaco é dividido em duas fases principais: _______ (contração) e _______ (relaxamento).",
      correctAnswers: ["sístole", "diástole"],
      explanation: "O ciclo cardíaco consiste na sístole (contração do coração para bombear sangue) e diástole (relaxamento para permitir o enchimento)."
    },
    {
      id: 4,
      type: "short-answer",
      question: "Explique brevemente o que acontece durante a diástole ventricular e por que esta fase é importante para a função cardíaca.",
      expectedKeywords: ["relaxamento", "enchimento", "ventrículo", "sangue"],
      explanation: "Durante a diástole ventricular, os ventrículos relaxam e se enchem de sangue. Esta fase é crucial pois permite que o coração se prepare para a próxima contração, garantindo volume adequado de sangue para ser bombeado."
    }
  ]
};

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

  const progress = (currentQuestion / quizData.totalQuestions) * 100;
  const currentQuestionData = quizData.questions.find(q => q.id === currentQuestion);

  const handleAnswer = (questionId: number, answer: string | boolean | string[]) => {
    const existingAnswerIndex = answers.findIndex(a => a.questionId === questionId);
    const question = quizData.questions.find(q => q.id === questionId);
    
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

    // Show feedback immediately
    setShowFeedback(prev => ({ ...prev, [questionId]: true }));
  };

  const nextQuestion = () => {
    if (currentQuestion < quizData.totalQuestions) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate final score
      const correctAnswers = answers.filter(a => a.isCorrect).length;
      setScore((correctAnswers / quizData.totalQuestions) * 100);
      setQuizCompleted(true);
    }
  };

  const getCurrentAnswer = (questionId: number) => {
    return answers.find(a => a.questionId === questionId);
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

          {/* Multiple Choice */}
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

          {/* True/False */}
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

          {/* Fill in the Blank */}
          {question.type === "fill-blank" && (
            <Input
              placeholder="Sua resposta aqui... (separe múltiplas respostas com vírgula)"
              value={userAnswer?.answer as string || ""}
              onChange={(e) => handleAnswer(question.id, e.target.value)}
              className="w-full"
            />
          )}

          {/* Short Answer */}
          {question.type === "short-answer" && (
            <Textarea
              placeholder="Digite sua resposta detalhada aqui..."
              value={userAnswer?.answer as string || ""}
              onChange={(e) => handleAnswer(question.id, e.target.value)}
              className="min-h-[100px] resize-none"
            />
          )}
        </div>

        {/* Feedback */}
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

        {/* Next Button */}
        {showQuestionFeedback && (
          <div className="flex justify-end">
            <Button onClick={nextQuestion} className="gap-2">
              {currentQuestion === quizData.totalQuestions ? 'Finalizar Quiz' : 'Próxima Pergunta'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (quizCompleted) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
              <Card className="border-0 shadow-lg">
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl font-bold mb-2">Quiz Concluído!</CardTitle>
                  <div className="space-y-4">
                    <div className="text-6xl font-bold text-primary">{Math.round(score)}%</div>
                    <Badge variant={score >= 70 ? "default" : "secondary"} className="text-lg px-4 py-2">
                      {score >= 70 ? "Aprovado" : "Precisa Melhorar"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                  <p className="text-foreground-muted">
                    Você acertou {answers.filter(a => a.isCorrect).length} de {quizData.totalQuestions} perguntas.
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
            {/* Header with Back Button */}
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/courses">
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              </Button>
              <h1 className="text-xl font-semibold">Quiz Interativo</h1>
            </div>

            {/* Progress Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground-muted">Progresso do Quiz</span>
                <span className="text-sm font-semibold">
                  Pergunta {currentQuestion} de {quizData.totalQuestions}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Main Quiz Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">{quizData.title}</CardTitle>
                <p className="text-foreground-muted">{quizData.description}</p>
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