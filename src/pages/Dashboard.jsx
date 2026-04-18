import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../services/firebase';
import Navbar from '../components/Navbar';
import { MapPin, Calendar, Loader, MoreVertical, Trash2, Eye, ArrowRight } from 'lucide-react';
import { useToast } from '../components/Toast';
import api from '../api/axios';

// ─── Static featured destinations ────────────────────────────────────────────
const FEATURED = [
  {
    city: 'Madurai',
    country: 'Tamil Nadu',
    tag: 'Temple City',
    image: 'https://speakzeasy.wordpress.com/wp-content/uploads/2015/04/meenakshi-temple-madurai.jpg',
  },
  {
    city: 'Ooty',
    country: 'Tamil Nadu',
    tag: 'Nilgiri Hills',
    image: 'https://3.bp.blogspot.com/-cz8zCR5RpSU/VOAtC7AVnUI/AAAAAAAAARY/AqLCT2gximg/s1600/Ooty.jpg',
  },
  {
    city: 'Rameswaram',
    country: 'Tamil Nadu',
    tag: 'Pilgrim Island',
    image: 'https://3.bp.blogspot.com/-5JF8LmYyG6w/V_-keSBQafI/AAAAAAAAFcM/3KGgW2Ul2fQaQsm1MVt0WmFou0Us7hZWQCLcB/s1600/Rameshwaram%2BTemple%2BPillars.jpg',
  },
  {
    city: 'Kanyakumari',
    country: 'Tamil Nadu',
    tag: "Land's End",
    image: 'https://imgcld.yatra.com/ytimages/image/upload/v1481614632/Kanyakumari_Kanyakumari_Beach.jpg',
  },
];

// ─── Hero background images (rotated) ────────────────────────────────────────
const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1600&q=80',
  'https://images.unsplash.com/photo-1502003148287-a82ef80a6abc?w=1600&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&q=80',
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletePendingId, setDeletePendingId] = useState(null); // awaiting confirm click
  const [openMenuId, setOpenMenuId] = useState(null);
  const [heroIdx, setHeroIdx] = useState(0);
  const menuRef = useRef(null);
  const { addToast } = useToast();

  // Hero image rotation
  useEffect(() => {
    const t = setInterval(() => setHeroIdx(i => (i + 1) % HERO_IMAGES.length), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (user) {
        setIsAuthenticated(true);
        fetchTrips(user.uid);
      } else {
        setIsAuthenticated(false);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const handler = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchTrips = async uid => {
  try {
    const res = await api.get(`/trips?firebaseUid=${uid}`);

    const tripsData = Array.isArray(res.data)
      ? res.data
      : res.data?.data || [];

    setTrips(tripsData);

  } catch (e) {
    console.error('Failed to fetch trips:', e);
    setTrips([]); // safety fallback
  } finally {
    setLoading(false);
  }
};

  const handleDelete = async (e, tripId) => {
    e.stopPropagation();
    // First click → ask for confirmation inline
    if (deletePendingId !== tripId) {
      setDeletePendingId(tripId);
      return;
    }
    // Second click (confirmed)
    setDeletePendingId(null);
    setOpenMenuId(null);
    setDeletingId(tripId);
    try {
      await api.delete(`/trips/${tripId}`);
      setTrips(p => p.filter(t => t.id !== tripId));
      addToast({ type: 'success', message: 'Trip deleted successfully.' });
    } catch {
      addToast({ type: 'error', message: 'Delete failed. Please try again.' });
    } finally {
      setDeletingId(null);
    }
  };

  const openTrip = trip => navigate(`/trip/${trip.id}`, { state: { trip } });

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const budgetColor = b => ({ Luxury: '#D4AF37', Economy: '#6B8CAE', Normal: '#5A8A6E' })[b] || '#8E8E8E';

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1A1A1A] font-sans overflow-x-hidden">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative h-[72vh] min-h-[520px] overflow-hidden">
        {/* Background image with crossfade */}
        {HERO_IMAGES.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ease-in-out"
            style={{ backgroundImage: `url('${src}')`, opacity: i === heroIdx ? 1 : 0 }}
          />
        ))}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A1A]/80 via-[#1A1A1A]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/60 via-transparent to-transparent" />

        {/* Hero content */}
        <div className="relative h-full max-w-7xl mx-auto px-6 lg:px-8 flex flex-col justify-end pb-16">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#D4AF37] mb-4 block animate-pulse">
            AI-Orchestrated Travel
          </span>
          <h1 className="font-serif text-5xl md:text-7xl text-white leading-[1.05] tracking-tight mb-6 max-w-2xl">
            The World,<br />
            <span className="italic text-[#D4AF37]">Curated</span> for You.
          </h1>
          <p className="text-white/60 font-light text-base max-w-md mb-10 leading-relaxed">
            Intelligent itineraries crafted by AI. Every stop, every transit, every moment — precisely engineered.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/create')}
              className="group flex items-center gap-3 bg-[#D4AF37] text-[#1A1A1A] px-8 py-4 font-sans text-sm font-semibold hover:bg-white transition-all duration-500 hover:shadow-[0_20px_60px_rgba(212,175,55,0.4)] rounded-lg"
            >
              Plan a Trip
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => document.getElementById('my-trips').scrollIntoView({ behavior: 'smooth' })}
              className="text-white/60 hover:text-white text-xs uppercase tracking-[0.25em] transition-colors border-b border-transparent hover:border-white/40 pb-0.5"
            >
              My Archive ↓
            </button>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="absolute bottom-6 right-8 flex gap-1.5">
          {HERO_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setHeroIdx(i)}
              className={`h-[2px] transition-all duration-500 ${i === heroIdx ? 'w-8 bg-[#D4AF37]' : 'w-3 bg-white/30'}`}
            />
          ))}
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────────────────── */}
      <div className="bg-[#1A1A1A] text-white">
        <div className="max-w-7xl mx-auto px-6 py-5 grid grid-cols-3 divide-x divide-white/10">
          {[
            { label: 'Journeys Planned', value: trips.length || '—' },
            { 
  label: 'Days Mapped', 
  value: Array.isArray(trips)
    ? trips.reduce((s, t) => s + (t.numberOfDays || 0), 0)
    : '—'
},
            { label: 'AI Engine', value: 'Active' },
          ].map(({ label, value }) => (
            <div key={label} className="px-8 first:pl-0 last:pr-0 flex flex-col items-start">
              <span className="font-serif text-2xl text-[#D4AF37]">{value}</span>
              <span className="text-[9px] uppercase tracking-[0.3em] text-white/40 mt-0.5">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── MY TRIPS / OR LOGIN CTA ────────────────────────────────────────── */}
      {isAuthenticated ? (
        <section id="my-trips" className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 md:mb-12 gap-5 sm:gap-0">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-2">Your travels</span>
            <h2 className="font-serif text-4xl font-bold text-[#1A1A1A] tracking-tight">My Trips</h2>
          </div>
          <button
            onClick={() => navigate('/create')}
            className="w-full sm:w-auto flex justify-center items-center gap-2 bg-[#1A1A1A] text-white px-6 py-3 text-sm font-semibold rounded-lg hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-all duration-300"
          >
            <span>+ Plan New Trip</span>
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24 gap-3">
            <Loader className="w-5 h-5 text-[#1A1A1A]/30 animate-spin" strokeWidth={1} />
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#8E8E8E]">Retrieving archive...</span>
          </div>
        )}

        {/* Empty */}
        {!loading && trips.length === 0 && (
          <div className="border border-dashed border-[#1A1A1A]/10 py-24 flex flex-col items-center text-center rounded-2xl">
            <p className="font-serif text-2xl text-[#1A1A1A]/30 mb-3">No trips yet!</p>
            <p className="text-sm text-[#8E8E8E] mb-8 max-w-xs">Start by planning your first AI-powered trip. It only takes a few minutes.</p>
            <button
              onClick={() => navigate('/create')}
              className="bg-[#1A1A1A] text-white px-8 py-3.5 text-sm font-semibold rounded-xl hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-all duration-500"
            >
              Plan Your First Trip ✈️
            </button>
          </div>
        )}

        {/* Trip Cards Grid */}
        {!loading && trips.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map(trip => {
              const isDeleting = deletingId === trip.id;
              const isMenuOpen = openMenuId === trip.id;
              const displayBudgetType = trip.budgetType || (trip.budget > 25000 ? 'Luxury' : (trip.budget < 10000 ? 'Economy' : 'Normal'));
              const accent = budgetColor(displayBudgetType);

              return (
                <div
                  key={trip.id}
                  onClick={() => openTrip(trip)}
                  className={`group relative bg-white border border-[#1A1A1A]/5 cursor-pointer overflow-visible transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.15)] hover:-translate-y-1 ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
                >
                  {/* Budget accent strip */}
                  <div className="h-[3px] w-full" style={{ background: accent }} />

                  <div className="p-7">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} strokeWidth={1.5} />
                        <h3 className="font-serif text-xl text-[#1A1A1A] truncate tracking-tight">{trip.destination ? trip.destination.split(',')[0] : "Destination"}</h3>
                      </div>

                      {/* Three-dot menu */}
                      <div
                        className="relative shrink-0"
                        ref={isMenuOpen ? menuRef : null}
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setOpenMenuId(isMenuOpen ? null : trip.id)}
                          className="p-1.5 text-[#1A1A1A]/20 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/5 transition-all duration-200 rounded-sm"
                        >
                          {isDeleting
                            ? <Loader className="w-4 h-4 animate-spin text-red-400" />
                            : <MoreVertical className="w-4 h-4" />}
                        </button>
                        {isMenuOpen && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#1A1A1A]/8 shadow-2xl z-50 py-1">
                            <button
                              onClick={() => { setOpenMenuId(null); openTrip(trip); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-[#1A1A1A] hover:bg-[#1A1A1A]/5 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#1A1A1A]/40" />
                              View Trip
                            </button>
                            <div className="h-px bg-[#1A1A1A]/5 mx-3" />
                            {deletePendingId === trip.id ? (
                              <button
                                onClick={e => handleDelete(e, trip.id)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-white bg-red-500 hover:bg-red-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Confirm Delete
                              </button>
                            ) : (
                              <button
                                onClick={e => handleDelete(e, trip.id)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete Trip
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-2 text-[#8E8E8E] mb-6">
                      <Calendar className="w-3 h-3 shrink-0" strokeWidth={1.5} />
                      <span className="text-[11px] font-light">{fmtDate(trip.startDate)} — {fmtDate(trip.endDate)}</span>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 pt-5 border-t border-[#1A1A1A]/5">
                      <span className="text-[9px] uppercase tracking-[0.2em] px-3 py-1 border" style={{ color: accent, borderColor: `${accent}30`, background: `${accent}08` }}>
                        {displayBudgetType}
                      </span>
                      <span className="text-[9px] uppercase tracking-[0.2em] px-3 py-1 border border-[#1A1A1A]/10 text-[#8E8E8E]">{trip.groupType}</span>
                      <span className="text-[9px] uppercase tracking-[0.2em] px-3 py-1 border border-[#1A1A1A]/10 text-[#8E8E8E]">{trip.numberOfDays}d</span>
                    </div>
                  </div>

                  {/* Hover reveal footer */}
                  <div className="h-0 overflow-hidden group-hover:h-12 transition-all duration-500 bg-[#1A1A1A] flex items-center justify-between px-7">
                    <span className="text-[9px] uppercase tracking-[0.25em] text-white/60">Open itinerary</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      ) : (
        <section className="bg-[#1A1A1A] py-24 border-b border-white/5 flex flex-col items-center text-center">
           <div className="max-w-4xl mx-auto px-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#D4AF37] block mb-4">Get Started</span>
              <h2 className="font-serif text-4xl font-bold text-white mb-4 tracking-tight">Plan smarter trips with AI</h2>
              <p className="text-white/60 mb-10 max-w-xl mx-auto text-sm leading-relaxed">Sign in to save your trips, get personalised itineraries, track expenses, and travel smarter.</p>
              <button 
                onClick={() => navigate('/signup')} 
                className="bg-[#D4AF37] hover:bg-white text-[#1A1A1A] transition-all duration-500 px-10 py-4 text-sm font-bold rounded-xl shadow-xl hover:-translate-y-1"
              >
                 Get Started
              </button>
           </div>
        </section>
      )}

      {/* ── FEATURED DESTINATIONS ─────────────────────────────────────────── */}
      <section className="bg-[#1A1A1A] py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#D4AF37] block mb-2">Curated by AI</span>
              <h2 className="font-serif text-4xl text-white tracking-tight">Featured Destinations</h2>
            </div>
            <span className="hidden sm:block text-[9px] uppercase tracking-[0.3em] text-white/30">Select a destination to plan</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURED.map((dest, i) => (
              <div
                key={dest.city}
                onClick={() => navigate('/create')}
                className="group relative aspect-[3/4] overflow-hidden cursor-pointer"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Image */}
                <img
                  src={dest.image}
                  alt={dest.city}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/20 to-transparent" />

                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                  <span className="text-[9px] uppercase tracking-[0.3em] text-[#D4AF37] mb-1">{dest.tag}</span>
                  <h3 className="font-serif text-2xl text-white leading-tight">{dest.city}</h3>
                  <p className="text-white/50 text-xs font-light mt-0.5">{dest.country}</p>

                  {/* CTA on hover */}
                  <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-400">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-white/70">Plan this trip</span>
                    <ArrowRight className="w-3 h-3 text-[#D4AF37]" />
                  </div>
                </div>

                {/* Gold corner accent */}
                <div
                  className="absolute top-0 left-0 w-0 h-[2px] bg-[#D4AF37] group-hover:w-full transition-all duration-500"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER STRIP ───────────────────────────────────────────────────── */}
      <footer className="bg-[#1A1A1A] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <span className="font-serif text-white/30 text-sm">Smart Trip Planner © 2026</span>
          <span className="text-[9px] uppercase tracking-[0.3em] text-white/20">
            AI-Orchestrated · Precision Travel
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
