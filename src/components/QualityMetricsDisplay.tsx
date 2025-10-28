import React from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, BookOpen, Link as LinkIcon } from 'lucide-react';

/**
 * FASE 7: Dashboard de Qualidade do Material Didático
 * 
 * Exibe métricas de qualidade do conteúdo gerado:
 * - Fórmulas LaTeX válidas
 * - Diagramas Mermaid renderizados
 * - Percentual de referências acadêmicas
 */

interface QualityMetrics {
  latex_formulas_valid: number;
  latex_formulas_total: number;
  mermaid_diagrams_rendered: number;
  mermaid_diagrams_total: number;
  academic_references_percent: number;
  total_references: number;
  word_count: number;
  generation_time_seconds?: number;
}

interface QualityMetricsDisplayProps {
  metrics: QualityMetrics;
}

export const QualityMetricsDisplay = ({ metrics }: QualityMetricsDisplayProps) => {
  const latexPercent = metrics.latex_formulas_total > 0
    ? Math.round((metrics.latex_formulas_valid / metrics.latex_formulas_total) * 100)
    : 100;
  
  const mermaidPercent = metrics.mermaid_diagrams_total > 0
    ? Math.round((metrics.mermaid_diagrams_rendered / metrics.mermaid_diagrams_total) * 100)
    : 100;
  
  const academicPercent = Math.round(metrics.academic_references_percent);

  // Determine overall quality score (weighted average)
  const overallScore = Math.round(
    (latexPercent * 0.3) + 
    (mermaidPercent * 0.3) + 
    (academicPercent * 0.4)
  );

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 70) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle2 className="w-5 h-5" />;
    return <AlertCircle className="w-5 h-5" />;
  };

  return (
    <Card className="mb-6 p-4 bg-gradient-to-br from-background to-muted/20 border-2 border-primary/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Qualidade do Material</h3>
        </div>
        <div className={`flex items-center gap-2 ${getScoreColor(overallScore)}`}>
          {getScoreIcon(overallScore)}
          <span className="text-2xl font-bold">{overallScore}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* LaTeX Quality */}
        <MetricCard
          title="Fórmulas LaTeX"
          value={latexPercent}
          count={`${metrics.latex_formulas_valid}/${metrics.latex_formulas_total}`}
          icon="📐"
          color={latexPercent >= 95 ? 'emerald' : latexPercent >= 85 ? 'amber' : 'rose'}
        />

        {/* Mermaid Diagrams */}
        <MetricCard
          title="Diagramas"
          value={mermaidPercent}
          count={`${metrics.mermaid_diagrams_rendered}/${metrics.mermaid_diagrams_total}`}
          icon="📊"
          color={mermaidPercent >= 95 ? 'emerald' : mermaidPercent >= 85 ? 'amber' : 'rose'}
        />

        {/* Academic References */}
        <MetricCard
          title="Fontes Acadêmicas"
          value={academicPercent}
          count={`${Math.round(metrics.total_references * academicPercent / 100)}/${metrics.total_references} refs`}
          icon="🎓"
          color={academicPercent >= 70 ? 'emerald' : academicPercent >= 50 ? 'amber' : 'rose'}
        />
      </div>

      {/* Additional Info */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>{metrics.word_count.toLocaleString()} palavras</span>
        {metrics.generation_time_seconds && (
          <span>Gerado em {Math.round(metrics.generation_time_seconds)}s</span>
        )}
      </div>
    </Card>
  );
};

interface MetricCardProps {
  title: string;
  value: number;
  count: string;
  icon: string;
  color: 'emerald' | 'amber' | 'rose';
}

const MetricCard = ({ title, value, count, icon, color }: MetricCardProps) => {
  const colorClasses = {
    emerald: 'bg-purple-50 border-purple-200',
    amber: 'bg-purple-50 border-purple-300',
    rose: 'bg-purple-50 border-purple-200'
  };

  const textColorClasses = {
    emerald: 'text-purple-700',
    amber: 'text-purple-600',
    rose: 'text-purple-700'
  };

  return (
    <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className={`text-2xl font-bold ${textColorClasses[color]}`}>
          {value}%
        </span>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
    </div>
  );
};
