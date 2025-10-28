import { supabase } from '@/integrations/supabase/client';
import { Reference } from '../types/reference.types';

export class ReferenceService {
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static async updateReferences(lectureId: string, structuredContent: any, references: Reference[]) {
    const { error } = await supabase
      .from('lectures')
      .update({
        structured_content: {
          ...structuredContent,
          referencias_externas: references
        }
      })
      .eq('id', lectureId);
    
    if (error) throw error;
  }
}
