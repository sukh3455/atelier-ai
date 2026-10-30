import React, { useState } from 'react';
import { 
  X, Mail, Lock, Sparkles, LogOut, CheckCircle2, 
  AlertCircle, ShieldCheck, Pin, ArrowRight, Loader2
} from 'lucide-react';
import { 
  signInWithEmail, 
  signUpWithEmail, 
  sendMagicLink, 
  signOutUser 
} from '../utils/supabase';

export default function AuthModal({ isOpen, onClose, user, onAuthSuccess, onSignOut }) {
  if (!isOpen) return null;

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'magiclink'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setStatusMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }

    setIsLoading(true);
    setStatusMessage({ type: '', text: '' });

    if (mode === 'magiclink') {
      const { error } = await sendMagicLink(email);
      setIsLoading(false);
      if (error) {
        setStatusMessage({ type: 'error', text: error });
      } else {
        setStatusMessage({ 
          type: 'success', 
          text: 'Magic link sent! Check your email inbox to log in with 1 click.' 
        });
      }
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setIsLoading(false);
        setStatusMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
        return;
      }
      const { data, error } = await signUpWithEmail(email, password);
      setIsLoading(false);
      if (error) {
        setStatusMessage({ type: 'error', text: error });
      } else {
        setStatusMessage({ 
          type: 'success', 
          text: 'Account created! Please check your email inbox to confirm your registration.' 
        });
        if (data?.session) {
          onAuthSuccess(data.session.user);
          setTimeout(() => onClose(), 1500);
        }
      }
      return;
    }

    // Default: Sign in
    if (!password) {
      setIsLoading(false);
      setStatusMessage({ type: 'error', text: 'Please enter your password' });
      return;
    }

    const { data, error } = await signInWithEmail(email, password);
    setIsLoading(false);
    if (error) {
      setStatusMessage({ type: 'error', text: error });
    } else if (data?.user) {
      setStatusMessage({ type: 'success', text: 'Signed in successfully! Syncing your chats...' });
      onAuthSuccess(data.user);
      setTimeout(() => onClose(), 1000);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOutUser();
    setIsLoading(false);
    onSignOut();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-[#12141e] border border-white/10 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {user ? 'Cloud Account' : 'Cloud Chat Sync'}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {user ? 'Multi-device sync connected' : 'Sync your chats across all devices'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* LOGGED IN VIEW */}
        {user ? (
          <div className="py-4 space-y-4">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Logged in as:</span>
                <span className="font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>
              <p className="text-sm font-medium text-white truncate font-mono">
                {user.email}
              </p>
            </div>

            {/* 90% Protection Status Chip */}
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-indigo-300 font-medium">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>90% Storage Auto-Clean Protected</span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Your database auto-prunes oldest casual chats if capacity reaches 90%. Pinned (📌) conversations are 100% immune and never deleted.
              </p>
            </div>

            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          /* NOT LOGGED IN - AUTH TABS & FORM */
          <div className="py-4 space-y-4">
            {/* Mode Switcher */}
            <div className="flex rounded-lg bg-black/40 p-1 border border-white/5 text-xs">
              <button
                type="button"
                onClick={() => { setMode('signin'); setStatusMessage({ type: '', text: '' }); }}
                className={`flex-1 py-1.5 rounded-md transition-colors font-medium ${
                  mode === 'signin' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setStatusMessage({ type: '', text: '' }); }}
                className={`flex-1 py-1.5 rounded-md transition-colors font-medium ${
                  mode === 'signup' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => { setMode('magiclink'); setStatusMessage({ type: '', text: '' }); }}
                className={`flex-1 py-1.5 rounded-md transition-colors font-medium ${
                  mode === 'magiclink' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Magic Link
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {mode !== 'magiclink' && (
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Status Message */}
              {statusMessage.text && (
                <div className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                  statusMessage.type === 'error' 
                    ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300' 
                    : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                }`}>
                  {statusMessage.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  )}
                  <span className="leading-snug">{statusMessage.text}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>
                      {mode === 'signin' ? 'Sign In & Sync' : mode === 'signup' ? 'Create Account' : 'Send 1-Click Magic Link'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Smart 90% Rule Explainer */}
            <div className="pt-2 border-t border-white/5 text-[11px] text-neutral-400 space-y-1">
              <div className="flex items-center gap-1 text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>100% Free Supabase Cloud</span>
              </div>
              <p className="text-[10.5px] text-neutral-500 leading-normal">
                Includes automated 90% auto-clean: your database safely self-maintains so storage never exceeds free limits. Pin (📌) any chat to keep it permanently.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
