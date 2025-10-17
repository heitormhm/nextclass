import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface InsightCardProps {
  type: 'alert' | 'opportunity';
  title: string;
  description: string;
  actionLabel?: string;
  actionRoute?: string;
}

export const InsightCard = ({ type, title, description, actionLabel, actionRoute }: InsightCardProps) => {
  const navigate = useNavigate();

  const isAlert = type === 'alert';
  
  return (
    <Card className={`p-5 backdrop-blur-xl border shadow-lg transition-all duration-300 hover:scale-102 hover:shadow-xl ${
      isAlert 
        ? 'bg-gradient-to-r from-red-50/95 to-pink-50/95 border-red-200/50 shadow-red-500/10' 
        : 'bg-gradient-to-r from-green-50/95 to-emerald-50/95 border-green-200/50 shadow-green-500/10'
    }`}>
      <div className="flex gap-4">
        <div className={`p-3 rounded-xl h-fit shadow-md ${
          isAlert 
            ? 'bg-gradient-to-br from-red-500 to-pink-500' 
            : 'bg-gradient-to-br from-green-500 to-emerald-500'
        }`}>
          {isAlert ? (
            <AlertCircle className="h-6 w-6 text-white" strokeWidth={2.5} />
          ) : (
            <Sparkles className="h-6 w-6 text-white" strokeWidth={2.5} />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-bold text-gray-900 text-lg">{title}</h4>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              isAlert 
                ? 'bg-red-100 text-red-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {isAlert ? '🚨 Alerta' : '✨ Oportunidade'}
            </span>
          </div>
          <p className="text-sm text-gray-700 mb-4 leading-relaxed">{description}</p>
          {actionLabel && actionRoute && (
            <Button
              size="sm"
              onClick={() => navigate(actionRoute)}
              className={`shadow-md font-semibold ${
                isAlert
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
              }`}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};