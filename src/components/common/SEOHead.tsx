import { Helmet } from 'react-helmet-async';
import { DEFAULT_SITE_SETTINGS, usePublicSiteSettings } from '../../utils/siteSettings';
import { TOOLS_DATA } from '../../data/toolsData';
import { DEFAULT_OG_IMAGE, SITE_URL, absoluteUrl } from '../../config/site';

interface SEOHeadProps {
  title: string;
  description: string;
  path: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  schema?: Record<string, any> | Record<string, any>[];
  /** Keeps the page out of search results (404, admin). Also drops the canonical. */
  noindex?: boolean;
  articleData?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    tags?: string[];
  };
}

/** Serialises JSON-LD safely for use inside a <script> element. */
function toJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function SEOHead({
  title,
  description,
  path,
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  schema,
  noindex = false,
  articleData,
}: SEOHeadProps) {
  const { siteName, siteDescription } = usePublicSiteSettings();
  const cleanPath = path === '/' ? '/' : path.startsWith('/') ? path : `/${path}`;
  const canonicalUrl = `${SITE_URL}${cleanPath}`;
  const resolvedOgImage = absoluteUrl(ogImage);
  const pageTitle = title.replace(/PicShrink/gi, siteName);
  // The home page uses the admin-configured description only when it was customised;
  // otherwise the richer page description wins over the short built-in default.
  const useSiteDescription = path === '/' && siteDescription !== DEFAULT_SITE_SETTINGS.siteDescription;
  const pageDescription = useSiteDescription ? siteDescription : description;

  // Every tool page gets WebApplication + breadcrumb structured data automatically.
  const tool = TOOLS_DATA.find((item) => item.path === path);
  const toolSchema = tool
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: tool.name,
          url: canonicalUrl,
          description: tool.description,
          applicationCategory: 'MultimediaApplication',
          operatingSystem: 'Any',
          browserRequirements: 'Requires JavaScript',
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: tool.name, item: canonicalUrl },
          ],
        },
      ]
    : [];
  const extraSchema = schema ? (Array.isArray(schema) ? schema : [schema]) : [];
  const allSchema = [...toolSchema, ...extraSchema];

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta
        name="robots"
        content={noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1'}
      />
      {!noindex && <link rel="canonical" href={canonicalUrl} />}

      {!noindex && (
        <meta property="og:url" content={canonicalUrl} />
      )}
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={resolvedOgImage} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={resolvedOgImage} />

      {/* Article specific metadata */}
      {ogType === 'article' && articleData?.publishedTime && (
        <meta property="article:published_time" content={articleData.publishedTime} />
      )}
      {ogType === 'article' && articleData?.modifiedTime && (
        <meta property="article:modified_time" content={articleData.modifiedTime} />
      )}
      {ogType === 'article' && articleData?.author && (
        <meta property="article:author" content={articleData.author} />
      )}
      {ogType === 'article' &&
        articleData?.tags?.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}

      {/* Schema.org JSON-LD Structured Data */}
      {allSchema.length > 0 && (
        <script type="application/ld+json">{toJsonLd(allSchema)}</script>
      )}
    </Helmet>
  );
}
