import React from 'react';
import { ArrowLeft, Sparkles, Users, Wallet, AlertTriangle } from 'lucide-react';

// Interest definitions — key matches backend INTEREST_OTM_MAP exactly
const INTERESTS = [
  { key: 'historyCulture', label: 'History & Culture' },
  { key: 'nature',         label: 'Nature'            },
  { key: 'entertainment',  label: 'Entertainment'     },
  { key: 'food',           label: 'Food'              },
  { key: 'sports',         label: 'Sports'            },
  { key: 'shopping',       label: 'Shopping'          },
  { key: 'adventure',      label: 'Adventure'         },
  { key: 'relaxing',       label: 'Relaxing'          },
];

const MIN_ACTIVE = 3; // user must have at least 3 interests as Curious or Interested

const WEIGHT_LABELS = {
  0: { text: 'Not Interested', color: 'text-red-500'     },
  1: { text: 'Curious',        color: 'text-amber-500'   },
  2: { text: 'Interested',     color: 'text-emerald-500' },
};

const Step2Preferences = ({ data, updateData, onBack, onGenerate, isGenerating, generateError }) => {

  const updateInterest = (key, weight) => {
    updateData('interests', {
      ...data.interests,
      [key]: parseInt(weight)
    });
  };

  const getScore = (key) => {
    const val = data.interests[key];
    if (val === undefined || val === null) return 1;
    if (val <= 0) return 0;
    if (val >= 2) return 2;
    return val;
  };

  // Count interests that are Curious (1) or Interested (2)
  const activeCount = INTERESTS.filter(i => getScore(i.key) >= 1).length;
  const belowMinimum = activeCount < MIN_ACTIVE;


  const handleGenerate = () => {
    if (belowMinimum || !data.budget || data.budget <= 0 || data.budget > 10000000) return; // guarded, button is also disabled
    onGenerate();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full max-w-4xl mx-auto pb-20">
      <div className="mb-12 text-center">
        <h2 className="text-4xl font-serif text-primary mb-3">Design Your Trip.</h2>
        <p className="font-sans text-muted font-light">Fine-tune your interests to guide your plan.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

        {/* LEFT COL: Group & Budget */}
        <div className="lg:col-span-1 space-y-12">
          <div>
            <label className="flex items-center gap-2 font-sans text-xs uppercase tracking-widest text-primary mb-6 border-b border-primary/10 pb-2">
              <Users className="w-4 h-4" /> 4. Companions
            </label>
            <select
              value={data.groupType}
              onChange={(e) => updateData('groupType', e.target.value)}
              className="w-full bg-transparent border border-primary/20 p-4 font-sans font-light focus:outline-none focus:border-primary transition-colors appearance-none"
            >
              <option value="Solo">Solo Expedition</option>
              <option value="Couple">Couple's Retreat</option>
              <option value="Family">Family Excursion</option>
              <option value="Friends">Group of Friends</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 font-sans text-xs uppercase tracking-widest text-primary mb-6 border-b border-primary/10 pb-2">
              <Wallet className="w-4 h-4" /> 5. Trip Budget
            </label>
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-muted font-serif text-xl pointer-events-none">₹</span>
              <input
                type="number"
                min="1"
                max="10000000"
                step="500"
                value={data.budget || ''}
                onChange={(e) => {
                  const rawVal = e.target.value;
                  if (rawVal === '') {
                    updateData('budget', '');
                    return;
                  }
                  const val = parseFloat(rawVal);
                  if (!isNaN(val)) {
                    updateData('budget', val);
                  }
                }}
                onKeyDown={(e) => {
                  if (['-', 'e', 'E', '+'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                placeholder="e.g. 25000"
                className={`w-full bg-transparent border-b pl-6 pr-4 py-3 font-serif text-2xl focus:outline-none transition-colors placeholder:text-muted/30 ${
                  (!data.budget || data.budget <= 0)
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-primary/20 focus:border-primary'
                }`}
              />
            </div>
            {(!data.budget || data.budget <= 0) && (
              <p className="text-[10px] text-red-400 font-sans uppercase tracking-widest mt-2">
                Enter a budget amount greater than 0
              </p>
            )}
            {data.budget > 10000000 && (
              <p className="text-[10px] text-red-400 font-sans uppercase tracking-widest mt-2">
                Budget cannot exceed ₹1,00,00,000
              </p>
            )}
            {data.budget > 0 && data.budget <= 10000000 && (
              <p className="text-[10px] text-emerald-500 font-sans uppercase tracking-widest mt-2">
                ₹{Number(data.budget).toLocaleString('en-IN')} allocated
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COL: Interest Sliders */}
        <div className="lg:col-span-2">
          <div className="flex items-end justify-between mb-6 border-b border-primary/10 pb-2">
            <label className="block font-sans text-xs uppercase tracking-widest text-primary">
              6. Your Interests
            </label>
            <span className={`text-[10px] font-sans uppercase tracking-widest transition-colors ${belowMinimum ? 'text-red-400' : 'text-emerald-500'}`}>
              {activeCount} / {INTERESTS.length} active
            </span>
          </div>

          {/* Min-3 validation warning */}
          {belowMinimum && (
            <div className="flex items-center gap-3 mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-600">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="text-[11px] uppercase tracking-widest font-sans">
                Select at least {MIN_ACTIVE} interests as Curious or Interested to continue.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-7">
            {INTERESTS.map(({ key, label }) => {
              const score = getScore(key);
              const wl = WEIGHT_LABELS[score] ?? WEIGHT_LABELS[1];
              return (
                <div key={key} className="group">
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-serif text-lg text-primary">{label}</span>
                    <span className={`text-[10px] uppercase tracking-widest font-sans transition-colors ${wl.color}`}>
                      {wl.text}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="1"
                    value={score}
                    onChange={(e) => updateInterest(key, e.target.value)}
                    className="w-full accent-primary bg-primary/5 border border-primary/10 h-1 appearance-none rounded-none transition-all group-hover:bg-primary/20"
                  />
                </div>
              );
            })}
          </div>
        </div>


      </div>

      {/* Server-side error (e.g. date conflict from backend) */}
      {generateError && (
        <div className="mt-8 flex items-start gap-3 px-5 py-4 bg-red-50 border border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[11px] font-sans uppercase tracking-widest text-red-600 font-semibold mb-1">
              Notice
            </p>
            <p className="text-xs text-red-500 font-sans font-light">{generateError}</p>
          </div>
          <button
            onClick={onBack}
            className="text-[9px] uppercase tracking-widest text-red-500 border border-red-300 px-3 py-1.5 hover:bg-red-100 transition-colors flex-shrink-0"
          >
            Fix Dates
          </button>
        </div>
      )}

      <div className="mt-10 flex justify-between items-center border-t border-primary/10 pt-10">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-muted font-sans text-sm hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || belowMinimum || !data.budget || data.budget <= 0 || data.budget > 10000000}
          title={belowMinimum ? `Select at least ${MIN_ACTIVE} interests` : (!data.budget || data.budget <= 0 || data.budget > 10000000) ? 'Enter a valid budget' : ''}
          className="inline-flex items-center gap-2 bg-primary text-white px-10 py-4 rounded-xl font-sans font-semibold text-sm hover:bg-primary/90 transition-all duration-300 hover:shadow-lg group disabled:opacity-40 disabled:pointer-events-none"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              Creating your trip...
            </span>
          ) : (
            <>Create My Trip <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" /></>
          )}
        </button>
      </div>
    </div>
  );
};

export default Step2Preferences;
