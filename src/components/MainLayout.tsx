import { ReactNode } from "react";
import Navbar from "./Navbar";
import { PWAInstallPrompt } from "./PWAInstallPrompt";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="min-h-screen">
      <div className="relative z-10">
        <Navbar />
        <main className="flex-1 pt-14 sm:pt-16">
          {children}
        </main>
      </div>
      <PWAInstallPrompt />
    </div>
  );
};

export default MainLayout;