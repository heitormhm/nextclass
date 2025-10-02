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

  return (
    <Card className="p-4 bg-gray-900/40 backdrop-blur-lg border-gray-700">
      <div className="flex gap-3">
        <div className={`p-2 rounded-lg h-fit ${type === 'alert' ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
          {type === 'alert' ? (
            <AlertCircle className="h-5 w-5 text-red-400" />
          ) : (
            <Sparkles className="h-5 w-5 text-green-400" />
          )}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-white mb-1">{title}</h4>
          <p className="text-sm text-gray-400 mb-3">{description}</p>
          {actionLabel && actionRoute && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(actionRoute)}
              className="border-gray-700 hover:bg-gray-800"
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};