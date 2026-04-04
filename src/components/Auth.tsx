import { useState } from 'react';
import { 
  auth, 
  signOut, 
  signInWithGoogle
} from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { LogIn, LogOut, User, Loader2 } from 'lucide-react';

export function Auth() {
  const [user, loading] = useAuthState(auth);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      // Error already logged in helper
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log('User signed out');
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
          <span>Sign Out</span>
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={handleLogin}
      disabled={isLoggingIn}
      className="flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {isLoggingIn ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <LogIn size={16} />
      )}
      <span>{isLoggingIn ? 'Signing In...' : 'Sign In with Google'}</span>
    </button>
  );
}
