import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../services/firebase';
import Navbar from '../components/Navbar';
import Step1Logistics from '../components/Wizard/Step1Logistics';
import Step2Preferences from '../components/Wizard/Step2Preferences';
import { Compass } from 'lucide-react';
import api from '../api/axios';

const WizardView = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  const loadingContexts = [
    "Understanding your interests...",
    "Finding the best places to visit...",
    "Filtering out tourist traps...",
    "Mapping the best routes...",
    "Checking the weather forecast...",
    "Scheduling your activities...",
    "Writing your day-by-day plan...",
    "Almost ready! Putting it all together..."
  ];

  useEffect(() => {
      let interval;
      if (isGenerating) {
          setLoadingTextIndex(0);
          interval = setInterval(() => {
              setLoadingTextIndex(prev => (prev + 1) % loadingContexts.length);
          }, 3200);
      }
      return () => clearInterval(interval);
  }, [isGenerating]);

  // Force absolute viewport reset on navigation entry or step change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);
  
  // Master Form State perfectly mapped to the Backend DTO
  const [formData, setFormData] = useState({
    destination: '',
    lat: null,
    lng: null,
    startDate: '',
    endDate: '',
    durationDays: 3,
    startTime: 9,
    endTime: 18,
    groupType: 'Solo',
    budgetType: 'normal',      // "economy" | "normal" | "luxury" — sent to backend
    interests: {
      'historyCulture': 2,
      'nature':         2,
      'entertainment':  1,
      'food':           1,
      'sports':         0,
      'shopping':       0,
      'adventure':      1,
      'relaxing':       2,
    },
    customInstructions: ''
  });

  const updateFormData = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError('');
    
    try {
      const firebaseUid = auth.currentUser?.uid || null;
      const payload = { ...formData, firebaseUid };
      const response = await api.post(`/trips/generate`, payload);
      setIsGenerating(false);
      navigate(`/trip/${response.data?.id}`, { state: { trip: response.data } });
    } catch (error) {
      console.error("Backend Error:", error);
      setIsGenerating(false);
      // Handle 409 date conflict specifically
      if (error.response?.status === 409) {
        const data = error.response.data;
        const dest = data.destination?.split(',')[0] || 'another trip';
        setGenerateError(
          `Date conflict: You already have a trip to "${dest}" from ${data.startDate} to ${data.endDate}. Please go back and choose different dates.`
        );
      } else if (error.response?.data?.message) {
        setGenerateError(error.response.data.message);
      } else {
        setGenerateError('Network connection blocked! Engaging Emergency Demo Fallback Mode... Routing to Paris Output Page!');
        
        const mockTrip = {
            id: "demo-fallback-paris",
            destination: "Paris, France",
            destinationLat: 48.8566,
            destinationLng: 2.3522,
            startDate: formData.startDate || new Date().toISOString().split('T')[0],
            endDate: formData.endDate || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
            numberOfDays: 3,
            budget: 150000.0,
            groupType: "Couple",
            expenseTracker: { id: "demo-tracker", baseBudgetLimit: 150000.0, memberNames: ["Demo Tester"], expenses: [] },
            days: [
               {
                   id: "day-1", dayNumber: 1, date: formData.startDate || new Date().toISOString().split('T')[0], theme: "Icons of Paris", estimatedCost: 25000,
                   activities: [
                       { id: "act-1", placeName: "Eiffel Tower", description: "The iconic wrought-iron lattice tower on the Champ de Mars.", startTime: "09:00", endTime: "12:00", latitude: 48.8584, longitude: 2.2945, weatherCondition: "Clear", criticalWeatherAlert: false, nextTransitDurationStr: "20 mins" },
                       { id: "act-2", placeName: "Louvre Museum", description: "World's largest art museum and a historic monument in Paris.", startTime: "13:00", endTime: "16:30", latitude: 48.8606, longitude: 2.3376, weatherCondition: "Clear", criticalWeatherAlert: false, nextTransitDurationStr: "15 mins" },
                       { id: "act-3", placeName: "Arc de Triomphe", description: "One of the most famous monuments in Paris, honoring those who fought for France.", startTime: "17:00", endTime: "19:00", latitude: 48.8738, longitude: 2.2950, weatherCondition: "Clouds", criticalWeatherAlert: false, nextTransitDurationStr: "none" }
                   ]
               },
               {
                   id: "day-2", dayNumber: 2, date: new Date(Date.now() + 86400000).toISOString().split('T')[0], theme: "Art & Cathedrals", estimatedCost: 18000,
                   activities: [
                       { id: "act-4", placeName: "Notre-Dame de Paris", description: "A medieval Catholic cathedral on the Île de la Cité.", startTime: "09:30", endTime: "11:30", latitude: 48.8529, longitude: 2.3500, weatherCondition: "Clear", criticalWeatherAlert: false, nextTransitDurationStr: "15 mins" },
                       { id: "act-5", placeName: "Panthéon", description: "A monument in the Latin Quarter containing remains of distinguished French citizens.", startTime: "12:00", endTime: "14:00", latitude: 48.8462, longitude: 2.3458, weatherCondition: "Clear", criticalWeatherAlert: false, nextTransitDurationStr: "10 mins" },
                       { id: "act-6", placeName: "Luxembourg Gardens", description: "Beautiful gardens created in 1612 by Marie de' Medici.", startTime: "14:30", endTime: "16:30", latitude: 48.8462, longitude: 2.3371, weatherCondition: "Clear", criticalWeatherAlert: false, nextTransitDurationStr: "none" }
                   ]
               },
               {
                   id: "day-3", dayNumber: 3, date: new Date(Date.now() + 86400000*2).toISOString().split('T')[0], theme: "Montmartre Views", estimatedCost: 12000,
                   activities: [
                       { id: "act-7", placeName: "Sacré-Cœur", description: "A Roman Catholic church and minor basilica dedicated to the Sacred Heart of Jesus.", startTime: "10:00", endTime: "12:30", latitude: 48.8867, longitude: 2.3431, weatherCondition: "Clouds", criticalWeatherAlert: false, nextTransitDurationStr: "25 mins" },
                       { id: "act-8", placeName: "Palais Garnier", description: "A 1,979-seat opera house, which was built from 1861 to 1875.", startTime: "14:00", endTime: "16:00", latitude: 48.8719, longitude: 2.3316, weatherCondition: "Rain", criticalWeatherAlert: false, nextTransitDurationStr: "10 mins" },
                       { id: "act-9", placeName: "Tuileries Garden", description: "Public garden located between the Louvre and the Place de la Concorde.", startTime: "16:30", endTime: "18:30", latitude: 48.8635, longitude: 2.3274, weatherCondition: "Clear", criticalWeatherAlert: false, nextTransitDurationStr: "none" }
                   ]
               }
            ]
        };

        // Pause for 3.5 seconds so the user can read the "Demo Mode Activated" message
        setTimeout(() => {
            navigate(`/trip/${mockTrip.id}`, { state: { trip: mockTrip } });
        }, 3500);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Subtle decorative background noise or pattern */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary/3 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl -z-10 -translate-x-1/2 translate-y-1/2"></div>
        
        {/* Step Indicator */}
        <div className="max-w-4xl mx-auto mb-16 flex justify-center items-center">
            <div className={`h-1 w-16 transition-colors duration-500 ${step >= 1 ? 'bg-primary' : 'bg-primary/20'}`}></div>
            <Compass className={`mx-4 w-5 h-5 transition-transform duration-700 ${step === 2 ? 'rotate-180 text-primary' : 'text-primary/40'}`} strokeWidth={1} />
            <div className={`h-1 w-16 transition-colors duration-500 ${step >= 2 ? 'bg-primary' : 'bg-primary/20'}`}></div>
        </div>

        <div className="mb-20">
            {step === 1 && (
            <Step1Logistics 
                data={formData} 
                updateData={updateFormData} 
                onNext={() => setStep(2)} 
            />
            )}

            {step === 2 && (
            <Step2Preferences 
                data={formData} 
                updateData={updateFormData} 
                onBack={() => { setStep(1); setGenerateError(''); }} 
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                generateError={generateError}
            />
            )}
        </div>
      </main>
      {/* Full Screen Loading Overlay for Generation */}
      {isGenerating && (
        <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-500">
             <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                <div className="absolute inset-0 border-t border-primary rounded-full animate-spin"></div>
                <div className="absolute inset-2 border-r border-secondary rounded-full animate-spin animation-delay-200"></div>
                <div className="absolute inset-4 border-b border-primary/40 rounded-full animate-spin animation-delay-400"></div>
                <Compass className="w-8 h-8 text-primary animate-pulse" strokeWidth={1} />
             </div>
             <h2 className="text-3xl font-serif font-bold text-primary tracking-tight mb-4">Planning your perfect trip... ✈️</h2>
             
             <div className="flex flex-col items-center">
                 <p className="font-sans text-secondary font-semibold text-xs tracking-widest uppercase transition-opacity duration-500 min-h-[20px]">
                    {loadingContexts[loadingTextIndex]}
                 </p>
                 <div className="flex gap-1.5 mt-4">
                    {[0, 1, 2].map(dot => (
                        <div 
                          key={dot} 
                          className={`w-1.5 h-1.5 rounded-full bg-primary/40 transition-all duration-300 ${dot === (loadingTextIndex % 3) ? 'scale-150 bg-secondary' : ''}`}
                        ></div>
                    ))}
                 </div>
             </div>
             
        </div>
      )}
    </div>
  );
};

export default WizardView;
