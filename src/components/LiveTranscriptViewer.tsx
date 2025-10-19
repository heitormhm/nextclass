import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { User, GraduationCap } from 'lucide-react';

interface Word {
  text: string;
  confidence: number;
  start: number;
  end: number;
}

interface TranscriptSegment {
  speaker: 'Professor' | 'Aluno';
  text: string;
  words: Word[];
  timestamp: Date;
}

interface LiveTranscriptViewerProps {
  segments: TranscriptSegment[];
  currentWords: Word[];
  isProcessing: boolean;
}

export const LiveTranscriptViewer: React.FC<LiveTranscriptViewerProps> = ({
  segments,
  currentWords,
  isProcessing
}) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments, currentWords]);

  return (
    <div className="bg-white shadow-md rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-purple-600 flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          Transcrição ao Vivo
        </h3>
        {isProcessing && (
          <Badge variant="outline" className="text-xs">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1.5" />
            Processando
          </Badge>
        )}
      </div>
      
      <ScrollArea className="h-64 w-full pr-4">
        <div className="space-y-4">
          {segments.map((segment, idx) => (
            <div key={idx} className="group">
              <div className="flex items-start gap-2 mb-1">
                {segment.speaker === 'Professor' ? (
                  <GraduationCap className="h-4 w-4 text-blue-500 mt-0.5" />
                ) : (
                  <User className="h-4 w-4 text-green-500 mt-0.5" />
                )}
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${
                    segment.speaker === 'Professor' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {segment.speaker}
                </Badge>
                <span className="text-xs text-gray-400 ml-auto">
                  {segment.timestamp.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              <p className="text-sm text-gray-700 leading-relaxed ml-6">
                {segment.text}
              </p>
            </div>
          ))}
          
          {/* Palavras sendo processadas em tempo real */}
          {currentWords.length > 0 && (
            <div className="flex items-start gap-2">
              <GraduationCap className="h-4 w-4 text-purple-500 mt-0.5 animate-pulse" />
              <div className="flex flex-wrap gap-1">
                {currentWords.map((word, idx) => (
                  <span
                    key={idx}
                    className="text-sm text-gray-600 animate-fade-in"
                    style={{
                      opacity: word.confidence,
                      animationDelay: `${idx * 50}ms`
                    }}
                  >
                    {word.text}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div ref={endRef} />
        </div>
      </ScrollArea>
    </div>
  );
};
