import { Check, Zap, Star, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';

interface PricingProps {
  profile: UserProfile;
  onUpgrade: (tier: 'pro' | 'free' | 'one-time') => void;
  isUpgrading?: boolean;
  error?: string | null;
}

export function Pricing({ profile, onUpgrade, isUpgrading, error }: PricingProps) {
  const isBusiness = profile.role === 'recruiter' || profile.role === 'employer';
  const currentTier = profile.subscriptionTier || 'free';

  const businessPlans = [
    {
      name: 'Free',
      price: '€0',
      description: profile.role === 'employer' ? 'Perfect for small companies hiring.' : 'Perfect for exploring the talent pool.',
      features: [
        'Browse all Active profiles',
        '3 Connection Requests per month',
        'Post 1 Job Listing (Standard)',
        'Basic search filters'
      ],
      cta: currentTier === 'free' ? 'Current Plan' : 'Downgrade to Free',
      disabled: currentTier === 'free',
      tier: 'free',
      highlight: false
    },
    {
      name: 'Pro',
      price: '€49',
      period: '/mo',
      description: profile.role === 'employer' ? 'For companies with active hiring needs.' : 'For serious recruiters and headhunters.',
      features: [
        'Unlimited Connection Requests',
        'Unlimited Job Listings',
        'Featured Job Placements',
        'Access to Passive Talent',
        'Verified Business Badge',
        'Priority Support'
      ],
      cta: currentTier === 'pro' ? 'Change Plan' : 'Upgrade to Pro',
      disabled: false, // Allow Pro users to click "Change Plan" to manage subscription
      tier: 'pro',
      highlight: true
    }
  ];

  const payPerPost = {
    name: 'Pay-per-Post',
    price: '€19',
    period: '/listing',
    description: 'Competitive pricing for single job announcements.',
    features: [
      'Standard Job Listing',
      '30-day visibility',
      'Industry & Role categorization',
      'Basic applicant tracking'
    ],
    cta: 'Post One Job',
    disabled: false,
    tier: 'one-time',
    highlight: false
  };

  const professionalPlans = [
    {
      name: 'Free',
      price: '€0',
      description: 'Always free for professionals.',
      features: [
        'Create professional profile',
        'Appear in recruiter searches',
        'Secure messaging',
        'GDPR data control'
      ],
      cta: !profile.isFeatured ? 'Current Plan' : 'Cancel Boost',
      disabled: !profile.isFeatured,
      tier: 'free',
      highlight: false
    },
    {
      name: 'Featured',
      price: '€10',
      period: '/7 days',
      description: 'Get noticed by top headhunters.',
      features: [
        'Top of search results',
        'Featured profile badge',
        'Weekly visibility report',
        'Priority in Discovery feed'
      ],
      cta: profile.isFeatured ? 'Change Plan' : 'Boost Profile',
      disabled: false,
      tier: 'pro',
      highlight: true
    }
  ];

  const plans = isBusiness ? [...businessPlans, payPerPost] : professionalPlans;

  return (
    <div className="space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-slate-900">
          {isBusiness ? (profile.role === 'employer' ? 'Employer Plans' : 'Recruiter Plans') : 'Professional Boosts'}
        </h2>
        <p className="text-slate-500 max-w-2xl mx-auto">
          {isBusiness 
            ? 'Choose the plan that fits your hiring needs. TalentFabric offers the most affordable way to find top-tier talent.'
            : 'TalentFabric is always free for professionals. Use our optional boosts to get noticed faster by top headhunters.'}
        </p>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm flex flex-col gap-3"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} />
            <p className="font-medium">{error}</p>
          </div>
          {error.includes("Unauthorized") && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button 
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/test-lemon-connection');
                      const data = await res.json();
                      alert(data.status || data.details || data.error);
                    } catch (e) {
                      alert("Connection test failed. Check console.");
                    }
                  }}
                  className="text-xs bg-white border border-red-200 px-3 py-1 rounded-lg hover:bg-red-100 transition-colors w-fit"
                >
                  Test Connection
                </button>
                <button 
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/debug-config');
                      const data = await res.json();
                      alert(JSON.stringify(data, null, 2));
                    } catch (e) {
                      alert("Debug fetch failed.");
                    }
                  }}
                  className="text-xs bg-white border border-red-200 px-3 py-1 rounded-lg hover:bg-red-100 transition-colors w-fit"
                >
                  View Debug Info
                </button>
              </div>
              <p className="text-[10px] opacity-70">
                Note: If your key starts with 'eyJ', it's a JWT. Lemon Squeezy API keys usually start with 'ls_'.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {isBusiness && !profile.isFoundingMember && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto rounded-3xl bg-indigo-600 p-8 text-white shadow-xl shadow-indigo-100 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <Star size={14} />
              Limited Time Offer
            </div>
            <h3 className="text-2xl font-bold">Become a Founding Partner</h3>
            <p className="text-indigo-100 text-sm max-w-xl">
              The first 100 employers to join TalentFabric get **3 months of Pro features for free** and a permanent **Founding Partner badge** on their profile.
            </p>
          </div>
          <div className="relative z-10 text-center md:text-right">
            <div className="text-4xl font-black mb-1">FREE</div>
            <div className="text-xs text-indigo-200 uppercase tracking-widest">For the first 100</div>
          </div>
        </motion.div>
      )}

      {isBusiness && profile.isFoundingMember && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto rounded-3xl bg-indigo-50 p-8 text-indigo-900 border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="space-y-2">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="text-indigo-600" />
              You are a Founding Partner!
            </h3>
            <p className="text-indigo-600/70 text-sm max-w-xl">
              Thank you for being one of our first 100 employers. You have active Pro features and your exclusive badge is visible on all your job posts.
            </p>
          </div>
        </motion.div>
      )}

      <div className={`grid grid-cols-1 gap-8 max-w-6xl mx-auto ${isBusiness ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {plans.map((plan) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative rounded-3xl p-8 border ${
              plan.highlight 
                ? 'bg-white border-indigo-600 shadow-xl shadow-indigo-100 ring-1 ring-indigo-600' 
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                Recommended
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                {plan.period && <span className="text-slate-500 font-medium">{plan.period}</span>}
              </div>
              <p className="mt-4 text-sm text-slate-600">{plan.description}</p>
            </div>

            <ul className="space-y-4 mb-8">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-slate-600">
                  <div className="mt-1 h-5 w-5 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                    <Check size={12} />
                  </div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => !plan.disabled && onUpgrade(plan.tier as 'pro' | 'free' | 'one-time')}
              disabled={plan.disabled || isUpgrading}
              className={`w-full py-4 rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                plan.highlight
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isUpgrading && plan.tier !== 'free' ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Processing...
                </>
              ) : (
                plan.cta
              )}
            </button>
          </motion.div>
        ))}
      </div>

      {isBusiness && (
        <div className="max-w-4xl mx-auto rounded-3xl bg-slate-900 p-8 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2">
              <h4 className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="text-indigo-400" />
                Flat Success Fee
              </h4>
              <p className="text-slate-400 text-sm max-w-md">
                Forget 20% agency fees. We charge a flat <span className="text-white font-bold">€500 success fee</span> per hire made through TalentFabric.
              </p>
            </div>
            <div className="text-center md:text-right">
              <div className="text-3xl font-bold">€500</div>
              <div className="text-xs text-slate-500 uppercase tracking-widest">Per Hire</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
