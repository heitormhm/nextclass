import { ReactNode } from "react";
import Navbar from "./Navbar";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
};

export default MainLayout;