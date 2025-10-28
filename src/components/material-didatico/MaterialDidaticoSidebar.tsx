import React from 'react';
import { FileText, Users, Settings, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MATERIAL_THEME } from '@/utils/materialDidaticoTheme';

interface Section {
  id: string;
  title: string;
  type: string;
}

interface MaterialDidaticoSidebarProps {
  sections: Section[];
  currentSection: string;
  onSectionClick: (sectionId: string) => void;
  stats?: {
    wordCount: number;
    academicSources: number;
    diagrams: number;
  };
}

export const MaterialDidaticoSidebar: React.FC<MaterialDidaticoSidebarProps> = ({
  sections,
  currentSection,
  onSectionClick,
  stats,
}) => {
  return (
    <div className="space-y-4">
      {/* Navegação por Seções */}
      <Card className={`${MATERIAL_THEME.components.card} ${MATERIAL_THEME.shadows.card}`}>
        <CardHeader className={MATERIAL_THEME.components.cardHeader}>
          <CardTitle className="flex items-center text-purple-900">
            <FileText className="w-5 h-5 mr-2 text-purple-600" />
            Índice
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <div className="p-4 space-y-1">
              {sections.map((section, idx) => (
                <button
                  key={section.id}
                  onClick={() => onSectionClick(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    currentSection === section.id
                      ? 'bg-purple-100 text-purple-900 font-medium'
                      : 'text-gray-700 hover:bg-purple-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-purple-600 font-mono">
                      {(idx + 1).toString().padStart(2, '0')}
                    </span>
                    <span className="text-sm truncate">{section.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Métricas de Qualidade */}
      {stats && (
        <Card className={`${MATERIAL_THEME.components.card} ${MATERIAL_THEME.shadows.card}`}>
          <CardHeader className={MATERIAL_THEME.components.cardHeader}>
            <CardTitle className="flex items-center text-purple-900">
              <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
              Métricas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Palavras</span>
              <Badge className={MATERIAL_THEME.components.badge}>
                {stats.wordCount.toLocaleString()}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Fontes Acadêmicas</span>
              <Badge className={MATERIAL_THEME.components.badge}>
                {stats.academicSources}%
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Diagramas</span>
              <Badge className={MATERIAL_THEME.components.badge}>
                {stats.diagrams}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configurações */}
      <Card className={`${MATERIAL_THEME.components.card} ${MATERIAL_THEME.shadows.card}`}>
        <CardHeader className={MATERIAL_THEME.components.cardHeader}>
          <CardTitle className="flex items-center text-purple-900">
            <Settings className="w-5 h-5 mr-2 text-purple-600" />
            Configurações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <button className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-purple-50 transition-colors">
            <Users className="w-4 h-4 inline mr-2 text-purple-600" />
            Gerenciar Alunos
          </button>
        </CardContent>
      </Card>
    </div>
  );
};
