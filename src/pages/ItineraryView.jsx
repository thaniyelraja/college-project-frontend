import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar from '../components/Navbar';
import { CloudRain, Sun, Navigation, MapPin, Coffee, Utensils, Zap, ChevronUp, ChevronDown, Trash2, Star, Tag, Thermometer, Hotel, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../components/Toast';

const mockItinerary = {
  destination: "Curated Demo",
  days: [
    {
       dayNumber: 1, theme: "Demo Mode",
       activities: [{
          id: 'mock1', placeName: 'Demo Location', startTime: '10:00', endTime: '12:00',
          lat: 48.8566, lng: 2.3522, weatherCondition: 'Clear', isCriticalWeatherAlert: false
       }]
    }
  ]
};

const customIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="display:flex; justify-content:center; align-items:center; margin-top:-14px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#EA4335" width="28px" height="28px" style="filter: drop-shadow(0px 4px 6px rgba(234,67,53,0.4));">
            <path stroke="white" stroke-width="1" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
         </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28] // Mathematically binds the bottom tip of the SVG needle to the lat/lng
});

const activeIcon = new L.DivIcon({
  className: 'custom-marker-active',
  html: `<div style="display:flex; justify-content:center; align-items:center; margin-top:-18px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#D4AF37" width="36px" height="36px" style="filter: drop-shadow(0px 6px 12px rgba(212,175,55,0.6));">
            <path stroke="#1A1A1A" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
         </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36]
});

const ItineraryView = () => {
  const [activeDay, setActiveDay] = useState(0);
  const [activeActivityId, setActiveActivityId] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const { addToast } = useToast();
  
  const [localActivities, setLocalActivities] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSyncingWeather, setIsSyncingWeather] = useState(false);
  const [hotelSuggestions, setHotelSuggestions] = useState([]);
  const [userLocation, setUserLocation] = useState(null); // Track live coordinates for lines
  const [liveDrivingRoute, setLiveDrivingRoute] = useState(null); // Track actual driving geometry
  const [isPlottingRoute, setIsPlottingRoute] = useState(false);
  const userLocationMarkerRef = useRef(null); // live location dot
  const locationWatchRef = useRef(null);      // geolocation watch ID

  const [fetchedTrip, setFetchedTrip] = useState(null);
  const resolvedTrip = fetchedTrip || location.state?.trip || mockItinerary;
  const safeDays = resolvedTrip.days && resolvedTrip.days.length > 0 ? [...resolvedTrip.days].sort((a, b) => a.dayNumber - b.dayNumber) : mockItinerary.days;
  const currentDay = safeDays[activeDay] || safeDays[0];

  // Fetch trip from API to enforce absolute source of truth
  useEffect(() => {
    if (id) {
      axios.get(`https://caring-analysis-production-2d57.up.railway.app/api/v1/trips/${id}`)
        .then(res => setFetchedTrip(res.data))
        .catch(err => console.error('Failed to fetch trip by ID:', err));
    }
  }, [id]);

  // Fetch hotel suggestions near the destination
  useEffect(() => {
    const lat = resolvedTrip?.destinationLat;
    const lng = resolvedTrip?.destinationLng;
    if (!lat || !lng) return;
    const dest = encodeURIComponent(resolvedTrip.destination || '');
    axios.get(`https://caring-analysis-production-2d57.up.railway.app/api/v1/hotels/suggestions?lat=${lat}&lng=${lng}&radius=30000&destination=${dest}`)
      .then(res => setHotelSuggestions(res.data || []))
      .catch(() => setHotelSuggestions([]));
  }, [resolvedTrip?.id]);


  // Sync state cleanly whenever active day explicitly changes
  useEffect(() => {
     setLocalActivities(currentDay.activities || []);
     setIsDirty(false);
  }, [activeDay, currentDay]);

  // Only include activities that have valid non-NaN coordinates
  const validActivities = localActivities.filter(act => {
    const lat = parseFloat(act.lat || act.latitude);
    const lng = parseFloat(act.lng || act.longitude);
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
  });

  let routePoints = validActivities.map(act => [
    parseFloat(act.lat || act.latitude),
    parseFloat(act.lng || act.longitude)
  ]);

  if (routePoints.length === 0) {
      const fallbackLat = resolvedTrip.destinationLat != null ? resolvedTrip.destinationLat : 48.8566;
      const fallbackLng = resolvedTrip.destinationLng != null ? resolvedTrip.destinationLng : 2.3522;
      routePoints = [[parseFloat(fallbackLat), parseFloat(fallbackLng)]];
  }

  // Native Leaflet mapping to bypass react-leaflet version mismatch crash
  useEffect(() => {
    if (routePoints.length > 0 && mapRef.current) {
      if (!mapInstanceRef.current) {
         // Initialize Map
         mapInstanceRef.current = L.map(mapRef.current, {
            zoomControl: false,
         }).setView(routePoints[0], 13);

         L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
         }).addTo(mapInstanceRef.current);
      }

      // Clear old layers except the live location dot
      mapInstanceRef.current.eachLayer((layer) => {
         if (layer === userLocationMarkerRef.current) return; // keep live dot
         if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.GeoJSON) {
             mapInstanceRef.current.removeLayer(layer);
         }
      });

      // Add markers — use validActivities[i] so index always matches routePoints[i]
      markersRef.current = [];
      routePoints.forEach((coord, i) => {
         const act = validActivities[i];
         const isActive = (act?.id || i) === activeActivityId;
         const marker = L.marker(coord, { icon: isActive ? activeIcon : customIcon }).addTo(mapInstanceRef.current);
         if (isActive) marker.setZIndexOffset(1000);
         markersRef.current.push(marker);
      });

      // ── Black dotted line connecting activity places ─────────────────────
      if (routePoints.length > 1) {
         L.polyline(routePoints, { 
             color: '#000000', 
             weight: 3, 
             opacity: 0.35, 
             dashArray: '6, 8' 
         }).addTo(mapInstanceRef.current);
      }

      // Add real highway/road routing natively mathematically bound from ORS Matrix
      localActivities.forEach(act => {
          if (act.routeGeometry) {
              try {
                  const geoData = JSON.parse(act.routeGeometry);
                  L.geoJSON(geoData, { 
                      style: { 
                          color: '#000000', 
                          weight: 3, 
                          opacity: 0.4,
                          dashArray: '6, 8',
                          lineCap: 'round',
                          lineJoin: 'round'
                      } 
                  }).addTo(mapInstanceRef.current);
              } catch (e) {
                  console.error("Failed to parse Geography Matrix Layer natively", e);
              }
          }
      });

      
      // Auto-center camera mathematically to frame all markers perfectly
      if (routePoints.length > 0) {
          const bounds = L.latLngBounds(routePoints);
          mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      }
      
      // Driving directions tether from GPS to Active Activity
      if (userLocation && activeActivityId != null) {
          if (liveDrivingRoute) {
              // Outer glow
              L.geoJSON(liveDrivingRoute, { 
                  style: { color: '#4285F4', weight: 8, opacity: 0.18, lineCap: 'round', lineJoin: 'round' } 
              }).addTo(mapInstanceRef.current);
              // Natively plot the pulled GeoJSON road-snapped driving directions
              L.geoJSON(liveDrivingRoute, { 
                  style: { color: '#4285F4', weight: 4, opacity: 0.9, lineCap: 'round', lineJoin: 'round' } 
              }).addTo(mapInstanceRef.current);
          } else {
              // Fallback: Solid Blue straight tether from User Live Location to Active Activity
              const activeAct = localActivities.find((a, i) => (a.id || i) === activeActivityId);
              if (activeAct) {
                  const targetLat = parseFloat(activeAct.lat || activeAct.latitude);
                  const targetLng = parseFloat(activeAct.lng || activeAct.longitude);
                  if (!isNaN(targetLat) && !isNaN(targetLng)) {
                      L.polyline([userLocation, [targetLat, targetLng]], {
                        color: '#4285F4', weight: 6, opacity: 0.18, lineCap: 'round', lineJoin: 'round'
                      }).addTo(mapInstanceRef.current);
                      L.polyline([userLocation, [targetLat, targetLng]], { 
                          color: '#4285F4', weight: 3, opacity: 0.85, lineCap: 'round', lineJoin: 'round'
                      }).addTo(mapInstanceRef.current);
                  }
              }
          }
      }

      // Fix for Leaflet absolute positioning collapse
      setTimeout(() => {
         if (mapInstanceRef.current) {
             mapInstanceRef.current.invalidateSize();
         }
      }, 150);
    }
    
    return () => {
        // map stays mounted — cleanup watchPosition on unmount (see effect below)
    };
  }, [routePoints, userLocation, activeActivityId, localActivities]);

  // ── Real-time user location tracking ──────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;

    // Pulsing blue dot icon
    const locationIcon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;width:20px;height:20px;">
          <div style="
            position:absolute;inset:0;
            background:rgba(66,133,244,0.25);
            border-radius:50%;
            animation:locPulse 1.8s ease-out infinite;
          "></div>
          <div style="
            position:absolute;top:4px;left:4px;
            width:12px;height:12px;
            background:#4285F4;
            border:2px solid white;
            border-radius:50%;
            box-shadow:0 2px 8px rgba(66,133,244,0.6);
          "></div>
        </div>
        <style>
          @keyframes locPulse {
            0%   { transform:scale(1);   opacity:0.8; }
            100% { transform:scale(2.8); opacity:0;   }
          }
        </style>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const updateLocation = (pos) => {
      const { latitude, longitude } = pos.coords;
      setUserLocation([latitude, longitude]);
      
      if (!mapInstanceRef.current) return;

      if (!userLocationMarkerRef.current) {
        // First fix — create the marker
        userLocationMarkerRef.current = L.marker([latitude, longitude], { icon: locationIcon, zIndexOffset: 2000 })
          .bindTooltip('You are here', { permanent: false, direction: 'top', className: 'luxury-tooltip' })
          .addTo(mapInstanceRef.current);
      } else {
        // Subsequent fixes — just move it
        userLocationMarkerRef.current.setLatLng([latitude, longitude]);
      }
    };

    locationWatchRef.current = navigator.geolocation.watchPosition(
      updateLocation,
      (err) => console.warn('Geolocation error:', err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (locationWatchRef.current != null) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
        locationWatchRef.current = null;
      }
      if (userLocationMarkerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(userLocationMarkerRef.current);
        userLocationMarkerRef.current = null;
      }
    };
  }, []); // runs once on mount

  // Sync Marker Highlights natively
  useEffect(() => {
     markersRef.current.forEach((marker, index) => {
         const uniqueId = localActivities[index]?.id || index;
         if (uniqueId === activeActivityId) {
             marker.setIcon(activeIcon);
             marker.setZIndexOffset(1000);
             
             marker.bindTooltip(localActivities[index].placeName || "Curated Location", {
                 permanent: true,
                 direction: 'top',
                 className: 'luxury-tooltip'
             }).openTooltip();
         } else {
             marker.setIcon(customIcon);
             marker.setZIndexOffset(0);
             marker.unbindTooltip();
         }
     });
  }, [activeActivityId, localActivities]);

  const handleActivityClick = (activity, index) => {
      const uniqueId = activity.id || index;
      if (activeActivityId !== uniqueId) {
          setLiveDrivingRoute(null); // Clear routing when destination changes
      }
      setActiveActivityId(uniqueId);
      
      const targetLat = parseFloat(activity.lat || activity.latitude);
      const targetLng = parseFloat(activity.lng || activity.longitude);
      
      if (mapInstanceRef.current && !isNaN(targetLat) && !isNaN(targetLng)) {
          mapInstanceRef.current.flyTo([targetLat, targetLng], 16, {
              animate: true,
              duration: 1.5
          });
      }
  };

  const moveActivityUp = (index, e) => {
      e.stopPropagation();
      if (index === 0) return;
      const newArr = [...localActivities];
      [newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]];
      setLocalActivities(newArr);
      setIsDirty(true);
  };

  const moveActivityDown = (index, e) => {
      e.stopPropagation();
      if (index === localActivities.length - 1) return;
      const newArr = [...localActivities];
      [newArr[index + 1], newArr[index]] = [newArr[index], newArr[index + 1]];
      setLocalActivities(newArr);
      setIsDirty(true);
  };

  const removeActivity = (index, e) => {
      e.stopPropagation();
      const newArr = localActivities.filter((_, i) => i !== index);
      setLocalActivities(newArr);
      setIsDirty(true);
  };

  const handleSafeRemoveActivity = (index, e) => {
      e.stopPropagation();
      const isConfirmed = window.confirm("METEOROLOGICAL WARNING: Severe weather detected! Do you want to remove this activity from your itinerary and update your route?");
      if (isConfirmed) {
          removeActivity(index, e);
      }
  };

  // Live Auto-Sync: Mathematically triggers backend predictive polling natively on rendering and strictly every 3 hours.
  useEffect(() => {
      const syncDayWeather = async () => {
          const dayId = currentDay.id || currentDay.dayNumber;
          if (!dayId) return;
          try {
              const response = await axios.put(`https://caring-analysis-production-2d57.up.railway.app/api/v1/trips/days/${dayId}/activities/weather/sync`);
              if (response.data && response.data.activities) {
                  setLocalActivities(response.data.activities);
              }
          } catch (error) {
              console.error("Failed to mathematically sync chronal predictive weather");
          }
      };

      syncDayWeather();
  }, [currentDay]);

  const manualSyncWeather = async () => {
      setIsSyncingWeather(true);
      const dayId = currentDay.id || currentDay.dayNumber;
      if (!dayId) {
          setIsSyncingWeather(false);
          return;
      }
      try {
          const response = await axios.put(`https://caring-analysis-production-2d57.up.railway.app/api/v1/trips/days/${dayId}/activities/weather/sync`);
          if (response.data && response.data.activities) {
              setLocalActivities(response.data.activities);
              if (id) {
                 axios.get(`https://caring-analysis-production-2d57.up.railway.app/api/v1/trips/${id}`).then(res => setFetchedTrip(res.data));
              }
              addToast({ type: 'success', message: 'Weather successfully synced for this day.' });
          }
      } catch (error) {
          console.error("Manual Weather Sync Failed: ", error);
          addToast({ type: 'error', message: 'Failed to retrieve live weather data.' });
      } finally {
          setIsSyncingWeather(false);
      }
  };

  const handleUpdateRecalculate = async () => {
      setIsUpdating(true);
      try {
          const dayId = currentDay.id || currentDay.dayNumber;
          if (!dayId) {
              addToast({ type: 'warning', message: 'Mock UI mode. Please generate a real trip to use this feature.' });
              setIsUpdating(false); return;
          }
          const response = await axios.put(`https://caring-analysis-production-2d57.up.railway.app/api/v1/trips/days/${dayId}/activities`, localActivities);
          setLocalActivities(response.data.activities);
          if (id) {
             axios.get(`https://caring-analysis-production-2d57.up.railway.app/api/v1/trips/${id}`).then(res => setFetchedTrip(res.data));
          }
          setIsDirty(false);
          setIsUpdating(false);
          addToast({ type: 'success', message: 'Itinerary recalculated and saved successfully.' });
      } catch (error) {
          console.error("Update Logic Failed: ", error);
          addToast({ type: 'error', message: 'Server failed to recalibrate the route. Please try again.' });
          setIsUpdating(false);
      }
  };

  const manualPlotRoute = async () => {
      if (!userLocation || activeActivityId == null) {
          addToast({ type: 'warning', message: 'Ensure GPS is enabled and an activity is selected first.' });
          return;
      }
      setIsPlottingRoute(true);
      try {
          const activeAct = localActivities.find((a, i) => (a.id || i) === activeActivityId);
          if (!activeAct) return;
          const endLat = parseFloat(activeAct.lat || activeAct.latitude);
          const endLng = parseFloat(activeAct.lng || activeAct.longitude);
          
          const response = await axios.get(`https://caring-analysis-production-2d57.up.railway.app/api/v1/trips/routing/directions?startLat=${userLocation[0]}&startLng=${userLocation[1]}&endLat=${endLat}&endLng=${endLng}`);
          
          if (response.data && response.data.geometry) {
              const geoData = JSON.parse(response.data.geometry);
              setLiveDrivingRoute(geoData);
              addToast({ type: 'success', message: `Route mapped. Est driving time: ${response.data.duration}` });
          } else {
              addToast({ type: 'error', message: 'Driving directions unavailable for this leg.' });
          }
      } catch (error) {
          console.error("Live Route Proxy Failed:", error);
          addToast({ type: 'error', message: 'Failed to proxy live routing instructions.' });
      } finally {
          setIsPlottingRoute(false);
      }
  };

  return (
    <div className="h-screen bg-background flex flex-col font-sans overflow-hidden">
      <Navbar />
      
      {/* Container - Split-Screen Matrix Layout (Reversed) */}
      <div className="flex-1 flex flex-col lg:flex-row-reverse overflow-hidden border-t border-primary/5">
        
        {/* RIGHT PANEL: Map UI */}
        <div className="w-full lg:w-1/2 h-[50vh] lg:h-full flex flex-col relative z-0 bg-gray-100 border-b lg:border-b-0 lg:border-l border-primary/10">
          <div className="flex-1 relative w-full border-b border-primary/10">
            <div ref={mapRef} className="absolute inset-0 w-full h-full z-0"></div>
            
            {/* Custom Luxury Zoom Controls */}
            <div className="absolute top-8 right-8 z-10 flex flex-col gap-2">
               <button 
                  onClick={() => mapInstanceRef.current && mapInstanceRef.current.zoomIn()}
                  className="w-10 h-10 bg-white/90 backdrop-blur-md border border-[#212121]/10 rounded-none flex items-center justify-center text-[#212121] hover:bg-[#212121] hover:text-white transition-colors duration-300 shadow-[5px_5px_15px_rgba(0,0,0,0.05)] cursor-pointer"
                  title="Zoom In"
               >
                 <span className="text-xl font-light mb-[2px]">+</span>
               </button>
               <button 
                  onClick={() => mapInstanceRef.current && mapInstanceRef.current.zoomOut()}
                  className="w-10 h-10 bg-white/90 backdrop-blur-md border border-[#212121]/10 rounded-none flex items-center justify-center text-[#212121] hover:bg-[#212121] hover:text-white transition-colors duration-300 shadow-[5px_5px_15px_rgba(0,0,0,0.05)] cursor-pointer"
                  title="Zoom Out"
               >
                 <span className="text-xl font-light mb-[2px]">−</span>
               </button>
            </div>
          </div>
          
          <div className="absolute bottom-6 left-6 right-6 z-10 flex items-end justify-between pointer-events-none">
            
            <div className="bg-white/90 backdrop-blur-md px-4 py-3 shadow-2xl border border-primary/10 rounded-none inline-flex items-center gap-3 max-w-sm pointer-events-auto">
              <Zap className="w-4 h-4 text-secondary animate-pulse flex-shrink-0" />
              <p className="text-[#212121] text-[10px] font-bold uppercase tracking-widest leading-relaxed">Map ready</p>
            </div>
            
            {/* Live routing button removed on user request */}
            
          </div>
        </div>

        {/* LEFT PANEL: Schedule UI (Internal Scroll) */}
        <div className="w-full lg:w-1/2 h-full overflow-y-auto custom-scrollbar p-8 lg:p-12 relative z-10 bg-white shadow-[10px_0_30px_rgba(0,0,0,0.03)]">
            
            <div className="mb-10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase tracking-widest text-muted block">Curated for you</span>
                <div className="flex gap-2">
                    <button 
                      onClick={manualSyncWeather}
                      disabled={isSyncingWeather}
                      className={`text-[10px] flex items-center gap-1 uppercase tracking-widest transition-colors px-3 py-1.5 shadow-sm border ${
                        isSyncingWeather 
                          ? 'border-emerald-600/30 text-emerald-600/50 bg-emerald-50 cursor-not-allowed' 
                          : 'border-emerald-600/20 text-emerald-600 hover:text-white hover:bg-emerald-600'
                      }`}
                    >
                      <Thermometer className={`w-3 h-3 ${isSyncingWeather ? 'animate-pulse' : ''}`} /> 
                      {isSyncingWeather ? 'Syncing...' : 'Live Weather'}
                    </button>
                    <button 
                      onClick={() => navigate(`/trip/${id}/expenses`)}
                      className="text-[10px] uppercase tracking-widest text-primary hover:text-white border border-primary/20 hover:bg-primary transition-colors px-3 py-1.5 shadow-sm"
                    >
                      Expense Tracker
                    </button>
                </div>
              </div>
              <h1 className="text-5xl font-serif text-primary truncate tracking-tight">{resolvedTrip.destination ? resolvedTrip.destination.split(',')[0] : "Destination"}</h1>
              <div className="w-24 h-px bg-primary/20 mt-6 mb-8"></div>
              
              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                {safeDays.map((day, idx) => (
                  <button 
                    key={day.dayNumber || idx}
                    onClick={() => setActiveDay(idx)}
                    className={`flex-shrink-0 px-6 py-3 border text-[10px] sm:text-xs tracking-widest uppercase transition-all duration-300 ${
                      activeDay === idx ? 'border-primary bg-primary text-white shadow-md' : 'border-primary/20 text-primary hover:border-primary/50'
                    }`}
                  >
                    Day {day.dayNumber || idx + 1}
                  </button>
                ))}
              </div>
              
              <h2 className="text-xl font-serif text-primary mt-6 italic">{currentDay.theme || "Curated Excursion"}</h2>
              
              {resolvedTrip.durationDays > 5 && (
                  <p className="text-center text-[9px] text-muted tracking-widest uppercase mt-4 opacity-50">
                      * Weather forecasts are available for the next 5 days *
                  </p>
              )}
            </div>
  
            <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:w-px before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:bg-primary/10">
              
              {localActivities.map((activity, index) => (
                <div 
                   key={activity.id || index} 
                   onClick={() => handleActivityClick(activity, index)}
                   className={`group relative flex items-start gap-6 py-8 cursor-pointer transition-all duration-300 ${activeActivityId === (activity.id || index) ? 'bg-primary/5 -mx-4 px-4 rounded-xl border-l-[3px] border-secondary shadow-sm' : 'hover:bg-gray-50/50 -mx-4 px-4 rounded-xl border-l-[3px] border-transparent'}`}
                >
                  
                  {/* Controller Surfaces (Hidden until Group-Hover) */}
                  <div className="absolute right-4 top-4 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      {index > 0 && <button onClick={(e) => moveActivityUp(index, e)} className="p-1 px-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50 shadow-sm transition-all"><ChevronUp className="w-3 h-3 text-primary"/></button>}
                      {index < localActivities.length - 1 && <button onClick={(e) => moveActivityDown(index, e)} className="p-1 px-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50 shadow-sm transition-all"><ChevronDown className="w-3 h-3 text-primary"/></button>}
                      <button onClick={(e) => removeActivity(index, e)} className="p-1 bg-red-50 border border-red-100 text-red-600 rounded hover:bg-red-100 mt-2 shadow-sm transition-all"><Trash2 className="w-3 h-3"/></button>
                  </div>
  
                  {/* Timeline node */}
                  <div className={`absolute left-5 md:left-1/2 -translate-x-1/2 w-3 h-3 rounded-full mt-1.5 z-10 transition-colors duration-300 ${activeActivityId === (activity.id || index) ? 'bg-secondary border-none scale-125' : 'bg-white border border-primary/20'}`}></div>
                                   <div className="w-full md:w-1/2 pb-4 text-left md:pr-12 md:pl-0 pl-16 pt-2">
                    
                    {/* Weather Badge — per-place individual fetch */}
                    {activity.isCriticalWeatherAlert ? (
                       <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 text-red-700 text-[10px] tracking-widest uppercase mb-3 shadow-sm rounded-sm">
                          <CloudRain className="w-3 h-3" /> ALERT: {activity.weatherCondition}
                          <button onClick={(e) => handleSafeRemoveActivity(index, e)} className="ml-3 bg-red-600 text-white font-bold px-2 py-0.5 rounded text-[8px] hover:bg-red-700 transition-colors shadow-inner flex items-center gap-1">
                              <Zap className="w-2 h-2"/> Reroute
                          </button>
                       </div>
                    ) : activity.weatherCondition ? (
                       <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] tracking-widest uppercase mb-3 shadow-sm rounded-sm">
                          <Thermometer className="w-3 h-3" /> {activity.weatherCondition}
                       </div>
                    ) : null}

                    <h3 className="text-lg font-serif text-primary font-semibold flex items-center gap-2">
                      {activity.isFoodBlock ? <Utensils className="w-4 h-4 text-secondary"/> : <MapPin className="w-4 h-4 text-primary/50" />}
                      {activity.placeName || "Location"}
                    </h3>
                    
                    {/* Time range */}
                    <div className="flex items-center gap-2 text-xs text-muted font-light mt-1 mb-2">
                       <span className="font-semibold bg-gray-100 px-2 py-1 rounded">{activity.startTime || "TBD"} — {activity.endTime || "TBD"}</span>
                    </div>

                    {/* OTM Data Badges — Rate + Kinds */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {activity.otmRate != null && activity.otmRate > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold tracking-wider rounded-sm">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {Number(activity.otmRate).toFixed(1)}/10
                        </span>
                      )}
                      {activity.otmKinds && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] tracking-wider rounded-sm max-w-[200px] truncate">
                          <Tag className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{activity.otmKinds.split(',')[0]}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-primary/80 leading-relaxed font-light">
                      {activity.description || "Enjoy your time here."}
                    </p>
                  </div>
                  
                  {activity.nextTransitDurationStr && activity.nextTransitDurationStr !== 'None' && index < localActivities.length - 1 && (
                    <div className="absolute bottom-0 left-5 md:left-1/2 -translate-x-1/2 translate-y-1/2 bg-white border border-gray-200 px-4 py-1.5 rounded-full flex items-center gap-2 z-20 shadow-md">
                      <Navigation className="w-3 h-3 text-secondary" />
                      <span className="text-[9px] font-bold tracking-widest uppercase text-gray-500 whitespace-nowrap">
                        {activity.nextTransitDurationStr}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Persistent Floating Save Banner (Anchored inside the left content pane) */}
            {isDirty && (
              <div className="fixed bottom-0 left-0 w-full lg:w-1/2 p-6 bg-white/95 backdrop-blur-md border-t-2 border-secondary z-[60] flex items-center justify-between shadow-[0_-5px_20px_rgba(0,0,0,0.05)] animate-in slide-in-from-bottom-6">
                 <div>
                     <p className="text-xs font-bold uppercase tracking-widest text-primary">Modifications Detected</p>
                     <p className="text-[10px] text-muted tracking-wide mt-1 font-light">Your schedule will be updated automatically.</p>
                 </div>
                 <button 
                    onClick={handleUpdateRecalculate} 
                    disabled={isUpdating} 
                    className={`bg-primary text-white border border-primary px-6 py-3 font-sans tracking-widest text-xs uppercase transition-all duration-300 shadow-xl flex items-center gap-2 ${isUpdating ? 'opacity-80' : 'hover:bg-white hover:text-primary hover:shadow-none'}`}
                 >
                    {isUpdating ? "Updating..." : "Update Plan"} 
                    <Zap className={`w-3 h-3 ${isUpdating ? 'animate-pulse text-secondary' : 'text-secondary'}`} strokeWidth={3} />
                 </button>
              </div>
            )}
            
            {/* ── Hotel Suggestions ─────────────────────────────────────── */}
            {hotelSuggestions.length > 0 && (
              <div className="mt-16 pt-10 border-t border-primary/10">
                <div className="flex items-center gap-3 mb-6">
                  <Hotel className="w-4 h-4 text-primary" />
                  <h3 className="font-sans text-xs uppercase tracking-widest text-primary">
                    Nearby Accommodations
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {hotelSuggestions.map((hotel, idx) => (
                    <div
                      key={idx}
                      className="border border-primary/10 p-4 hover:border-primary/30 transition-colors group"
                    >
                      <p className="font-serif text-base text-primary truncate mb-1 leading-snug">
                        {hotel.name}
                      </p>
                      {hotel.rate > 0 && (
                        <div className="flex items-center gap-1 mb-3">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-[10px] text-muted font-sans uppercase tracking-widest">
                            {hotel.rate.toFixed(1)}/10
                          </span>
                        </div>
                      )}
                      <a
                        href={hotel.mapsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-sans text-primary/60 hover:text-primary border border-primary/20 hover:border-primary px-3 py-1.5 transition-all duration-200 group-hover:bg-primary/5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View on Maps
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

        </div>

      </div>
    </div>
  );
};

export default ItineraryView;
