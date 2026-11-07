import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Calendar, Clock, ArrowRight, Search, Sparkles } from 'lucide-react';
import { SEOHead } from '../../components/common/SEOHead';
import { AdBanner } from '../../components/common/AdBanner';
import { BLOG_POSTS } from '../../data/blogData';

interface ManagedIndexPost { id: string; title: string; slug: string; excerpt: string; seoTitle: string; metaDescription: string; ogImageUrl: string; publishedAt?: number; updatedAt: number; }

export function BlogIndexPage() {
  const [managedPosts, setManagedPosts] = useState<ManagedIndexPost[]>([]);
  useEffect(() => {
    let active = true;
    fetch('/api/content', { headers: { Accept: 'application/json' } })
      .then(async (response) => response.ok ? response.json() as Promise<{ content: ManagedIndexPost[] }> : { content: [] })
      .then((result) => { if (active) setManagedPosts(result.content); })
      .catch(() => { if (active) setManagedPosts([]); });
    return () => { active = false; };
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...new Set(BLOG_POSTS.map((p) => p.category))];

  const filteredPosts = BLOG_POSTS.filter((post) => {
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const featuredPost = BLOG_POSTS[0];

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <SEOHead
        title="PicShrink Blog - Image Optimization Guides & Tutorials"
        description="Expert tutorials and guides on image compression, background removal, WebP conversion, social media sizing, and web performance optimization."
        path="/blog"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 mb-3">
            <BookOpen className="w-3.5 h-3.5" /> Performance &amp; Design Insights
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            The PicShrink Blog
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Practical, in-depth tutorials on reducing image file sizes, mastering formats,
            optimizing Core Web Vitals, and creating high-converting visuals.
          </p>
        </div>

        <AdBanner type="top" />

        {/* Search & Filter Bar */}
        <div className="my-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tutorials, formats, SEO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Featured Post Card (Hero) */}
        {!searchQuery && selectedCategory === 'All' && (
          <div className="mb-12">
            <Link
              to={featuredPost.path}
              className="group block bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                <div className="lg:col-span-7 h-64 sm:h-80 lg:h-full relative overflow-hidden bg-slate-900">
                  <img
                    src={featuredPost.image}
                    alt={featuredPost.title}
                    width={1200}
                    height={630}
                    fetchPriority="high"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-600 text-white shadow-md">
                      <Sparkles className="w-3 h-3" /> Featured Guide
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                        {featuredPost.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {featuredPost.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {featuredPost.readTime}
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                      {featuredPost.title}
                    </h2>

                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed line-clamp-3">
                      {featuredPost.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-500">
                      By {featuredPost.author}
                    </span>
                    <span className="text-sm font-bold text-blue-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      Read Full Article <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* All Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post) => (
            <Link
              key={post.slug}
              to={post.path}
              className="group bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div className="h-48 overflow-hidden relative bg-slate-900">
                <img
                  src={post.image}
                  alt={post.title}
                  width={1200}
                  height={630}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                />
                <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-md text-slate-800 shadow-xs">
                  {post.category}
                </span>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {post.date}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {post.readTime}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">
                    {post.title}
                  </h3>

                  <p className="text-slate-500 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                    {post.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-400">{post.author}</span>
                  <span className="text-blue-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Read Guide <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>


        {managedPosts.length > 0 && (
          <section className="mt-12">
            <div className="mb-5"><h2 className="text-2xl font-extrabold text-slate-900">Latest articles</h2><p className="mt-1 text-sm text-slate-500">Recently published guides from the PicShrink editorial team.</p></div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {managedPosts.filter((item) => {
                const query = searchQuery.toLowerCase();
                return (!query || item.title.toLowerCase().includes(query) || item.excerpt.toLowerCase().includes(query)) &&
                  (selectedCategory === 'All' || selectedCategory === 'Managed');
              }).map((item) => (
                <Link key={item.id} to={'/blog/' + item.slug} className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs transition-all hover:shadow-xl">
                  {item.ogImageUrl && <img src={item.ogImageUrl} alt={item.title} loading="lazy" className="h-48 w-full object-cover"/>}
                  <div className="flex-1 p-6"><span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Latest article</span><h3 className="mt-2 text-lg font-bold leading-snug text-slate-900 group-hover:text-blue-600">{item.title}</h3><p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-500">{item.excerpt}</p><p className="mt-4 text-xs font-semibold text-blue-600">Read article <ArrowRight className="inline h-3.5 w-3.5"/></p></div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {filteredPosts.length === 0 && managedPosts.length === 0 && (
          <div className="py-16 text-center text-slate-500">
            <p className="text-lg font-semibold">No articles found matching "{searchQuery}"</p>
            <p className="text-sm mt-1">Try searching for compression, WebP, background, or PDF.</p>
          </div>
        )}

        <AdBanner type="bottom" />
      </div>
    </div>
  );
}
