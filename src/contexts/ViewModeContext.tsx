import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ViewModeContextType {
  isMobilePreview: boolean;
  toggleMobilePreview: () => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export const ViewModeProvider = ({ children }: { children: ReactNode }) => {
  const [isMobilePreview, setIsMobilePreview] = useState(() => {
    const saved = localStorage.getItem('mobilePreviewMode');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('mobilePreviewMode', String(isMobilePreview));
  }, [isMobilePreview]);

  const toggleMobilePreview = () => {
    setIsMobilePreview(prev => !prev);
  };

  return (
    <ViewModeContext.Provider value={{ isMobilePreview, toggleMobilePreview }}>
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within ViewModeProvider');
  }
  return context;
};
