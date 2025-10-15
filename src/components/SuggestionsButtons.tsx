import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface SuggestionsButtonsProps {
  suggestionsJobId: string;
  activeJobs: Map<string, any>;
  onSuggestionClick: (suggestion: string) => void;
  disabled?: boolean;
}

export const SuggestionsButtons = ({ 
  suggestionsJobId, 
  activeJobs, 
  onSuggestionClick,
  disabled 
}: SuggestionsButtonsProps) => {
  const [jobData, setJobData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const loadJob = async () => {
      // Primeiro tentar do cache
      const cachedJob = activeJobs.get(suggestionsJobId);
      
      if (cachedJob) {
        console.log('✅ Job found in cache:', suggestionsJobId);
        setJobData(cachedJob);
        return;
      }
      
      // Se não estiver em cache, buscar do banco
      console.log('🔍 Job not in cache, fetching from database:', suggestionsJobId);
      setLoading(true);
      
      try {
        const { data } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', suggestionsJobId)
          .maybeSingle();
        
        if (data && data.status === 'COMPLETED') {
          console.log('✅ Job loaded from database:', suggestionsJobId);
          setJobData({
            status: 'COMPLETED',
            type: data.job_type,
            result: data.result
          });
        } else {
          console.warn('⚠️ Job not found or not completed:', suggestionsJobId);
        }
      } catch (error) {
        console.error('Error loading job:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadJob();
  }, [suggestionsJobId, activeJobs]);
  
  if (loading) {
    return (
      <div className="flex items-center gap-2 mt-3 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
        <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
        <p className="text-sm text-purple-700 dark:text-purple-300">Carregando sugestões...</p>
      </div>
    );
  }
  
  if (!jobData) {
    console.warn('⚠️ No job data available for:', suggestionsJobId);
    return null;
  }
  
  // Mostrar loading enquanto processa
  if (jobData.status === 'PENDING') {
    return (
      <div className="flex items-center gap-2 mt-3 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
        <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
        <p className="text-sm text-purple-700 dark:text-purple-300">Gerando sugestões de aprofundamento...</p>
      </div>
    );
  }
  
  // Mostrar botões quando completar
  if (jobData.status === 'COMPLETED' && jobData.result) {
    try {
      const parsed = JSON.parse(jobData.result);
      const suggestions = parsed.suggestions || [];
      
      if (suggestions.length === 0) return null;
      
      return (
        <div className="mt-4 space-y-3 animate-in fade-in-50 duration-500">
          <div className="flex items-center gap-2 text-sm font-bold text-purple-600 dark:text-purple-400">
            <Sparkles className="h-5 w-5" />
            <span>Continue explorando:</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {suggestions.map((suggestion: string, index: number) => (
              <Button
                key={index}
                variant="outline"
                onClick={() => onSuggestionClick(suggestion)}
                disabled={disabled}
                className="justify-start text-left h-auto min-h-[60px] py-4 px-4 border-2 border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/50 hover:border-purple-500 dark:hover:border-purple-500 text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 transition-all duration-200 rounded-lg shadow-sm hover:shadow-md whitespace-normal"
              >
                <span className="text-sm font-medium leading-normal break-words w-full">{suggestion}</span>
              </Button>
            ))}
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error parsing suggestions:', error);
      return null;
    }
  }
  
  return null;
};
