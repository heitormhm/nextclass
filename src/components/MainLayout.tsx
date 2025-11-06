import { ReactNode } from "react";
import { X } from "lucide-react";
import Navbar from "./Navbar";
import { useViewMode } from "@/contexts/ViewModeContext";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { isMobilePreview, toggleMobilePreview } = useViewMode();
  
  return (
    <div className="min-h-screen bg-blur-blobs">
      <div className="relative z-10">
        <Navbar />
        
        {/* Mobile Preview Container */}
        {isMobilePreview ? (
          <div className="bg-muted/30 min-h-screen flex items-start justify-center pt-4 pb-8">
            <div className="relative w-[375px] bg-background border-x-2 border-border shadow-2xl min-h-[calc(100vh-2rem)]">
              <main className="flex-1">
                {children}
              </main>
              
              {/* Floating Badge */}
              <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm">
                <span className="text-sm font-medium">📱 Modo Mobile (375px)</span>
                <button
                  onClick={toggleMobilePreview}
                  className="hover:bg-white/20 rounded p-1 transition-colors"
                  aria-label="Sair do modo mobile"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <main className="flex-1">
            {children}
          </main>
        )}
      </div>
    </div>
  );
};

export default MainLayout;