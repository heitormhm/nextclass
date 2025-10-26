import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, Loader2, Upload, FileText, Tags, Image } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ProcessingStep {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  duration: number; // ms
}

const PROCESSING_STEPS: ProcessingStep[] = [
  { id: 'upload', label: 'Salvando áudio...', icon: Upload, duration: 8000 },
  { id: 'transcript', label: 'Processando transcrição...', icon: FileText, duration: 25000 },
  { id: 'tags', label: 'Gerando tags...', icon: Tags, duration: 5000 },
  { id: 'thumbnail', label: 'Criando thumbnail...', icon: Image, duration: 8000 },
];

interface Props {
  isVisible: boolean;
  onComplete: () => void;
}

export const ProcessingLoadingScreen: React.FC<Props> = ({ isVisible, onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    if (!isVisible) return;

    const currentStep = PROCESSING_STEPS[currentStepIndex];
    if (!currentStep) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCompletedSteps(prev => [...prev, currentStep.id]);
      setCurrentStepIndex(prev => prev + 1);
    }, currentStep.duration);

    return () => clearTimeout(timer);
  }, [currentStepIndex, isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <Card className="w-full max-w-md p-8 bg-white/90 backdrop-blur-xl border-white/30 shadow-2xl">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
          Processando Aula
        </h2>

        <div className="space-y-4">
          {PROCESSING_STEPS.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = index === currentStepIndex;
            const Icon = step.icon;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-3 p-4 rounded-lg transition-all shadow-md ${
                  isCompleted
                    ? 'bg-white border border-green-400/50'
                    : isCurrent
                    ? 'bg-white border border-blue-400/50'
                    : 'bg-white/50 border border-slate-200'
                }`}
              >
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="h-5 w-5 text-white" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-white/50" />
                    </div>
                  )}
                </div>

                <span
                  className={`font-medium ${
                    isCompleted || isCurrent ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-slate-600 text-sm mt-6">
          Isso pode levar até 1 minuto...
        </p>
      </Card>
    </div>
  );
};
