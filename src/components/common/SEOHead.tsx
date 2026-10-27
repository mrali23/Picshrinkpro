import { Helmet } from 'react-helmet-async';
import { usePublicSiteSettings } from '../../utils/siteSettings';

interface SEOHeadProps {
  title: string;
  description: string;
  path: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  schema?: Record<string, any> | Record<string, any>[];
  articleData?: {
    publishedTime?: string;
    author?: string;
    tags?: string[];
  };
}

const getOrigin = () => {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return '';
};

export function SEOHead({
  title,
  description,
  path,
  ogType = 'website',
  ogImage = '/favicon.svg',
  schema,
  articleData,
}: SEOHeadProps) {
  const { siteName, siteDescription } = usePublicSiteSettings();
  const origin = getOrigin();
  const cleanPath = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  const canonicalUrl = origin ? `${origin}${cleanPath || '/'}` : cleanPath || '/';
  const resolvedOgImage = ogImage.startsWith('http') || !origin ? ogImage : `${origin}${ogImage}`;
  const pageTitle = title.replace(/PicShrink/gi, siteName);
  const pageDescription = path === '/' ? siteDescription : description;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="title" content={pageTitle} />
      <meta name="description" content={pageDescription} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={resolvedOgImage} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={resolvedOgImage} />

      {/* Article specific metadata */}
      {ogType === 'article' && articleData?.publishedTime && (
        <meta property="article:published_time" content={articleData.publishedTime} />
      )}
      {ogType === 'article' && articleData?.author && (
        <meta property="article:author" content={articleData.author} />
      )}
      {ogType === 'article' &&
        articleData?.tags?.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}

      {/* Schema.org JSON-LD Structured Data */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
}
