/**
 * CalloutGallery - Phase 5C: Rich visual selector for callout types
 * Shows preview cards with emojis, titles, and descriptions
 */

import React from 'react';
import { Editor } from '@tiptap/react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface CalloutGalleryProps {
  editor?: Editor;
  onSelect: (type: string) => void;
}

const calloutTypes = [
  // Learning Category
  {
    type: 'concept',
    emoji: '📖',
    title: 'Conceito Fundamental',
    description: 'Explicação de teoria ou conceito',
    category: 'learning',
    bgClass: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
  },
  {
    type: 'question',
    emoji: '🤔',
    title: 'Pergunta para Reflexão',
    description: 'Estimule o pensamento crítico',
    category: 'learning',
    bgClass: 'bg-violet-50 border-violet-200 hover:bg-violet-100',
  },
  {
    type: 'tip',
    emoji: '💡',
    title: 'Dica Prática',
    description: 'Sugestão ou atalho útil',
    category: 'learning',
    bgClass: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
  },
  {
    type: 'info',
    emoji: 'ℹ️',
    title: 'Informação',
    description: 'Contexto ou esclarecimento',
    category: 'learning',
    bgClass: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
  },
  
  // Practice Category
  {
    type: 'example',
    emoji: '🔬',
    title: 'Exemplo Prático',
    description: 'Demonstração com caso real',
    category: 'practice',
    bgClass: 'bg-sky-50 border-sky-200 hover:bg-sky-100',
  },
  {
    type: 'exercise',
    emoji: '✍️',
    title: 'Exercício Rápido',
    description: 'Atividade para praticar',
    category: 'practice',
    bgClass: 'bg-lime-50 border-lime-200 hover:bg-lime-100',
  },
  {
    type: 'professional',
    emoji: '🏭',
    title: 'Aplicação Profissional',
    description: 'Uso em contexto de trabalho',
    category: 'practice',
    bgClass: 'bg-slate-50 border-slate-300 hover:bg-slate-100',
  },
  
  // Advanced Category
  {
    type: 'deep',
    emoji: '🔍',
    title: 'Aprofundamento',
    description: 'Conteúdo avançado detalhado',
    category: 'advanced',
    bgClass: 'bg-purple-100 border-purple-300 hover:bg-purple-200',
  },
  {
    type: 'connection',
    emoji: '🔗',
    title: 'Conexão com Outros Conceitos',
    description: 'Relação entre tópicos',
    category: 'advanced',
    bgClass: 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100',
  },
  {
    type: 'quote',
    emoji: '🎓',
    title: 'Citação do Especialista',
    description: 'Referência de autoridade',
    category: 'advanced',
    bgClass: 'bg-gray-50 border-gray-300 hover:bg-gray-100',
  },
  
  // Caution Category
  {
    type: 'warning',
    emoji: '⚠️',
    title: 'Atenção',
    description: 'Alerta ou cuidado importante',
    category: 'caution',
    bgClass: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
  },
  {
    type: 'error',
    emoji: '❌',
    title: 'Erro Comum',
    description: 'Armadilha ou equívoco frequente',
    category: 'caution',
    bgClass: 'bg-red-50 border-red-200 hover:bg-red-100',
  },
  
  // Other
  {
    type: 'summary',
    emoji: '📊',
    title: 'Resumo Executivo',
    description: 'Síntese dos pontos principais',
    category: 'other',
    bgClass: 'bg-teal-50 border-teal-200 hover:bg-teal-100',
  },
  {
    type: 'ai',
    emoji: '✨',
    title: 'Gerado por IA',
    description: 'Conteúdo criado com assistência',
    category: 'other',
    bgClass: 'bg-pink-50 border-pink-200 hover:bg-pink-100',
  },
  {
    type: 'success',
    emoji: '✅',
    title: 'Ponto de Destaque',
    description: 'Conquista ou resultado positivo',
    category: 'other',
    bgClass: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
  },
];

export const CalloutGallery: React.FC<CalloutGalleryProps> = ({ onSelect }) => {
  const handleInsert = (type: string) => {
    onSelect(type);
  };

  const categories = [
    { id: 'learning', label: '📚 Aprendizado', types: calloutTypes.filter(t => t.category === 'learning') },
    { id: 'practice', label: '🎯 Prática', types: calloutTypes.filter(t => t.category === 'practice') },
    { id: 'advanced', label: '🚀 Avançado', types: calloutTypes.filter(t => t.category === 'advanced') },
    { id: 'caution', label: '⚡ Atenção', types: calloutTypes.filter(t => t.category === 'caution') },
    { id: 'other', label: '📌 Outros', types: calloutTypes.filter(t => t.category === 'other') },
  ];

  return (
    <div className="pr-2">
      {/* PHASE 1: Removed overflow-y-auto to fix dual scrollbars - Dialog handles scrolling */}
      <div className="space-y-6">
        {categories.map(category => (
          <div key={category.id}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              {category.label}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {category.types.map(callout => (
                <Card
                  key={callout.type}
                  className={cn(
                    'p-4 cursor-pointer transition-all duration-200 hover:shadow-lg border-2',
                    callout.bgClass
                  )}
                  onClick={() => handleInsert(callout.type)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg bg-white/70 flex items-center justify-center text-2xl">
                        {callout.emoji}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-1">{callout.title}</h4>
                      <p className="text-xs text-muted-foreground">{callout.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
