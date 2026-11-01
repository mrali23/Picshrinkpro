export interface ProcessedImage {
  id: string;
  originalFile: File;
  originalName: string;
  originalSize: number;
  originalWidth?: number;
  originalHeight?: number;
  originalPreviewUrl: string;
  processedBlob?: Blob;
  processedUrl?: string;
  processedSize?: number;
  processedWidth?: number;
  processedHeight?: number;
  status: 'idle' | 'processing' | 'done' | 'error';
  progress?: number;
  error?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ToolMeta {
  id: string;
  path: string;
  name: string;
  shortName: string;
  title: string;
  description: string;
  iconName: string;
  color: string;
  badge?: string;
  acceptedTypes: string;
  faqs: FaqItem[];
}

export interface BlogPost {
  slug: string;
  path: string;
  title: string;
  description: string;
  author: string;
  date: string;
  readTime: string;
  category: string;
  tags: string[];
  image: string;
  references?: { title: string; source: string; url: string }[];
  content: {
    lead: string;
    sections: {
      h2: string;
      paragraphs: string[];
      bullets?: string[];
      callout?: {
        type: 'info' | 'tip' | 'warning';
        text: string;
        link?: { text: string; url: string };
      };
      table?: {
        headers: string[];
        rows: string[][];
      };
    }[];
  };
}
