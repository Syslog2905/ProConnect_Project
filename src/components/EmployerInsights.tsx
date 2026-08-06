import { useState, useEffect } from 'react';
import { Search, Loader2, Star, ThumbsUp, ThumbsDown, ExternalLink, Info, Building2, RefreshCw, Calendar, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { db, doc, getDoc, setDoc, serverTimestamp, Timestamp } from '../firebase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface InsightResult {
  summary: string;
  sources: { uri: string; title: string }[];
  lastUpdated?: Timestamp;
  isFromCache?: boolean;
}

export function EmployerInsights() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsightResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("EmployerInsights mounted. API Key present:", !!process.env.GEMINI_API_KEY);
  }, []);

  const fetchInsights = async (forceRefresh = false) => {
    const trimmedQuery = query.trim();
    console.log("fetchInsights called. Query:", trimmedQuery, "Force Refresh:", forceRefresh);
    
    if (!trimmedQuery) {
      console.log("Empty query, returning.");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Clear previous results if it's a new search (not a force refresh)
      if (!forceRefresh) {
        console.log("Clearing previous result for new search.");
        setResult(null);
      }

      const normalizedQuery = trimmedQuery.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 100);
      console.log("Normalized Query for Firestore:", normalizedQuery);
      
      if (!normalizedQuery) {
        throw new Error("Invalid company name. Please use letters and numbers.");
      }

      const insightRef = doc(db, 'employer_insights', normalizedQuery);

      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        console.log("Checking Firestore cache for:", normalizedQuery);
        try {
          const cacheSnap = await getDoc(insightRef);
          if (cacheSnap.exists()) {
            console.log("Cache hit! Data:", cacheSnap.data());
            const data = cacheSnap.data();
            const lastUpdated = data.lastUpdated instanceof Timestamp ? data.lastUpdated : null;
            
            setResult({
              summary: data.summary,
              sources: data.sources || [],
              lastUpdated: lastUpdated || undefined,
              isFromCache: true
            });
            setLoading(false);
            return;
          }
          console.log("Cache miss.");
        } catch (cacheErr) {
          console.error("Error checking cache (continuing to API):", cacheErr);
        }
      }

      console.log("Preparing Gemini API call...");
      const apiKey = process.env.GEMINI_API_KEY;
      console.log("API Key present in fetchInsights:", !!apiKey);
      
      if (!apiKey) {
        throw new Error("Gemini API key is missing. Please ensure it is set in your environment secrets.");
      }

      console.log("Calling ai.models.generateContent...");
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Provide a detailed summary of employee reviews, ratings, and company culture for the company "${trimmedQuery}". 
        Search for information worldwide, including sites like Glassdoor, Indeed, and local review platforms. 
        Include common pros and cons mentioned by employees. 
        
        CRITICAL FORMATTING RULES:
        1. Use Markdown headings, bullet points, and bold text.
        2. If you include a table for ratings, ensure it follows STRICT Markdown table syntax:
           | Category | Estimated Rating |
           | :--- | :--- |
           | Example | ⭐⭐⭐ (3.5/5) |
           Each row MUST be on a new line. Do NOT put the entire table on one line.
        3. Make the summary professional and objective.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      console.log("Gemini API response received. Text length:", response.text?.length);
      const summary = response.text || "No insights found for this company.";
      
      // Safer source extraction
      let sources: { uri: string; title: string }[] = [];
      try {
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        console.log("Grounding Metadata present:", !!groundingMetadata);
        const chunks = groundingMetadata?.groundingChunks;
        if (Array.isArray(chunks)) {
          console.log("Found grounding chunks:", chunks.length);
          sources = chunks
            .filter((c: any) => c?.web?.uri)
            .map((c: any) => ({
              uri: c.web.uri,
              title: c.web.title || "Source",
            }));
        }
      } catch (sourceErr) {
        console.warn("Error parsing sources:", sourceErr);
      }

      const newResult = { summary, sources };
      
      // Save to cache
      console.log("Attempting to save to Firestore cache...");
      try {
        await setDoc(insightRef, {
          ...newResult,
          query: trimmedQuery,
          lastUpdated: serverTimestamp()
        });
        console.log("Saved to cache successfully.");
      } catch (saveErr) {
        console.error("Error saving to cache (non-fatal):", saveErr);
      }

      setResult({
        ...newResult,
        lastUpdated: Timestamp.now(),
        isFromCache: false
      });
      console.log("State updated with new result.");
    } catch (err: any) {
      console.error("Error in fetchInsights catch block:", err);
      setError(err.message || "Failed to fetch employer insights. Please try again later.");
    } finally {
      console.log("fetchInsights finished. Setting loading to false.");
      setLoading(false);
    }
  };

  const formatDate = (timestamp?: any) => {
    if (!timestamp) return 'Never';
    try {
      // Handle both Firestore Timestamp and JS Date
      if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleString();
      }
      if (timestamp instanceof Date) {
        return timestamp.toLocaleString();
      }
      return 'Recently';
    } catch (e) {
      return 'Recently';
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

      <form 
        onSubmit={(e) => {
          console.log("Form submitted!");
          e.preventDefault();
          fetchInsights(false);
        }}
        className="relative"
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              value={query}
              onChange={(e) => {
                console.log("Input changed:", e.target.value);
                setQuery(e.target.value);
              }}
              placeholder="Enter company name (e.g. Google, SiteGround, SAP)..." 
              className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              autoComplete="off"
            />
          </div>
          <button 
            type="submit"
            onClick={() => console.log("Button clicked!")}
            disabled={loading || !query.trim()}
            className="rounded-2xl bg-indigo-600 px-8 py-4 font-bold text-white hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 flex items-center gap-2"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Analyze'}
          </button>
        </div>
      </form>

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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Analysis for {query}</h3>
                      {result.isFromCache && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full mt-1">
                          <Zap size={10} className="fill-indigo-500" />
                          Cached Result
                        </span>
                      )}
                    </div>
                  </div>
                
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                        {result.isFromCache ? 'Cached on' : 'Generated on'}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <Calendar size={12} className="text-slate-400" />
                        {formatDate(result.lastUpdated)}
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => fetchInsights(true)}
                        disabled={loading}
                        className="p-2.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all disabled:opacity-50 shadow-sm"
                        title="Force refresh insights"
                      >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                      </button>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Update</span>
                    </div>
                  </div>
              </div>

              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed shadow-none table-auto w-full">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.summary}</ReactMarkdown>
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
              Enter the name of a company to see what its employees are saying about the work environment, management, and benefits.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
