import { Sparkles } from 'lucide-react';

interface LectureHeaderProps {
  lectureTitle: string;
}

export const LectureHeader: React.FC<LectureHeaderProps> = ({ lectureTitle }) => {
  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
      <div>
        <div className="flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-white animate-pulse drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
              Centro de Publicação Inteligente
            </h1>
            <p className="text-white/80 text-base drop-shadow-sm mt-1">
              Revise, edite e publique seu material didático gerado por IA
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
