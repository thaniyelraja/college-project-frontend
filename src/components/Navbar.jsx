import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, signOut } from '../services/firebase';
import { Compass, User, LogOut } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <nav className="w-full border-b border-primary/10 bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo / Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <Compass className="w-6 h-6 text-primary" strokeWidth={1} />
            <span className="font-serif text-2xl tracking-tight text-primary">Smart Trip Planner</span>
          </div>

          {/* Dynamic Right Side: Profile / Actions */}
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/')}
              className="hidden md:flex font-sans text-xs font-bold tracking-widest uppercase text-muted hover:text-primary transition-colors"
            >
              Home
            </button>
            
            <button 
              onClick={() => navigate('/contact')}
              className="hidden md:flex font-sans text-xs font-bold tracking-widest uppercase text-muted hover:text-primary transition-colors"
            >
              Contact Us
            </button>

            <button 
              onClick={() => navigate('/create')}
              className="hidden md:flex font-sans text-xs tracking-widest uppercase font-bold text-primary hover:text-secondary transition-colors"
            >
              ✈ Create Trip
            </button>
            
            <div className="h-4 w-px bg-primary/20 hidden md:block"></div>

            {user ? (
              <div className="group relative">
                <button className="flex items-center gap-2 p-1.5 px-2 border border-primary/10 hover:border-primary/30 transition-all rounded-full bg-white">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="Profile" 
                      referrerPolicy="no-referrer" 
                      className="w-6 h-6 rounded-full object-cover" 
                      onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  {(!user.photoURL) && (
                    <div className="w-6 h-6 rounded-full bg-primary/5 flex items-center justify-center">
                       <User className="w-3 h-3 text-primary" />
                    </div>
                  )}
                  <span className="font-sans text-xs uppercase tracking-widest font-bold px-2 hidden sm:block text-primary">
                    {user.displayName?.split(' ')[0] || 'You'}
                  </span>
                </button>
                
                {/* Dropdown */}
                <div className="absolute right-0 mt-3 w-52 bg-white border border-gray-100 shadow-xl rounded-none overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right scale-95 group-hover:scale-100">
                  <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                    <p className="font-sans text-xs tracking-widest uppercase font-bold text-primary truncate">{user.displayName?.split(' ')[0] || 'You'}</p>
                    <p className="font-sans text-[10px] tracking-widest uppercase text-muted truncate mt-1">{user.email}</p>
                  </div>
                  <div className="p-1.5 flex flex-col gap-1">
                    <button
                      onClick={() => navigate('/profile')}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs tracking-widest uppercase font-bold text-primary hover:bg-gray-50 transition-colors"
                    >
                      <User className="w-3 h-3 text-muted" />
                      My Account
                    </button>
                    <button 
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs tracking-widest uppercase font-bold text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-3 h-3" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigate('/login')}
                  className="text-primary hover:text-amber-500 px-4 py-2 font-sans font-medium text-sm transition-colors"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => navigate('/login')}
                  className="bg-primary text-white px-5 py-2.5 rounded-full font-sans font-semibold text-sm hover:bg-primary/80 transition-all duration-300 shadow-sm"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
