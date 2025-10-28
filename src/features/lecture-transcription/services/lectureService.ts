import { supabase } from '@/integrations/supabase/client';
import { Lecture } from '../types/lecture.types';

export class LectureService {
  static async loadLecture(id: string): Promise<Lecture | null> {
    const { data, error } = await supabase
      .from('lectures')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as unknown as Lecture;
  }

  static async updateLecture(id: string, updates: Partial<Lecture>) {
    const { error } = await supabase
      .from('lectures')
      .update({
        ...(updates as any),
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', id);
    
    if (error) throw error;
  }

  static async publishLecture(id: string, classId: string, title: string) {
    return this.updateLecture(id, {
      title,
      class_id: classId,
      status: 'published'
    } as any);
  }

  static async processTranscript(lectureId: string, transcript: string) {
    const { data, error } = await supabase.functions.invoke('process-lecture-transcript', {
      body: { lectureId, transcript }
    });
    
    if (error) throw error;
    return data;
  }

  static async postProcessMaterialDidatico(markdown: string): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('format-lecture-content', {
        body: { markdown }
      });
      
      if (error) {
        console.error('[LectureService] Post-processing failed:', error);
        return markdown;
      }
      
      return data.cleanedMarkdown || markdown;
    } catch (err) {
      console.error('[LectureService] Post-processing exception:', err);
      return markdown;
    }
  }
}
