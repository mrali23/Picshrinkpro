import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Calendar, Clock, User, ArrowLeft, ArrowRight, Share2, Sparkles, CheckCircle2 } from 'lucide-react';
import { SEOHead } from '../../components/common/SEOHead';
import { AdBanner } from '../../components/common/AdBanner';
import { BLOG_POSTS } from '../../data/blogData';
import { NotFoundPage } from '../NotFoundPage';
import { LOGO_URL, SITE_NAME, absoluteUrl } from '../../config/site';

interface ManagedPublicPost {
  title: string; slug: string; excerpt: string; body: string; status: 'published';
  seoTitle: string; metaDescription: string; canonicalUrl: string; ogImageUrl: string;
  publishedAt?: number; updatedAt: number;
}

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  const [managedPost, setManagedPost] = useState<ManagedPublicPost | null>(null);
  const [managedLoading, setManagedLoading] = useState(!post);

  useEffect(() => {
    if (post || !slug) { setManagedLoading(false); return; }
    let active = true;
    setManagedLoading(true);
    fetch('/api/content/' + encodeURIComponent(slug), { headers: { Accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error('Content not found');
        return response.json() as Promise<{ content: ManagedPublicPost }>;
      })
      .then((result) => { if (active) setManagedPost(result.content); })
      .catch(() => { if (active) setManagedPost(null); })
      .finally(() => { if (active) setManagedLoading(false); });
    return () => { active = false; };
  }, [post, slug]);

  if (!post && managedLoading) return <main className="mx-auto max-w-4xl px-4 py-20 text-center text-slate-500">Loading article…</main>;
  if (!post && !managedPost) return <NotFoundPage />;

  if (!post && managedPost) {
    const paragraphs = managedPost.body.split(/\n\s*\n/).filter(Boolean);
    const path = '/blog/' + managedPost.slug;
    const articleDate = new Date(managedPost.publishedAt ?? managedPost.updatedAt).toISOString();
    const managedSchema = {
      '@context': 'https://schema.org', '@type': 'BlogPosting',
      headline: managedPost.title, description: managedPost.metaDescription || managedPost.excerpt,
      image: managedPost.ogImageUrl ? [managedPost.ogImageUrl] : undefined,
      datePublished: articleDate, dateModified: new Date(managedPost.updatedAt).toISOString(),
      author: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/about') },
      publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: absoluteUrl(LOGO_URL) } },
      mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(path) },
    };
    return (
      <article className="min-h-screen bg-slate-50 py-10">
        <SEOHead title={managedPost.seoTitle || managedPost.title} description={managedPost.metaDescription || managedPost.excerpt} path={path} canonicalUrl={managedPost.canonicalUrl || undefined} ogType="article" ogImage={managedPost.ogImageUrl || undefined} schema={managedSchema} />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link to="/blog" className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600"><ArrowLeft className="h-4 w-4"/>Back to All Blog Posts</Link>
          <header className="mb-8 mt-5 space-y-4"><p className="text-xs font-semibold uppercase tracking-wider text-blue-600">PicShrink Guide</p><h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">{managedPost.title}</h1><p className="text-lg leading-relaxed text-slate-600">{managedPost.excerpt}</p><time className="text-xs text-slate-400">{new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(managedPost.publishedAt ?? managedPost.updatedAt))}</time></header>
          {managedPost.ogImageUrl && <img src={managedPost.ogImageUrl} alt={managedPost.title} className="mb-8 max-h-[460px] w-full rounded-3xl object-cover"/>}
          <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 text-base leading-8 text-slate-700 shadow-sm sm:p-12">{paragraphs.map((paragraph, index) => <p key={index} className="whitespace-pre-wrap">{paragraph}</p>)}</div>
        </div>
      </article>
    );
  }

  // Schema.org BlogPosting
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    image: [post.image],
    datePublished: post.date,
    dateModified: post.date,
    author: {
      '@type': 'Organization',
      name: post.author,
      url: absoluteUrl('/about'),
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl(LOGO_URL),
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': absoluteUrl(post.path),
    },
  };

  const otherPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <article className="min-h-screen bg-slate-50 py-10">
      <SEOHead
        title={post.title}
        description={post.description}
        path={post.path}
        ogType="article"
        ogImage={post.image}
        schema={articleSchema}
        articleData={{
          author: post.author,
          publishedTime: post.date,
          modifiedTime: post.date,
          tags: post.tags,
        }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Blog Posts</span>
          </Link>
        </div>

        {/* Article Header */}
        <header className="space-y-4 mb-6">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider text-[11px]">
              {post.category}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> {post.date}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> {post.readTime}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" /> By {post.author}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {post.title}
          </h1>

          <p className="text-base sm:text-xl text-slate-600 leading-relaxed font-normal">
            {post.content.lead}
          </p>
        </header>

        {/* AdSense Top */}
        <AdBanner type="top" />

        {/* Hero Image */}
        <div className="my-8 rounded-3xl overflow-hidden shadow-md max-h-[460px] bg-slate-900">
          <img
            src={post.image}
            alt={post.title}
            width={1200}
            height={630}
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover max-h-[460px]"
          />
        </div>

        {/* Main Content Body */}
        <div className="bg-white rounded-3xl p-6 sm:p-12 border border-slate-200/90 shadow-sm space-y-10 text-slate-700 leading-relaxed text-base sm:text-lg">
          {post.content.sections.map((section, idx) => (
            <section key={idx} className="space-y-4">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {section.h2}
              </h2>

              {section.paragraphs.map((p, pIdx) => (
                <p key={pIdx} className="text-slate-600 leading-relaxed">
                  {p}
                </p>
              ))}

              {section.bullets && (
                <ul className="space-y-2.5 pt-2 text-base">
                  {section.bullets.map((b, bIdx) => (
                    <li key={bIdx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{b}</span>
                    </li>
                  ))}
                </ul>
              )}

              {section.table && (
                <div className="my-6 overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-bold">
                      <tr>
                        {section.table.headers.map((h, hIdx) => (
                          <th key={hIdx} className="px-4 py-3">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {section.table.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/50">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="px-4 py-3 text-slate-600">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {section.callout && (
                <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-950 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-blue-700 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" /> Pro Tip
                  </div>
                  <p className="text-sm sm:text-base text-slate-700">{section.callout.text}</p>
                  {section.callout.link && (
                    <Link
                      to={section.callout.link.url}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      <span>{section.callout.link.text}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              )}
            </section>
          ))}

          {/* Tags */}
          <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">
              Tags:
            </span>
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* AdSense Bottom */}
        <AdBanner type="bottom" />

        {/* Related Articles */}
        <div className="mt-12 space-y-6">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Related Articles</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {otherPosts.map((related) => (
              <Link
                key={related.slug}
                to={related.path}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <span className="text-[11px] font-bold text-blue-600 block mb-1">
                    {related.category}
                  </span>
                  <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm line-clamp-2">
                    {related.title}
                  </h4>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{related.readTime}</span>
                  <span className="text-blue-600 font-semibold inline-flex items-center gap-0.5">
                    Read <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
