import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../services/firebase';
import Navbar from '../components/Navbar';
import Step1Logistics from '../components/Wizard/Step1Logistics';
import Step2Preferences from '../components/Wizard/Step2Preferences';
import { Compass } from 'lucide-react';

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
    groupType: 'Couple',
    budgetType: 'Normal',
    budget: 5000,
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
      const response = await axios.post('https://caring-analysis-production-2d57.up.railway.app/api/v1/trips/generate', payload);
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
        setGenerateError('Orchestration pipeline failed. Ensure your Spring Boot backend is running on port 8080.');
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
