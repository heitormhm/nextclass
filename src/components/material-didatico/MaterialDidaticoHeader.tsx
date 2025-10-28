import React from 'react';
import { Save, Download, Share2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MATERIAL_THEME, STATUS_COLORS } from '@/utils/materialDidaticoTheme';

interface MaterialDidaticoHeaderProps {
  title: string;
  status: 'processing' | 'ready' | 'published' | 'failed';
  onTitleChange: (title: string) => void;
  onSave: () => void;
  onPublish: () => void;
  onExportPDF: () => void;
  isEditing: boolean;
}

export const MaterialDidaticoHeader: React.FC<MaterialDidaticoHeaderProps> = ({
  title,
  status,
  onTitleChange,
  onSave,
  onPublish,
  onExportPDF,
  isEditing,
}) => {
  const statusConfig = {
    processing: { icon: Clock, label: 'Processando', color: STATUS_COLORS.processing },
    ready: { icon: CheckCircle, label: 'Pronto', color: STATUS_COLORS.ready },
    published: { icon: Share2, label: 'Publicado', color: STATUS_COLORS.published },
    failed: { icon: AlertCircle, label: 'Falha', color: STATUS_COLORS.failed },
  };

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  return (
    <Card className={`${MATERIAL_THEME.components.card} ${MATERIAL_THEME.shadows.card}`}>
      <div className={MATERIAL_THEME.components.cardHeader}>
        <CardContent className="pt-6 pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Título Editável */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge className={`${currentStatus.color.bg} ${currentStatus.color.text} ${currentStatus.color.border} border`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {currentStatus.label}
                </Badge>
              </div>
              
              <Input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                className="text-2xl font-bold border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-purple-900"
                placeholder="Título do Material Didático"
              />
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2">
              <Button
                onClick={onSave}
                disabled={!isEditing}
                className={`${MATERIAL_THEME.components.button} ${MATERIAL_THEME.shadows.button}`}
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>

              <Button
                onClick={onExportPDF}
                variant="outline"
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>

              {status === 'ready' && (
                <Button
                  onClick={onPublish}
                  className={`${MATERIAL_THEME.components.button} ${MATERIAL_THEME.shadows.button}`}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Publicar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};
