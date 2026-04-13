import { Check, Zap, Star, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';

interface PricingProps {
  profile: UserProfile;
  onUpgrade: (tier: 'pro' | 'free') => void;
}

export function Pricing({ profile, onUpgrade }: PricingProps) {
  const isRecruiter = profile.role === 'recruiter';

  const recruiterPlans = [
    {
      name: 'Free',
      price: '$0',
      description: 'Perfect for exploring the talent pool.',
      features: [
        'Browse all Active profiles',
        '3 Connection Requests per month',
        'Post 1 Job Listing (Standard)',
        'Basic search filters'
      ],
      cta: profile.subscriptionTier === 'free' ? 'Current Plan' : 'Downgrade to Free',
      disabled: profile.subscriptionTier === 'free',
      tier: 'free'
    },
    {
      name: 'Pro',
      price: '$49',
      period: '/mo',
      description: 'For serious recruiters and headhunters.',
      features: [
        'Unlimited Connection Requests',
        'Unlimited Job Listings',
        'Featured Job Placements',
        'Access to Passive Talent',
        'Verified Employer Badge'
      ],
      cta: profile.subscriptionTier === 'pro' ? 'Current Plan' : 'Upgrade to Pro',
      disabled: profile.subscriptionTier === 'pro',
      tier: 'pro',
      highlight: true
    }
  ];

  const professionalPlans = [
    {
      name: 'Free',
      price: '$0',
      description: 'Always free for professionals.',
      features: [
        'Create professional profile',
        'Appear in recruiter searches',
        'Secure messaging',
        'GDPR data control'
      ],
      cta: !profile.isFeatured ? 'Current Plan' : 'Cancel Boost',
      disabled: !profile.isFeatured,
      tier: 'free'
    },
    {
      name: 'Featured',
      price: '$10',
      period: '/7 days',
      description: 'Get noticed by top headhunters.',
      features: [
        'Top of search results',
        'Featured profile badge',
        'Weekly visibility report',
        'Priority in Discovery feed'
      ],
      cta: profile.isFeatured ? 'Currently Featured' : 'Boost Profile',
      disabled: profile.isFeatured,
      tier: 'pro',
      highlight: true
    }
  ];

  const plans = isRecruiter ? recruiterPlans : professionalPlans;

  return (
    <div className="space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-slate-900">
          {isRecruiter ? 'Recruiter Plans' : 'Professional Boosts'}
        </h2>
        <p className="text-slate-500 max-w-2xl mx-auto">
          {isRecruiter 
            ? 'Choose the plan that fits your hiring needs. TalentFabric offers the most affordable way to find top-tier talent.'
            : 'TalentFabric is always free for professionals. Use our optional boosts to get noticed faster by top headhunters.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
              onClick={() => !plan.disabled && onUpgrade(plan.tier as 'pro' | 'free')}
              disabled={plan.disabled}
              className={`w-full py-4 rounded-2xl font-bold transition-all active:scale-95 ${
                plan.highlight
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {plan.cta}
            </button>
          </motion.div>
        ))}
      </div>

      {isRecruiter && (
        <div className="max-w-4xl mx-auto rounded-3xl bg-slate-900 p-8 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2">
              <h4 className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="text-indigo-400" />
                Flat Success Fee
              </h4>
              <p className="text-slate-400 text-sm max-w-md">
                Forget 20% agency fees. We charge a flat <span className="text-white font-bold">$500 success fee</span> per hire made through TalentFabric.
              </p>
            </div>
            <div className="text-center md:text-right">
              <div className="text-3xl font-bold">$500</div>
              <div className="text-xs text-slate-500 uppercase tracking-widest">Per Hire</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
