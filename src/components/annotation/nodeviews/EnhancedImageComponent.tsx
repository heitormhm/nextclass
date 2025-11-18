/**
 * EnhancedImage React Component - NodeView
 * Renders images with editable captions
 */

import React, { useState } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { cn } from '@/lib/utils';

interface EnhancedImageComponentProps {
  node: {
    attrs: {
      src: string;
      alt: string;
      caption: string;
    };
  };
  updateAttributes: (attrs: Record<string, any>) => void;
  selected: boolean;
}

export const EnhancedImageComponent: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
}) => {
  const [caption, setCaption] = useState(node.attrs.caption || '');

  const handleCaptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCaption = e.target.value;
    setCaption(newCaption);
    updateAttributes({ caption: newCaption });
  };

  return (
    <NodeViewWrapper className="enhanced-image-wrapper my-4">
      <figure
        className={cn(
          'rounded-lg overflow-hidden border-2 transition-all',
          selected ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-border'
        )}
      >
        <img
          src={node.attrs.src}
          alt={node.attrs.alt || 'Imagem da anotação'}
          className="w-full h-auto"
        />
        {(caption || selected) && (
          <figcaption className="bg-muted/50 p-3">
            <input
              type="text"
              value={caption}
              onChange={handleCaptionChange}
              placeholder="Adicione uma legenda..."
              className="w-full bg-transparent text-sm text-muted-foreground focus:outline-none focus:text-foreground"
            />
          </figcaption>
        )}
      </figure>
    </NodeViewWrapper>
  );
};
