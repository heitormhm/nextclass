import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, User, Clock, MessageSquare } from "lucide-react";

interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp?: string;
}

interface FormattedTranscriptViewerProps {
  transcript: string;
}

export const FormattedTranscriptViewer = ({ transcript }: FormattedTranscriptViewerProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Parse the raw transcript into structured segments
  const parseTranscript = (rawTranscript: string): TranscriptSegment[] => {
    if (!rawTranscript) return [];

    const segments: TranscriptSegment[] = [];
    const lines = rawTranscript.split('\n').filter(line => line.trim());

    let currentSpeaker = "Professor";
    let currentText = "";
    let segmentIndex = 0;

    for (const line of lines) {
      // Detect speaker changes (patterns like "Professor:", "Aluno:", "Estagiário:", etc.)
      const speakerMatch = line.match(/^(Professor|Aluno|Estagiário|Supervisor|Instrutor|Estudante|Participante)[\s:]*/i);
      
      if (speakerMatch) {
        // Save previous segment if exists
        if (currentText.trim()) {
          segments.push({
            speaker: currentSpeaker,
            text: currentText.trim(),
            timestamp: formatTimestamp(segmentIndex)
          });
          segmentIndex++;
        }
        
        // Start new segment
        currentSpeaker = speakerMatch[1];
        currentText = line.replace(speakerMatch[0], '').trim();
      } else {
        // Continue current segment
        currentText += (currentText ? ' ' : '') + line.trim();
      }
    }

    // Add last segment
    if (currentText.trim()) {
      segments.push({
        speaker: currentSpeaker,
        text: currentText.trim(),
        timestamp: formatTimestamp(segmentIndex)
      });
    }

    // If no speaker patterns detected, split by paragraphs
    if (segments.length === 0) {
      const paragraphs = rawTranscript.split('\n\n').filter(p => p.trim());
      return paragraphs.map((text, index) => ({
        speaker: index % 2 === 0 ? "Professor" : "Participante",
        text: text.trim(),
        timestamp: formatTimestamp(index)
      }));
    }

    return segments;
  };

  // Format timestamp (approximate based on segment index)
  const formatTimestamp = (index: number): string => {
    const minutes = Math.floor(index * 2);
    const seconds = (index * 2) % 60;
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Highlight search term in text
  const highlightText = (text: string, term: string): React.ReactNode => {
    if (!term.trim()) return text;

    const regex = new RegExp(`(${term})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-gray-900 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const segments = parseTranscript(transcript);
  const filteredSegments = searchTerm.trim()
    ? segments.filter(seg => 
        seg.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seg.speaker.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : segments;

  // Get speaker color
  const getSpeakerColor = (speaker: string): string => {
    const speakerLower = speaker.toLowerCase();
    if (speakerLower.includes('professor') || speakerLower.includes('instrutor')) {
      return 'bg-purple-100 text-purple-700 border-purple-200';
    }
    if (speakerLower.includes('supervisor')) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    if (speakerLower.includes('estagiário') || speakerLower.includes('estagiario')) {
      return 'bg-green-100 text-green-700 border-green-200';
    }
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  if (!transcript || transcript.trim().length === 0) {
    return (
      <Card className="p-8 text-center">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Nenhuma transcrição disponível</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar na transcrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="outline" className="flex items-center gap-1.5">
          <MessageSquare className="h-3 w-3" />
          {segments.length} segmentos
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1.5">
          <User className="h-3 w-3" />
          {new Set(segments.map(s => s.speaker)).size} participantes
        </Badge>
        {searchTerm && (
          <Badge variant="outline" className="flex items-center gap-1.5 bg-yellow-50">
            <Search className="h-3 w-3" />
            {filteredSegments.length} resultados
          </Badge>
        )}
      </div>

      {/* Transcript Segments */}
      <ScrollArea className="h-[500px] rounded-lg border bg-card">
        <div className="p-4 space-y-4">
          {filteredSegments.length > 0 ? (
            filteredSegments.map((segment, index) => (
              <Card 
                key={index} 
                className="p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getSpeakerColor(segment.speaker)}`}>
                      <User className="h-5 w-5" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-sm">
                        {segment.speaker}
                      </span>
                      {segment.timestamp && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {segment.timestamp}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm leading-relaxed text-foreground">
                      {highlightText(segment.text, searchTerm)}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                Nenhum resultado encontrado para "{searchTerm}"
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
