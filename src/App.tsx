import { useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Search, 
  Briefcase, 
  ArrowRight, 
  Mail, 
  UserPlus, 
  Lock,
  Database,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [isFirebaseSetupPending] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
              <Users size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">ProConnect</span>
          </div>
          <div className="hidden md:flex md:items-center md:gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Features</a>
            <a href="#gdpr" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">GDPR Compliance</a>
            <button className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 transition-all active:scale-95">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 mb-6">
                <ShieldCheck size={16} />
                <span>GDPR Compliant by Design</span>
              </div>
              <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
                Connect with Top <span className="text-indigo-600">HR & Headhunters</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-600 max-w-xl">
                ProConnect is the secure bridge between industry experts and recruitment professionals. 
                Showcase your expertise while maintaining full control over your personal data.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <button className="flex items-center gap-2 rounded-xl bg-slate-900 px-8 py-4 text-base font-semibold text-white shadow-xl hover:bg-slate-800 transition-all active:scale-95">
                  Create Profile <ArrowRight size={20} />
                </button>
                <button className="rounded-xl border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95">
                  For Recruiters
                </button>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-[4/3] rounded-3xl bg-indigo-100/50 p-8 ring-1 ring-slate-200/50 backdrop-blur-sm">
                <div className="h-full w-full rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100">
                  {/* Mock Dashboard UI */}
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="h-4 w-32 bg-slate-200 rounded-full animate-pulse" />
                    <div className="flex gap-2">
                      <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
                      <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="flex gap-4 items-center">
                      <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <UserPlus size={32} />
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 w-48 bg-slate-200 rounded-full animate-pulse" />
                        <div className="h-3 w-32 bg-slate-100 rounded-full animate-pulse" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-24 rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2">
                        <div className="h-3 w-12 bg-indigo-200 rounded-full" />
                        <div className="h-4 w-20 bg-slate-200 rounded-full" />
                      </div>
                      <div className="h-24 rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2">
                        <div className="h-3 w-12 bg-green-200 rounded-full" />
                        <div className="h-4 w-20 bg-slate-200 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Firebase Setup Status Banner */}
      {isFirebaseSetupPending && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-20">
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Database size={24} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-bold text-amber-900">Database Setup Required</h3>
              <p className="text-amber-700 mt-1">
                I'm ready to build the backend! Please accept the **Firebase Terms of Service** in the setup window to enable authentication and data storage.
              </p>
            </div>
            <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm">
              <AlertCircle size={18} />
              <span>Awaiting Confirmation</span>
            </div>
          </div>
        </div>
      )}

      {/* Features Grid */}
      <section id="features" className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-base font-semibold leading-7 text-indigo-600 uppercase tracking-wider">Everything you need</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Built for Professionals, Trusted by Recruiters
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-900">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
                    <Search size={20} />
                  </div>
                  Smart Discovery
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                  <p className="flex-auto">Recruiters can find you based on verified skills and experience without exposing your private contact info prematurely.</p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-900">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
                    <Mail size={20} />
                  </div>
                  Secure Messaging
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                  <p className="flex-auto">Communicate with headhunters through our encrypted platform. You decide when to share your personal email or phone number.</p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-900">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
                    <Lock size={20} />
                  </div>
                  Privacy First
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                  <p className="flex-auto">Full control over your visibility. Switch between "Active", "Passive", and "Hidden" modes with a single click.</p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* GDPR Section */}
      <section id="gdpr" className="py-24 sm:py-32 bg-slate-900 text-white overflow-hidden relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">Legal & GDPR Compliance</h2>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                We take data protection seriously. ProConnect is built from the ground up to comply with European data regulations, ensuring your rights are always protected.
              </p>
              <ul className="space-y-4">
                {[
                  "Right to be Forgotten: One-click account and data deletion.",
                  "Data Portability: Export your entire profile and history in JSON format.",
                  "Explicit Consent: Granular control over who sees your data.",
                  "Data Minimization: We only collect what's strictly necessary."
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                      <ShieldCheck size={14} />
                    </div>
                    <span className="text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-indigo-500/10 blur-3xl rounded-full" />
              <div className="relative bg-slate-800/50 border border-slate-700 p-8 rounded-3xl backdrop-blur-xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center">
                    <Briefcase size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold">Data Processing Agreement</h4>
                    <p className="text-xs text-slate-500">Version 1.2 • Updated April 2026</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-2 w-full bg-slate-700 rounded-full" />
                  <div className="h-2 w-5/6 bg-slate-700 rounded-full" />
                  <div className="h-2 w-4/6 bg-slate-700 rounded-full" />
                  <div className="h-2 w-full bg-slate-700 rounded-full mt-6" />
                  <div className="h-2 w-3/4 bg-slate-700 rounded-full" />
                </div>
                <button className="mt-8 w-full py-3 rounded-xl bg-indigo-600 font-semibold hover:bg-indigo-500 transition-colors">
                  Review Privacy Policy
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Users size={18} />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">ProConnect</span>
          </div>
          <p className="text-slate-500 text-sm">
            © 2026 ProConnect. All rights reserved. Built with privacy in mind.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-slate-400 hover:text-slate-600 transition-colors">Terms</a>
            <a href="#" className="text-slate-400 hover:text-slate-600 transition-colors">Privacy</a>
            <a href="#" className="text-slate-400 hover:text-slate-600 transition-colors">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
