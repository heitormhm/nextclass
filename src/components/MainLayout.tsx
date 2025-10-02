import { ReactNode } from "react";
import Navbar from "./Navbar";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-blur-blobs">
      <div className="relative z-10">
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;