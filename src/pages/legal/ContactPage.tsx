import { useState } from 'react';
import { Mail, Send, CheckCircle2, MessageSquare, Clock, HelpCircle } from 'lucide-react';
import { SEOHead } from '../../components/common/SEOHead';
import { PAGE_META } from '../../data/pagesMeta';
import { AdBanner } from '../../components/common/AdBanner';
import { Link } from 'react-router-dom';

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Feedback');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({});

  const validate = () => {
    const newErrors: { name?: string; email?: string; message?: string } = {};
    if (!name.trim()) newErrors.name = 'Please provide your full name.';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email))
      newErrors.email = 'Please provide a valid email address.';
    if (!message.trim() || message.trim().length < 10)
      newErrors.message = 'Please provide a message with at least 10 characters.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setIsSubmitted(true);
      setName('');
      setEmail('');
      setMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <SEOHead {...PAGE_META['/contact']} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 mb-3">
            <Mail className="w-3.5 h-3.5" /> Fast Support
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Contact PicShrink
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Have a question, feature idea, or feedback about our image tools? We’d love to hear
            from you! Fill out the form below.
          </p>
        </div>

        <AdBanner type="top" />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start my-8">
          {/* Left: Contact Form */}
          <div className="md:col-span-7 bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm">
            {isSubmitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Message Received!</h3>
                <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Thank you for contacting PicShrink. Our engineering and support team reviews all
                  submissions and will respond if necessary.
                </p>
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Your Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-rose-300 bg-rose-50/50' : 'border-slate-300'
                    }`}
                  />
                  {errors.name && (
                    <span className="text-[11px] text-rose-500 mt-1 block">{errors.name}</span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="jane@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-rose-300 bg-rose-50/50' : 'border-slate-300'
                    }`}
                  />
                  {errors.email && (
                    <span className="text-[11px] text-rose-500 mt-1 block">{errors.email}</span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Topic</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  >
                    <option value="Feedback">General Feedback</option>
                    <option value="Bug">Report a Bug / Tool Issue</option>
                    <option value="Feature">Suggest New Tool / Feature</option>
                    <option value="Partnership">Advertising &amp; Sponsorship</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Message <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Tell us what you love or how we can improve PicShrink..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.message ? 'border-rose-300 bg-rose-50/50' : 'border-slate-300'
                    }`}
                  />
                  {errors.message && (
                    <span className="text-[11px] text-rose-500 mt-1 block">
                      {errors.message}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Message</span>
                </button>
              </form>
            )}
          </div>

          {/* Right: Info Cards */}
          <div className="md:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Response Time</h4>
                  <p className="text-xs text-slate-500">Usually responds within 24 to 48 hours</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Direct Email</h4>
                  <p className="text-xs font-mono text-blue-600">contact@picshrink.com</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Instant Answers</h4>
                  <p className="text-xs text-slate-500">
                    Check our{' '}
                    <Link to="/about" className="text-blue-600 underline">
                      About page
                    </Link>{' '}
                    or tool FAQs.
                  </p>
                </div>
              </div>
            </div>

            <AdBanner type="sidebar" />
          </div>
        </div>

        <AdBanner type="bottom" />
      </div>
    </div>
  );
}
