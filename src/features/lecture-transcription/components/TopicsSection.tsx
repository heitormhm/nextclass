import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

interface Topic {
  conceito: string;
  definicao: string;
}

interface TopicsSectionProps {
  topics?: Topic[];
}

export const TopicsSection: React.FC<TopicsSectionProps> = ({ topics = [] }) => {
  if (!topics || topics.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <CardTitle>Tópicos Principais</CardTitle>
        </div>
        <CardDescription>
          Conceitos-chave abordados nesta aula
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topics.map((topic, index) => (
            <div key={index} className="border-l-4 border-primary pl-4">
              <h4 className="font-semibold text-foreground mb-1">
                {topic.conceito}
              </h4>
              <p className="text-sm text-muted-foreground">
                {topic.definicao}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
