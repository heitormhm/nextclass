import React from 'react';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';

interface StudentLayoutProps {
  children: React.ReactNode;
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-slate-50">
      {/* Camada 0: Blobs de Gradiente Sutis */}
      <div className="absolute inset-0 z-0">
        <div className="absolute bottom-0 left-[-20%] right-0 top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(255,0,182,0.08),rgba(255,255,255,0))]"></div>
        <div className="absolute bottom-[-80px] right-[-30px] h-[314px] w-[514px] -rotate-45 rounded-full bg-[radial-gradient(circle_farthest-side,rgba(150,0,255,0.08),rgba(255,255,255,0))]"></div>
      </div>

      {/* Camada 1: Efeito de Grid Visível (Estilo para Tema Claro) */}
      <div className="absolute inset-0 z-10" style={{ 
        // @ts-ignore - CSS custom properties
        '--cell-border-color': 'rgba(226, 232, 240, 0.8)',
        '--cell-fill-color': 'rgba(255, 255, 255, 0.1)'
      }}>
        <BackgroundRippleEffect />
      </div>

      {/* Camada 2: Conteúdo da Página */}
      <div className="relative z-20">
        {children}
      </div>
    </main>
  );
};
