import { useState } from 'react';
import { Search, Loader2, Star, ThumbsUp, ThumbsDown, ExternalLink, Info, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface InsightResult {
  summary: string;
  sources: { uri: string; title: string }[];
}

export function EmployerInsights() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsightResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Provide a detailed summary of employee reviews, ratings, and company culture for the company "${query}". 
        Search for information worldwide, including sites like Glassdoor, Indeed, and local review platforms (e.g., bgrabotodatel.com if it's a Bulgarian company). 
        Include common pros and cons mentioned by employees. 
        Format the response in a professional, easy-to-read summary.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const summary = response.text || "No insights found for this company.";
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources = chunks
        ? chunks
            .filter((c: any) => c.web)
            .map((c: any) => ({
              uri: c.web.uri,
              title: c.web.title,
            }))
        : [];

      setResult({ summary, sources });
    } catch (err) {
      console.error("Error fetching insights:", err);
      setError("Failed to fetch employer insights. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-slate-900">Employer Insights</h2>
        <p className="text-sm text-slate-500">
          Get real-time summaries of employee reviews and company culture for employers worldwide.
        </p>
      </div>

      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchInsights()}
              placeholder="Enter company name (e.g. Google, SiteGround, SAP)..." 
              className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>
          <button 
            onClick={fetchInsights}
            disabled={loading || !query.trim()}
            className="rounded-2xl bg-indigo-600 px-8 py-4 font-bold text-white hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 flex items-center gap-2"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Analyze'}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-4"
          >
            <div className="mx-auto h-16 w-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Loader2 size={32} className="animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Analyzing Employer Data...</h3>
              <p className="text-slate-500">Searching global review sites and local platforms.</p>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-red-50 border border-red-100 p-6 text-red-700 flex items-center gap-3"
          >
            <Info size={20} />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Building2 size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Analysis for {query}</h3>
              </div>

              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap">
                {result.summary}
              </div>

              {result.sources.length > 0 && (
                <div className="mt-8 pt-8 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <ExternalLink size={16} className="text-indigo-600" />
                    Verified Sources
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {result.sources.map((source, i) => (
                      <a 
                        key={i}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                      >
                        {source.title || "Source"}
                        <ExternalLink size={12} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-indigo-50 p-6 border border-indigo-100">
                <Star className="text-indigo-600 mb-3" size={24} />
                <h4 className="font-bold text-slate-900 mb-1">Sentiment</h4>
                <p className="text-xs text-slate-600">Overall employee satisfaction based on recent feedback.</p>
              </div>
              <div className="rounded-2xl bg-green-50 p-6 border border-green-100">
                <ThumbsUp className="text-green-600 mb-3" size={24} />
                <h4 className="font-bold text-slate-900 mb-1">Key Pros</h4>
                <p className="text-xs text-slate-600">Commonly praised benefits and cultural aspects.</p>
              </div>
              <div className="rounded-2xl bg-red-50 p-6 border border-red-100">
                <ThumbsDown className="text-red-600 mb-3" size={24} />
                <h4 className="font-bold text-slate-900 mb-1">Key Cons</h4>
                <p className="text-xs text-slate-600">Frequent complaints or areas for improvement.</p>
              </div>
            </div>
          </motion.div>
        )}

        {!loading && !result && !error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center"
          >
            <div className="mx-auto h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-6">
              <Building2 size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Search for a Company</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Enter the name of a Bulgarian company to see what its employees are saying about the work environment, management, and benefits.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
