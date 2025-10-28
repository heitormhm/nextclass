import { Badge } from '@/components/ui/badge';

interface LectureStatusBadgeProps {
  status: 'processing' | 'ready' | 'published';
}

export const LectureStatusBadge: React.FC<LectureStatusBadgeProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'processing':
        return {
          className: 'bg-yellow-500/30 text-yellow-100 border-yellow-300/40',
          label: '⏳ Processando'
        };
      case 'ready':
        return {
          className: 'bg-blue-500/30 text-blue-100 border-blue-300/40',
          label: '✏️ Rascunho'
        };
      case 'published':
        return {
          className: 'bg-green-500/30 text-green-100 border-green-300/40',
          label: '✅ Publicado'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge 
      variant="outline" 
      className={`backdrop-blur-xl shadow-lg ${config.className}`}
    >
      {config.label}
    </Badge>
  );
};
