import { useState } from 'react';
import { 
  db, 
  auth, 
  doc, 
  setDoc,
  Timestamp,
  handleFirestoreError,
  OperationType
} from '../firebase';
import { Shield, Check, ArrowRight, Briefcase, User, Building2 } from 'lucide-react';
import { motion } from 'motion/react';
import { UserRole } from '../types';

interface GDPRConsentProps {
  onComplete: () => void;
  initialProfile: any | null;
}

export function GDPRConsent({ onComplete, initialProfile }: GDPRConsentProps) {
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole>(initialProfile?.role || 'professional');

  const handleAccept = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, {
        gdprConsent: true,
        consentDate: Timestamp.now(),
        visibility: role === 'professional' ? 'passive' : 'active',
        role: role,
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName,
      }, { merge: true });
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl overflow-hidden relative"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600" />
        
        <div className="flex items-center gap-4 mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
            <Shield size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Privacy & Data Consent</h2>
            <p className="text-slate-500">GDPR Compliance Onboarding</p>
          </div>
        </div>

        <div className="space-y-6 mb-8">
          <p className="text-slate-600 leading-relaxed">
            To provide our networking services, TalentFabric needs your explicit consent to process your professional data. We are committed to protecting your privacy at <span className="text-indigo-600 font-bold">talentfabric.eu</span> according to EU GDPR standards.
          </p>
          
          <div className="space-y-4">
            <label className="text-sm font-bold text-slate-900 block">Select your primary role:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => setRole('professional')}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                  role === 'professional' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                    : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                }`}
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${role === 'professional' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  <User size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-xs">Talent</p>
                  <p className="text-[9px] opacity-70">I want to be discovered</p>
                </div>
              </button>
              <button
                onClick={() => setRole('recruiter')}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                  role === 'recruiter' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                    : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                }`}
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${role === 'recruiter' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  <Briefcase size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-xs">Recruiter</p>
                  <p className="text-[9px] opacity-70">I am a headhunter/HR</p>
                </div>
              </button>
              <button
                onClick={() => setRole('employer')}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                  role === 'employer' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                    : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                }`}
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${role === 'employer' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  <Building2 size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-xs">Employer</p>
                  <p className="text-[9px] opacity-70">I am hiring for my company</p>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "We store your professional profile and skills.",
              "We process networking requests you send/receive.",
              "We allow recruiters to find you based on your visibility settings.",
              "You have the right to export or delete your data at any time."
            ].map((item, i) => (
              <div key={i} className="flex gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="mt-1 h-5 w-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                  <Check size={12} />
                </div>
                <span className="text-sm text-slate-700 font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'I Accept & Continue'}
            <ArrowRight size={20} />
          </button>
          <button 
            onClick={() => auth.signOut()}
            className="px-8 py-4 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-all"
          >
            Decline
          </button>
        </div>
        
        <p className="mt-6 text-center text-xs text-slate-400">
          By clicking accept, you agree to our Privacy Policy and Data Processing Agreement.
        </p>
      </motion.div>
    </div>
  );
}
