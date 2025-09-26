import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, AlertCircle } from "lucide-react";
import MainLayout from "@/components/MainLayout";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <Card className="bg-card-secondary border-none">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-primary" />
              </div>
              
              <h1 className="text-4xl font-bold mb-4">404</h1>
              <h2 className="text-xl font-semibold mb-4">Página não encontrada</h2>
              <p className="text-foreground-muted mb-8">
                Ops! A página que você está procurando não existe ou foi movida.
              </p>
              
              <Button asChild className="bg-primary hover:bg-primary-light text-white">
                <a href="/" className="inline-flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Voltar ao Início
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default NotFound;
