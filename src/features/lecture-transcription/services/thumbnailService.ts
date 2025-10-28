import { supabase } from '@/integrations/supabase/client';

export class ThumbnailService {
  static async generateThumbnail(topic: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-lecture-thumbnail', {
        body: { topic }
      });
      
      if (error) throw error;
      return data?.imageUrl || null;
    } catch (error) {
      console.error('Thumbnail generation error:', error);
      return null;
    }
  }

  static async uploadThumbnail(file: File, userId: string): Promise<string> {
    const fileName = `${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lecture-audio')
      .upload(`thumbnails/${userId}/${fileName}`, file);
    
    if (uploadError) throw uploadError;
    
    const { data: urlData } = supabase.storage
      .from('lecture-audio')
      .getPublicUrl(uploadData.path);
    
    return urlData.publicUrl;
  }
}
