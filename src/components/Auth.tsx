import React, { useState, useEffect } from 'react';
import { 
  auth, 
  signOut, 
  signInWithGoogle,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  createProfile,
  sendEmailVerification
} from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { LogIn, LogOut, User, Loader2, Mail, Lock, X, Briefcase, UserCircle, Building2, UserPlus, ArrowLeft } from 'lucide-react';
import { UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface AuthProps {
  defaultRole?: UserRole;
  buttonText?: string;
  className?: string;
}

export function Auth({ defaultRole, buttonText, className }: AuthProps) {
  const [user, loading] = useAuthState(auth);
  const [showModal, setShowModal] = useState(false);
  const [authStep, setAuthStep] = useState<'selection' | 'form'>('selection');
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>(defaultRole || (localStorage.getItem('tf_last_role') as UserRole) || 'professional');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUser, setLastUser] = useState<string | null>(localStorage.getItem('tf_last_name'));
  const [verificationSent, setVerificationSent] = useState(false);
  const [showVerificationInfo, setShowVerificationInfo] = useState(false);

  useEffect(() => {
    if (defaultRole) setRole(defaultRole);
  }, [defaultRole]);

  useEffect(() => {
    if (user) {
      if (user.displayName) {
        localStorage.setItem('tf_last_name', user.displayName);
        setLastUser(user.displayName);
      }
    }
  }, [user]);

  const handleGoogleLogin = async (targetRole?: UserRole) => {
    setIsProcessing(true);
    setError('');
    const authRole = targetRole || role;
    try {
      await signInWithGoogle(authRole, referralCode);
      localStorage.setItem('tf_last_role', authRole);
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || 'Google sign in failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await createProfile(userCredential.user, role, referralCode);
      } else {
        if (!displayName) throw new Error('Display name is required');
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });
        await createProfile(result.user, role, referralCode, displayName);
        // Automatically send verification email on new account
        try {
          await sendEmailVerification(result.user);
          setVerificationSent(true);
        } catch (vErr) {
          console.error('Initial verification email failed:', vErr);
        }
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password login is not enabled in the Firebase Console. Please enable it in Authentication > Sign-in method, or use Google Login instead.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setReferralCode('');
    setError('');
    setAuthStep('selection');
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  const handleResendVerification = async () => {
    if (!auth.currentUser) return;
    setIsProcessing(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setVerificationSent(true);
      setTimeout(() => setVerificationSent(false), 5000); // Reset status after 5s
    } catch (err: any) {
      setError(err.message || 'Failed to send verification email');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />;

  if (user) {
    return (
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 shrink-0">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="h-6 w-6 rounded-full shrink-0" referrerPolicy="no-referrer" />
              ) : (
                <User size={16} className="text-slate-500 shrink-0" />
              )}
              <span className="text-sm font-medium text-slate-700">{user.displayName || 'User'}</span>
            </div>
            {!user.emailVerified && user.providerData.some(p => p.providerId === 'password') && (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                  <Mail size={10} />
                  Email unverified
                </span>
                <button 
                  onClick={handleResendVerification}
                  disabled={isProcessing || verificationSent}
                  className="text-[10px] font-bold text-indigo-600 hover:underline disabled:text-slate-400"
                >
                  {verificationSent ? 'Sent!' : 'Resend Email'}
                </button>
              </div>
            )}
          </div>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button 
        onClick={() => {
          if (isProcessing) return;
          // If this is a role-specific button (landing page), open the modal for that role
          if (defaultRole) {
            setRole(defaultRole);
            setAuthStep('form');
            setShowModal(true);
            return;
          }

          // If this is the generic sign-in (header)
          if (lastUser) {
            // Direct login as requested for known users
            handleGoogleLogin();
          } else {
            // New user or unknown, show selection modal
            setAuthStep('selection');
            setShowModal(true);
          }
        }}
        title={!defaultRole && lastUser ? `Log in as ${lastUser}` : 'Sign in to TalentFabric'}
        className={className || "flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"}
        disabled={isProcessing}
      >
        {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
        <span>{isProcessing ? 'Connecting...' : (buttonText || 'Sign In')}</span>
      </button>
      
      {!defaultRole && lastUser && !isProcessing && (
        <button 
          onClick={() => {
            setAuthStep('selection');
            setShowModal(true);
          }}
          className="text-[10px] text-slate-400 hover:text-indigo-600 hover:underline transition-colors pr-2"
        >
          Switch account or role
        </button>
      )}

      {/* Auth Modal: Now only shown when needed (new users or role-specific clicks) */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-start sm:justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md my-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl relative max-h-[90vh] flex flex-col"
            >
              <button 
                onClick={() => {
                  setShowModal(false);
                  setAuthStep('selection');
                }}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors z-10"
              >
                <X size={20} />
              </button>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1">
                {authStep === 'selection' ? (
                <div className="py-4">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">How will you use TalentFabric?</h2>
                    <p className="text-slate-500 mt-1">Select your role to get started</p>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setRole('professional');
                        setAuthStep('form');
                      }}
                      className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 bg-slate-50 hover:border-indigo-600 hover:bg-indigo-50 group transition-all text-left"
                    >
                      <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors">
                        <UserCircle size={28} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 group-hover:text-indigo-700">Talent</h3>
                        <p className="text-xs text-slate-500">Find opportunities and grow your network</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setRole('recruiter');
                        setAuthStep('form');
                      }}
                      className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 bg-slate-50 hover:border-indigo-600 hover:bg-indigo-50 group transition-all text-left"
                    >
                      <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors">
                        <Briefcase size={28} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 group-hover:text-indigo-700">Recruiter</h3>
                        <p className="text-xs text-slate-500">Find top talent for your clients</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setRole('employer');
                        setAuthStep('form');
                      }}
                      className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 bg-slate-50 hover:border-indigo-600 hover:bg-indigo-50 group transition-all text-left"
                    >
                      <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors">
                        <Building2 size={28} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 group-hover:text-indigo-700">Employer</h3>
                        <p className="text-xs text-slate-500">Post jobs and build your company brand</p>
                      </div>
                    </button>
                  </div>

                  <p className="mt-8 text-center text-sm text-slate-500">
                    Already have an account?{' '}
                    <button 
                      onClick={() => {
                        setIsLogin(true);
                        setAuthStep('form');
                      }}
                      className="text-indigo-600 font-bold hover:underline"
                    >
                      Log In
                    </button>
                  </p>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => setAuthStep('selection')}
                    className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <ArrowLeft size={20} />
                  </button>

                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">
                      {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-slate-500 mt-1">
                      {isLogin ? 'Sign in to your account' : `Joining as ${role}`}
                    </p>
                  </div>

                  <form onSubmit={handleEmailAuth} className="space-y-4">
                    {!isLogin && (
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text"
                          required
                          placeholder="Full Name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                    )}
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="email"
                        required
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="password"
                        required
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>

                    {!isLogin && (
                      <div className="relative">
                        <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text"
                          placeholder="Referral Code (Optional)"
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                    )}

                    {error && (
                      <p className="text-xs text-red-500 font-medium px-2">{error}</p>
                    )}

                    <button 
                      type="submit"
                      disabled={isProcessing}
                      className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isProcessing ? <Loader2 size={20} className="animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                  </form>

                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-100"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-4 text-slate-400 font-medium">Or continue with</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleGoogleLogin()}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="h-5 w-5" />
                    Google
                  </button>

                  <p className="mt-8 text-center text-sm text-slate-500">
                    {isLogin ? "Don't have an account?" : "Changed your mind?"}{' '}
                    <button 
                      onClick={() => {
                        if (isLogin) {
                          setIsLogin(false);
                          setAuthStep('selection');
                        } else {
                          setAuthStep('selection');
                        }
                        setError('');
                      }}
                      className="text-indigo-600 font-bold hover:underline"
                    >
                      {isLogin ? 'Sign Up' : 'Go Back'}
                    </button>
                  </p>
                </>
              )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
