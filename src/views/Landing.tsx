import React from 'react';
import { ArrowRight, Brain, Database, Shield, Sparkles } from 'lucide-react';

interface LandingProps {
  onEnter: () => void;
}

export function Landing({ onEnter }: LandingProps) {
  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col font-sans selection:bg-primary/20 overflow-x-hidden">
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-20 border-b border-outline-variant/50 bg-background/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-lg shadow-primary/20">
              <Brain className="w-6 h-6" />
            </div>
            <span className="font-heading font-bold text-[22px] tracking-tight">LifeOS</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[14px] font-medium text-on-surface-variant">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-4">
            <button className="hidden sm:block text-[14px] font-medium text-on-surface-variant hover:text-on-surface transition-colors">
              Log in
            </button>
            <button 
              onClick={onEnter}
              className="bg-primary text-on-primary px-4 sm:px-5 py-2.5 rounded-full text-[14px] font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 flex items-center gap-2 whitespace-nowrap"
            >
              Open App <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 pt-32 pb-20">
        <section className="px-4 sm:px-6 py-16 md:py-32 max-w-5xl mx-auto text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none -z-10" />
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-outline-variant text-[12px] font-mono font-medium text-primary mb-8 animate-in fade-in slide-in-from-bottom-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Introducing LifeOS 2.0</span>
          </div>
          
          <h1 className="text-[40px] sm:text-[48px] md:text-[72px] font-heading font-extrabold leading-[1.1] tracking-tight mb-8 animate-in fade-in slide-in-from-bottom-6 [animation-delay:100ms] fill-mode-both">
            Your personal LifeOS,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">backed by your own data.</span>
          </h1>
          
          <p className="text-[18px] md:text-[22px] text-on-surface-variant max-w-2xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 [animation-delay:200ms] fill-mode-both">
            Goals, habits, finances, health, calendar, notes, and learning in one focused full-stack app with a real backend.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 [animation-delay:300ms] fill-mode-both">
            <button 
              onClick={onEnter}
              className="w-full sm:w-auto bg-primary text-on-primary px-8 py-4 rounded-full text-[16px] font-bold hover:opacity-90 transition-opacity shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
            >
              Enter App <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 bg-surface-container-lowest border-y border-outline-variant/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-[32px] md:text-[40px] font-heading font-bold mb-4">Everything you need</h2>
              <p className="text-[16px] text-on-surface-variant">Replaces Notion, Mint, Apple Health, and Todoist.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: Brain, title: 'Context-Aware Assistant', desc: 'The assistant can use only the LifeOS data categories you allow in Settings.' },
                { icon: Database, title: 'Backend Storage', desc: 'Records are stored through Express, Prisma, and SQLite instead of browser-only state.' },
                { icon: Shield, title: 'Explicit Data Access', desc: 'AI requests use server-side summaries and respect per-module privacy controls.' }
              ].map((f, i) => (
                <div key={i} className="bg-surface border border-outline-variant rounded-2xl p-8 hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                    <f.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-[20px] font-bold mb-3">{f.title}</h3>
                  <p className="text-[15px] text-on-surface-variant leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-surface-container-lowest border-t border-outline-variant py-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-on-surface-variant text-[14px]">
          <p>© 2026 LifeOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
