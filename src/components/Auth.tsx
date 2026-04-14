import React, { useState } from 'react';
import { 
  auth, 
  signOut, 
  signInWithGoogle,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  createProfile
} from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { LogIn, LogOut, User, Loader2, Mail, Lock, X, Briefcase, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Auth() {
  const [user, loading] = useAuthState(auth);
  const [showModal, setShowModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'professional' | 'recruiter'>('professional');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleGoogleLogin = async () => {
    setIsProcessing(true);
    setError('');
    try {
      await signInWithGoogle();
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
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!displayName) throw new Error('Display name is required');
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });
        await createProfile(result.user, role);
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError('');
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  if (loading) return <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />;

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <User size={16} className="text-slate-500" />
          )}
          <span className="text-sm font-medium text-slate-700">{user.displayName || 'User'}</span>
        </div>
        <button 
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 transition-all active:scale-95"
      >
        <LogIn size={16} />
        <span>Sign In</span>
      </button>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900">
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-slate-500 mt-1">
                  {isLogin ? 'Sign in to your TalentFabric account' : 'Join the professional network'}
                </p>
              </div>

              {!isLogin && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => setRole('professional')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                      role === 'professional' 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <UserCircle size={24} />
                    <span className="text-xs font-bold">Professional</span>
                  </button>
                  <button
                    onClick={() => setRole('recruiter')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                      role === 'recruiter' 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <Briefcase size={24} />
                    <span className="text-xs font-bold">Recruiter</span>
                  </button>
                </div>
              )}

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
                onClick={handleGoogleLogin}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="h-5 w-5" />
                Google
              </button>

              <p className="mt-8 text-center text-sm text-slate-500">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                <button 
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  {isLogin ? 'Sign Up' : 'Log In'}
                </button>
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
