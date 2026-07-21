import React, { useState } from 'react';
import { Bot, ArrowRight, MapPin, Check } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const ALL_MODULES = [
  'Goals', 'Habits', 'Calendar', 'Health', 'Finance', 'Notes', 'Learning'
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  
  // State for selections
  const [timezone, setTimezone] = useState('utc-5');
  const [selectedModules, setSelectedModules] = useState<string[]>(ALL_MODULES);
  const [firstGoal, setFirstGoal] = useState('');

  const toggleModule = (mod: string) => {
    setSelectedModules(prev => 
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-[480px] bg-surface rounded-[16px] border border-outline-variant shadow-sm flex flex-col min-h-[500px]">
        
        <div className="pt-8 sm:pt-10 px-5 sm:px-10 pb-4 flex flex-col items-center gap-6">
          <div className="flex items-center justify-center w-12 h-12 bg-primary-container text-on-primary-container rounded-xl">
            <Bot className="w-6 h-6" />
          </div>
          
          {/* Progress bar */}
          <div className="w-full flex items-center gap-2">
            {[1, 2, 3, 4].map(s => (
              <div 
                key={s} 
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${s <= step ? 'bg-primary' : 'bg-surface-variant'}`} 
              />
            ))}
          </div>
        </div>

        <div className="flex-1 relative px-5 sm:px-10 pb-6 sm:pb-10 flex flex-col">
          
          {step === 1 && (
            <div className="flex flex-col h-full flex-1">
              <div className="flex-1">
                <h2 className="text-[24px] font-heading font-semibold text-on-surface mb-1 text-center">Timezone</h2>
                <p className="text-[14px] text-on-surface-variant text-center mb-6">For accurate calendar and notification syncing.</p>
                <div className="space-y-4">
                  <select 
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-surface border border-outline-variant text-on-surface text-[14px] rounded-lg py-3 px-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="utc-8">Pacific Time (PT) UTC-8</option>
                    <option value="utc-5">Eastern Time (ET) UTC-5</option>
                    <option value="utc+0">London (GMT) UTC+0</option>
                    <option value="utc+3">Moscow (MSK) UTC+3</option>
                    <option value="utc+5">Almaty (ALMT) UTC+5</option>
                  </select>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-surface-container-low border border-surface-variant">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-[13px] text-on-surface">Selected timezone helps us configure daily resets.</span>
                  </div>
                </div>
              </div>
              <div className="mt-10 pt-6 border-t border-outline-variant flex justify-end">
                <button onClick={() => setStep(2)} className="w-full bg-primary text-on-primary font-medium text-[14px] py-3 rounded-lg hover:opacity-90 transition-opacity">CONTINUE</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col h-full flex-1">
              <div className="flex-1">
                <h2 className="text-[24px] font-heading font-semibold text-on-surface mb-1 text-center">Choose your modules</h2>
                <p className="text-[14px] text-on-surface-variant text-center mb-6">Select the tools you want to activate.</p>
                <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1">
                  {ALL_MODULES.map((mod) => (
                    <label key={mod} className="flex items-center gap-3 p-3 border border-outline-variant rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors">
                      <input 
                        type="checkbox" 
                        checked={selectedModules.includes(mod)}
                        onChange={() => toggleModule(mod)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant" 
                      />
                      <span className="text-[13px] font-medium text-on-surface">{mod}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-10 pt-6 border-t border-outline-variant flex gap-4">
                <button onClick={() => setStep(1)} className="flex-1 border border-outline-variant font-medium text-[14px] py-3 rounded-lg hover:bg-surface-variant transition-colors">BACK</button>
                <button onClick={() => setStep(3)} className="flex-1 bg-primary text-on-primary font-medium text-[14px] py-3 rounded-lg hover:opacity-90 transition-opacity">CONTINUE</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col h-full flex-1">
              <div className="flex-1">
                <h2 className="text-[24px] font-heading font-semibold text-on-surface mb-1 text-center">Your First Goal</h2>
                <p className="text-[14px] text-on-surface-variant text-center mb-6">What is one thing you want to achieve?</p>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="e.g. Run a marathon"
                    value={firstGoal}
                    onChange={(e) => setFirstGoal(e.target.value)}
                    className="w-full bg-surface border border-outline-variant text-on-surface text-[14px] rounded-lg py-3 px-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="mt-10 pt-6 border-t border-outline-variant flex gap-4">
                <button onClick={() => setStep(2)} className="flex-1 border border-outline-variant font-medium text-[14px] py-3 rounded-lg hover:bg-surface-variant transition-colors">BACK</button>
                <button 
                  onClick={() => setStep(4)} 
                  disabled={!firstGoal.trim()}
                  className="flex-1 bg-primary text-on-primary font-medium text-[14px] py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  CONTINUE
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col h-full flex-1">
              <div className="flex-1 flex flex-col justify-center items-center text-center">
                <div className="w-16 h-16 bg-secondary-container text-on-secondary-container rounded-full flex items-center justify-center mb-6">
                  <Check className="w-8 h-8" />
                </div>
                <h2 className="text-[32px] font-heading font-bold text-on-surface mb-2">You're all set.</h2>
                <div className="text-[14px] text-on-surface-variant space-y-2">
                  <p><strong>Timezone:</strong> {timezone.toUpperCase()}</p>
                  <p><strong>Modules:</strong> {selectedModules.length} activated</p>
                  <p><strong>Goal:</strong> "{firstGoal}"</p>
                </div>
              </div>
              <div className="mt-10 pt-6 border-t border-outline-variant flex gap-4">
                <button onClick={() => setStep(3)} className="flex-1 border border-outline-variant font-medium text-[14px] py-3 rounded-lg hover:bg-surface-variant transition-colors">BACK</button>
                <button onClick={onComplete} className="flex-1 bg-primary text-on-primary font-medium text-[14px] py-3 rounded-lg hover:opacity-90 transition-opacity">
                  ENTER LIFEOS
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
