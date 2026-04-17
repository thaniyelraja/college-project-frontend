import React, { useState, useEffect } from 'react';
import { Compass, MapPin, Calendar, Clock, ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../../services/firebase';

const Step1Logistics = ({ data, updateData, onNext }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState(data.destination || '');
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [dateConflict, setDateConflict] = useState(null); // null | { destination, startDate, endDate }
  const [locationError, setLocationError] = useState('');

  // Auto-calculate end date
  useEffect(() => {
    if (data.startDate && data.durationDays) {
      const end = new Date(data.startDate);
      end.setDate(end.getDate() + data.durationDays);
      updateData('endDate', end.toISOString().split('T')[0]);
    }
  }, [data.startDate, data.durationDays]);

  // Date conflict check — fires whenever startDate or durationDays changes
  useEffect(() => {
    if (!data.startDate || !data.endDate) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return; // skip if not logged in

    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(
          `https://caring-analysis-production-2d57.up.railway.app/api/v1/trips/date-conflict?firebaseUid=${uid}&startDate=${data.startDate}&endDate=${data.endDate}`
        );
        if (res.data.conflict) {
          setDateConflict(res.data);
        } else {
          setDateConflict(null);
        }
      } catch {
        setDateConflict(null); // fail open
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [data.startDate, data.endDate]);

  // Nominatim Autocomplete
  useEffect(() => {
    if (searchTerm.length >= 3 && searchTerm !== data.destination) {
      setIsSearching(true); // Show immediately — before the debounce fires
    } else {
      setIsSearching(false);
      setSuggestions([]);
    }

    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 3 && searchTerm !== data.destination) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchTerm}&limit=10`);
          const rawResults = await res.json();
          
          const filteredResults = rawResults.filter(p => {
            // Strictly reject macroscopic regions universally
            if (["country", "state", "region"].includes(p.type) || ["country", "state", "region"].includes(p.addresstype)) {
               return false;
            }

            // Exclude unwanted generic types
            if (["college", "school", "hospital", "restaurant", "mall", "building", "company", "amenity"].includes(p.type)) {
               return false;
            }

            // Whitelist valid tourist and natural areas
            if (["natural", "tourism"].includes(p.class)) return true;

            // Whitelist exact city-level bounds
            const allowedTypes = ["city", "town", "village", "municipality", "island", "suburb", "administrative"];
            if (["place", "boundary"].includes(p.class)) {
              return allowedTypes.includes(p.type) || allowedTypes.includes(p.addresstype);
            }

            return false;
          });

          setSuggestions(filteredResults.slice(0, 4));
          setActiveSuggestion(0);
          
          if (rawResults.length > 0 && filteredResults.length === 0) {
            setLocationError("Please select a valid city name.");
          } else {
            setLocationError("");
          }
        } catch (error) {
          console.error("Nominatim error", error);
        }
        setIsSearching(false);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const selectPlace = (place) => {
    setSearchTerm(place.display_name);
    setSuggestions([]);
    setActiveSuggestion(0);
    updateData('destination', place.display_name);
    updateData('lat', parseFloat(place.lat));
    updateData('lng', parseFloat(place.lon));
  };

  // Max Start Date (1 month from today)
  const todayDate = new Date().toISOString().split('T')[0];
  const maxDateObj = new Date();
  maxDateObj.setMonth(maxDateObj.getMonth() + 1);
  const maxDateStr = maxDateObj.toISOString().split('T')[0];

  // Dynamic Temporal Constraints
  const isToday = data.startDate === todayDate;
  const currentHour = new Date().getHours() + 1; // 1 hr buffer
  const minStartTime = isToday ? Math.max(5, currentHour) : 5;
  const validStartTime = Math.max(minStartTime, data.startTime);

  // Auto-correct `startTime` if today passes bounds seamlessly on load
  useEffect(() => {
    if (data.startTime < minStartTime) {
      updateData('startTime', minStartTime);
      if (data.endTime < minStartTime + 4) {
          updateData('endTime', minStartTime + 4);
      }
    }
  }, [minStartTime, data.startTime, data.endTime]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full max-w-2xl mx-auto">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-serif font-bold text-primary mb-2">Where are you headed? 🗺️</h2>
        <p className="font-sans text-muted text-sm">Tell us where you want to go and when — we'll handle the rest.</p>
      </div>

      <div className="space-y-12">
        {/* DESTINATION */}
        <div className="relative">
          <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-muted mb-4 border-b border-primary/10 pb-2">
            Destination
          </label>
          <div className="relative">
            <MapPin className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/60" />
            <input 
              type="text" 
              placeholder="Start typing a city..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setLocationError("");
                if (data.destination) updateData('destination', ''); // Clear selected if typing
              }}
              onKeyDown={(e) => {
                if (suggestions.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActiveSuggestion((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActiveSuggestion((prev) => (prev > 0 ? prev - 1 : 0));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  selectPlace(suggestions[activeSuggestion]);
                }
              }}
              className="w-full bg-transparent border-none p-4 pl-10 text-2xl font-serif focus:outline-none focus:ring-0 placeholder:text-muted/30"
            />
          </div>
          
          {locationError && (
             <p className="text-[11px] text-amber-500 mt-2 font-sans font-light px-2">
               {locationError}
             </p>
          )}

          {/* Searching indicator — shows immediately while debounce is pending */}
          {isSearching && suggestions.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white editorial-shadow border border-primary/5 z-50 px-4 py-3 flex items-center gap-3">
              <svg className="animate-spin w-3 h-3 text-primary/40 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              <span className="text-[11px] uppercase tracking-widest text-muted/60 font-sans">Searching...</span>
            </div>
          )}

          {/* Autocomplete Dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white editorial-shadow border border-primary/5 z-50">
              {suggestions.map((s, i) => (
                <div 
                  key={i} 
                  onClick={() => selectPlace(s)}
                  className={`p-4 cursor-pointer border-b border-primary/5 last:border-none font-sans font-light text-sm truncate transition-colors ${i === activeSuggestion ? 'bg-primary/5 text-primary font-medium' : 'hover:bg-background text-muted'}`}
                >
                  {s.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TIMELINE */}
        <div>
          <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-muted mb-6 border-b border-primary/10 pb-2">
            Travel Dates
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="relative">
              <span className="block text-xs font-semibold text-muted mb-2">Start Date</span>
              <div className="flex items-center border border-primary/20 p-3 hover:border-primary transition-colors">
                <Calendar className="w-4 h-4 mr-3 text-primary" />
                <input 
                  type="date" 
                  min={todayDate}
                  max={maxDateStr}
                  value={data.startDate}
                  onChange={(e) => updateData('startDate', e.target.value)}
                  className="w-full bg-transparent font-sans text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="relative">
              <span className="block text-xs font-semibold text-muted mb-2">Trip Length: {data.durationDays} {data.durationDays === 1 ? 'day' : 'days'}</span>
              <div className="h-12 flex items-center">
                 <input 
                  type="range" 
                  min="1" max="10" 
                  value={data.durationDays}
                  onChange={(e) => updateData('durationDays', parseInt(e.target.value))}
                  className="w-full accent-primary bg-primary/10 h-1 appearance-none rounded-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* DAILY CONSTRAINTS */}
        <div>
          <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-muted mb-6 border-b border-primary/10 pb-2">
            Daily Schedule
          </label>
          <p className="text-sm text-muted/80 mb-6 font-sans">What time does your day start and end? We'll plan activities within this window.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="relative">
              <span className="block text-xs font-semibold text-muted mb-2">Day starts at {validStartTime}:00</span>
              <div className="flex items-center gap-4">
                 <Clock className="w-4 h-4 text-primary" />
                 <input 
                  type="range" 
                  min={minStartTime} max="19" 
                  value={validStartTime}
                  onChange={(e) => {
                    let val = parseInt(e.target.value);
                    if (val > data.endTime - 4) val = data.endTime - 4;
                    updateData('startTime', val);
                  }}
                  className="w-full accent-primary bg-primary/10 h-1 appearance-none rounded-full"
                />
              </div>
            </div>
            
            <div className="relative">
              <span className="block text-xs font-semibold text-muted mb-2">Day ends at {data.endTime}:00</span>
              <div className="flex items-center gap-4">
                 <Clock className="w-4 h-4 text-primary" />
                 <input 
                  type="range" 
                  min="9" max="23" 
                  value={data.endTime}
                  onChange={(e) => {
                    let val = parseInt(e.target.value);
                    if (val < data.startTime + 4) val = data.startTime + 4;
                    updateData('endTime', val);
                  }}
                  className="w-full accent-primary bg-primary/10 h-1 appearance-none rounded-full"
                />
              </div>
            </div>
          </div>
          
          {(data.endTime - data.startTime <= 4) && (
            <div className="mt-4 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
               <AlertTriangle className="w-4 h-4 text-amber-500" />
               <span className="text-[11px] uppercase tracking-widest font-sans text-amber-600 font-medium">Minimum time frame of 4 hours reached</span>
            </div>
          )}
        </div>

      </div>

      {/* Date Conflict Warning */}
      {dateConflict && (
        <div className="mt-8 flex items-start gap-3 px-5 py-4 bg-red-50 border border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-sans uppercase tracking-widest text-red-600 font-semibold">
              Date Conflict Detected
            </p>
            <p className="text-xs text-red-500 mt-1 font-sans font-light">
              You already have a trip to <strong>{dateConflict.destination?.split(',')[0]}</strong> from{' '}
              <strong>{dateConflict.startDate}</strong> to <strong>{dateConflict.endDate}</strong>.
              Please choose different dates.
            </p>
          </div>
        </div>
      )}

      <div className="mt-16 flex justify-between items-center border-t border-primary/10 pt-10">
        <button 
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-3 text-muted px-4 py-2 font-sans tracking-widest text-xs uppercase hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Return Home
        </button>

        <button 
          onClick={onNext}
          disabled={!data.destination || !data.lat || !data.startDate || (data.endTime - data.startTime < 4) || !!dateConflict || !!locationError}
          className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3.5 rounded-xl font-sans font-semibold text-sm hover:bg-primary/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
        >
          My Preferences <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Step1Logistics;
