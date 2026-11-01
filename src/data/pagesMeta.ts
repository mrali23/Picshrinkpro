// Title, description and path for the pages that are not tools or blog posts.
// Shared by the page components (via <SEOHead />) and by the build-time prerender
// script, so the HTML that crawlers fetch always matches what the app renders.
export interface PageMeta {
  title: string;
  description: string;
  path: string;
}

export const PAGE_META = {
  '/': {
    title: 'PicShrink - Free Online Image Tools - Compress, Convert & Edit',
    description:
      'Free online image tools to compress, remove background, resize, crop, convert JPG PNG WebP and image to PDF. 100% free, no watermark, browser-based private.',
    path: '/',
  },
  '/about': {
    title: 'About PicShrink - Our Mission for Free Private Image Tools',
    description:
      "Learn about PicShrink's mission: delivering 100% free, client-side, privacy-first online image tools with zero server uploads and zero watermarks.",
    path: '/about',
  },
  '/contact': {
    title: 'Contact Us - PicShrink Customer Support & Feedback',
    description:
      'Have questions, feature suggestions, or bug reports about PicShrink? Contact our team directly. We are always eager to assist you.',
    path: '/contact',
  },
  '/privacy-policy': {
    title: 'Privacy Policy - PicShrink Browser-Based Image Processing',
    description:
      'PicShrink processes image inputs in your browser. The AI runtime and model may be downloaded from third-party hosts; the selected image itself is processed locally.',
    path: '/privacy-policy',
  },
  '/terms': {
    title: 'Terms of Service - PicShrink Free Online Image Tools',
    description:
      'PicShrink Terms of Service: Guidelines, allowable usage, disclaimer of warranties, and service terms for our free online image tools.',
    path: '/terms',
  },
  '/blog': {
    title: 'PicShrink Blog - Image Optimization Guides & Tutorials',
    description:
      'Expert tutorials and guides on image compression, background removal, WebP conversion, social media sizing, and web performance optimization.',
    path: '/blog',
  },
} satisfies Record<string, PageMeta>;
