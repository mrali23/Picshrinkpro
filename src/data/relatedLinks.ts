// Internal-linking map: for each tool, the three most relevant sibling tools plus the
// blog guide that explains the topic. Used by <RelatedTools /> and by the prerender script.
export interface RelatedConfig {
  tools: string[];
  guideSlug: string;
}

export const RELATED_LINKS: Record<string, RelatedConfig> = {
  compressor: {
    tools: ['resizer', 'webp-converter', 'jpg-to-png'],
    guideSlug: 'how-to-compress-image-without-losing-quality',
  },
  'bg-remover': {
    tools: ['cropper', 'filters', 'resizer'],
    guideSlug: 'how-to-remove-background-from-image-free',
  },
  resizer: {
    tools: ['compressor', 'cropper', 'webp-converter'],
    guideSlug: 'how-to-resize-image-for-instagram',
  },
  cropper: {
    tools: ['resizer', 'filters', 'bg-remover'],
    guideSlug: 'how-to-resize-image-for-instagram',
  },
  'jpg-to-png': {
    tools: ['png-to-jpg', 'webp-converter', 'compressor'],
    guideSlug: 'jpg-vs-png-vs-webp-which-format-best',
  },
  'png-to-jpg': {
    tools: ['jpg-to-png', 'compressor', 'webp-converter'],
    guideSlug: 'jpg-vs-png-vs-webp-which-format-best',
  },
  'webp-converter': {
    tools: ['compressor', 'jpg-to-png', 'png-to-jpg'],
    guideSlug: 'jpg-vs-png-vs-webp-which-format-best',
  },
  'image-to-pdf': {
    tools: ['compressor', 'resizer', 'jpg-to-png'],
    guideSlug: 'how-to-convert-image-to-pdf-on-mobile',
  },
  filters: {
    tools: ['cropper', 'bg-remover', 'compressor'],
    guideSlug: 'best-free-image-tools-for-bloggers',
  },
};
