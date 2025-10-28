import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart3 } from 'lucide-react';

interface QualityMetrics {
  clarity?: number;
  depth?: number;
  engagement?: number;
  overall?: number;
}

interface QualityMetricsCardProps {
  metrics?: QualityMetrics | null;
}

export const QualityMetricsCard: React.FC<QualityMetricsCardProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle>Métricas de Qualidade</CardTitle>
          </div>
          <CardDescription>
            Métricas ainda não calculadas
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const metricsData = [
    { label: 'Clareza', value: metrics.clarity || 0, color: 'bg-blue-500' },
    { label: 'Profundidade', value: metrics.depth || 0, color: 'bg-green-500' },
    { label: 'Engajamento', value: metrics.engagement || 0, color: 'bg-purple-500' },
    { label: 'Geral', value: metrics.overall || 0, color: 'bg-primary' },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <CardTitle>Métricas de Qualidade</CardTitle>
        </div>
        <CardDescription>
          Análise automática do conteúdo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metricsData.map((metric) => (
            <div key={metric.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{metric.label}</span>
                <span className="text-muted-foreground">{metric.value}%</span>
              </div>
              <Progress value={metric.value} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
