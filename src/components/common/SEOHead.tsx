import { Helmet } from 'react-helmet-async';

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
  const origin = getOrigin();
  const cleanPath = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  const canonicalUrl = origin ? `${origin}${cleanPath || '/'}` : cleanPath || '/';
  const resolvedOgImage = ogImage.startsWith('http') || !origin ? ogImage : `${origin}${ogImage}`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={resolvedOgImage} />
      <meta property="og:site_name" content="PicShrink" />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
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
