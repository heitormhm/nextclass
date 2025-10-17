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
    <Card className="p-4 frost-white-teacher-card hover:shadow-lg transition-all duration-200">
      <div className="flex gap-3">
        <div className={`p-2 rounded-lg h-fit ${type === 'alert' ? 'bg-red-100' : 'bg-green-100'}`}>
          {type === 'alert' ? (
            <AlertCircle className="h-5 w-5 text-red-600" />
          ) : (
            <Sparkles className="h-5 w-5 text-green-600" />
          )}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800 mb-1">{title}</h4>
          <p className="text-sm text-gray-600 mb-3">{description}</p>
          {actionLabel && actionRoute && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(actionRoute)}
              className="border-purple-300 text-purple-600 hover:bg-purple-50"
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};