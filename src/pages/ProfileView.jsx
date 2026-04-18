import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, signOut, deleteUser } from '../services/firebase';
import { User, Mail, Trash2, LogOut, ArrowLeft, Shield, AlertTriangle } from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const ProfileView = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  /**
   * Delete flow:
   * 1. Delete user row from MySQL (cascades all trips, expenses, etc.)
   * 2. Delete the Firebase Auth account
   * 3. Sign out + redirect to /login
   */
  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') return;
    setIsDeleting(true);
    setError('');
    try {
      // Step 1: Remove from DB (cascades trips, expenses, etc.)
      await api.delete(`/users/${user.uid}`);

      // Step 2: Remove Firebase Auth account
      await deleteUser(user);

      // Step 3: Redirect
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Delete account failed:', err);
      if (err.code === 'auth/requires-recent-login') {
        setError('For security, please sign out and sign in again before deleting your account.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      setIsDeleting(false);
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-2xl mx-auto px-6 py-16">

        {/* Page header */}
        <div className="mb-12">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-muted text-xs font-sans uppercase tracking-widest hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Dashboard
          </button>
          <h1 className="text-4xl font-serif font-bold text-primary mb-2">My Account</h1>
          <div className="w-16 h-px bg-primary/20 mt-4" />
        </div>

        {/* ── Identity Card ─────────────────────────────────────────── */}
        <section className="bg-white border border-primary/10 p-8 mb-6 shadow-[5px_5px_20px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-4 mb-8">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full object-cover border border-primary/10"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                <User className="w-7 h-7 text-primary/40" />
              </div>
            )}
            <div>
              <p className="font-serif text-2xl text-primary">
                {user.displayName || 'Voyager'}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-muted font-sans mt-1">
                Member
              </p>
            </div>
          </div>

          {/* Email field — read-only display */}
          <div>
            <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted font-sans mb-3">
              <Mail className="w-3 h-3" /> Email Address
            </label>
            <div className="flex items-center gap-3 border border-primary/10 px-4 py-3 bg-background/50">
              <Mail className="w-4 h-4 text-muted/50" strokeWidth={1.5} />
              <span className="font-sans text-sm text-primary">{user.email}</span>
              <span className="ml-auto text-[9px] uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-1">
                {user.emailVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>
            <p className="text-[10px] text-muted/60 mt-2 font-sans">
              Email is managed by your authentication provider and cannot be changed here.
            </p>
          </div>
        </section>

        {/* ── Security ──────────────────────────────────────────────── */}
        <section className="bg-white border border-primary/10 p-8 mb-6 shadow-[5px_5px_20px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-4 h-4 text-primary" />
            <h2 className="text-[10px] uppercase tracking-widest text-primary font-sans">Session</h2>
          </div>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 border border-primary/20 text-primary px-6 py-3 text-xs uppercase tracking-widest font-sans hover:bg-primary hover:text-white transition-all duration-300"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </section>

        {/* ── Danger Zone ───────────────────────────────────────────── */}
        <section className="border border-red-200 p-8 bg-red-50/30 shadow-[5px_5px_20px_rgba(239,68,68,0.03)]">
          <div className="flex items-center gap-2 mb-2">
            <Trash2 className="w-4 h-4 text-red-500" />
            <h2 className="text-[10px] uppercase tracking-widest text-red-500 font-sans">Danger Zone</h2>
          </div>
          <p className="text-xs text-red-400/80 font-sans font-light mb-6">
            Permanently deletes your account and <strong>all associated trips, itineraries, and expense data</strong> from our database. This action is irreversible.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-2 border border-red-300 text-red-500 px-6 py-3 text-xs uppercase tracking-widest font-sans hover:bg-red-500 hover:text-white transition-all duration-300"
            >
              <Trash2 className="w-4 h-4" /> Delete Account
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-red-100 border border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-600 font-sans">
                  Type <strong>DELETE</strong> in the box below to confirm permanent account deletion.
                </p>
              </div>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full border border-red-200 bg-white px-4 py-3 text-sm font-sans text-red-600 focus:outline-none focus:border-red-400 placeholder:text-red-300 tracking-widest"
              />
              {error && (
                <p className="text-[11px] text-red-500 font-sans">{error}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setConfirmText(''); setError(''); }}
                  className="px-5 py-2.5 border border-primary/20 text-primary text-xs uppercase tracking-widest font-sans hover:bg-primary/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={confirmText !== 'DELETE' || isDeleting}
                  className="px-6 py-2.5 bg-red-500 text-white text-xs uppercase tracking-widest font-sans hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    <><Trash2 className="w-3 h-3" /> Confirm Delete</>
                  )}
                </button>
              </div>
            </div>
          )}
        </section>

      </main>
    </div>
  );
};

export default ProfileView;
