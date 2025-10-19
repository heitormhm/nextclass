import React, { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, User, GraduationCap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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
    <div className="space-y-4 text-sm">
      {/* Empty State - No transcription yet */}
      {segments.length === 0 && !isProcessing && currentWords.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">Aguardando transcrição...</p>
          <p className="text-xs mt-1">Comece a falar para ver a transcrição aqui</p>
        </div>
      )}

      {/* Loading State - Processing */}
      {segments.length === 0 && isProcessing && (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse">
              <Skeleton className="h-4 w-1/4 mb-2" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Past segments */}
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
  );
};
