import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, signInWithPopup, getAdditionalUserInfo, deleteUser, signOut } from '../services/firebase';
import { Compass } from 'lucide-react';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (auth.currentUser) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleOAuthPopup = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setError('');

    try {
      const res = await signInWithPopup(auth, googleProvider);
      const info = getAdditionalUserInfo(res);
      
      try {
        const existsRes = await axios.get(`https://caring-analysis-production-2d57.up.railway.app/api/v1/users/exists/${res.user.uid}`);
        
        if (info.isNewUser) {
          if (existsRes.data === true) {
            await signOut(auth);
            setError('User already exists in DB! (Cannot sign up again)');
            setIsAuthenticating(false);
            return;
          } else {
            await axios.post('https://caring-analysis-production-2d57.up.railway.app/api/v1/users', {
              firebaseUid: res.user.uid,
              name: res.user.displayName || 'Voyager',
              email: res.user.email
            });
          }
        } else {
          if (existsRes.data === false) {
            await deleteUser(res.user);
            await signOut(auth);
            setError('Account not found in DB! Please Sign Up first.');
            setIsAuthenticating(false);
            return;
          }
        }
      } catch (dbErr) {
        console.warn('Backend exists check failed, proceeding to avoid hard lockout.', dbErr);
      }

      navigate('/', { replace: true });
      
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(`Authentication failed. Please try again.`);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Left Side: Luxury Editorial Imagery & Branding */}
        <div className="hidden md:flex md:w-1/2 relative overflow-hidden bg-primary items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 transition-transform duration-[20s] hover:scale-110"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1499856871958-5b9627545d1a?ixlib=rb-4.0.3&auto=format&fit=crop&w=2020&q=80')" }}
        />
        <div className="relative z-10 p-16 text-white text-center">
          <Compass className="w-16 h-16 mx-auto mb-8 text-amber-400" strokeWidth={1.5} />
          <h1 className="text-5xl font-serif font-bold mb-4 leading-tight">Your trips,<br/>planned by AI.</h1>
          <div className="w-16 h-px bg-amber-400/60 mx-auto my-6"></div>
          <p className="font-sans font-light text-base text-white/70 max-w-xs mx-auto leading-relaxed">
            Get personalised itineraries, real-time weather updates, and smart expense tracking — all in one place.
          </p>
        </div>
      </div>

      {/* Right Side: Authentication Portal */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 lg:p-24 relative">
        <div className="w-full max-w-md">
          <div className="text-center mb-12 flex flex-col items-center md:hidden">
             <Compass className="w-10 h-10 mb-4 text-primary" strokeWidth={1} />
             <h1 className="text-4xl font-serif">Curated Wanderlust</h1>
          </div>

          <h2 className="text-3xl font-serif font-bold mb-2 text-primary">
            Welcome!
          </h2>
          <p className="text-muted font-sans mb-12 text-sm">
            Sign in to start planning your trips with AI or continue where you left off.
          </p>

          {error && (
            <div className="p-3 mb-6 border border-red-200 bg-red-50 text-red-600 text-sm font-sans rounded-none">
              {error}
            </div>
          )}

          <div className="mb-6">
            <button 
              disabled={isAuthenticating}
              onClick={handleOAuthPopup}
              className={`w-full flex items-center justify-center gap-4 py-4 px-4 border border-primary/20 transition-all duration-300 font-sans tracking-wide text-xs uppercase ${isAuthenticating ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-primary/5 cursor-pointer shadow-sm hover:shadow-md'}`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
