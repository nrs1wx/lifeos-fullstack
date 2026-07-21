import React from 'react';

export type View = 
  | 'onboarding'
  | 'dashboard'
  | 'calendar'
  | 'habits'
  | 'health'
  | 'finance'
  | 'ai'
  | 'goals'
  | 'learning'
  | 'notes'
  | 'analytics'
  | 'settings';

export interface NavItem {
  id: View;
  label: string;
  icon: React.ElementType;
}
