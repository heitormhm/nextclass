import { useState, useEffect } from 'react';
import { ThumbnailService } from '../services/thumbnailService';

export const useThumbnailGeneration = (topic: string | undefined, shouldGenerate: boolean) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (topic && shouldGenerate && !thumbnailUrl) {
      generateThumbnail(topic);
    }
  }, [topic, shouldGenerate]);

  const generateThumbnail = async (topic: string) => {
    setIsGenerating(true);
    const url = await ThumbnailService.generateThumbnail(topic);
    setThumbnailUrl(url);
    setIsGenerating(false);
  };

  const uploadThumbnail = async (file: File, userId: string) => {
    try {
      setIsGenerating(true);
      const url = await ThumbnailService.uploadThumbnail(file, userId);
      setThumbnailUrl(url);
      return url;
    } finally {
      setIsGenerating(false);
    }
  };

  return { thumbnailUrl, setThumbnailUrl, isGenerating, generateThumbnail, uploadThumbnail };
};
