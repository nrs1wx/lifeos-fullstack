import { 
  LayoutDashboard, 
  Bot, 
  Target, 
  Repeat, 
  Calendar, 
  GraduationCap, 
  Heart, 
  CreditCard, 
  PenSquare, 
  Activity 
} from 'lucide-react';
import { NavItem } from './types';

export const navigationGroups = [
  {
    title: 'Overview',
    items: [
      { id: 'dashboard', label: 'Today', icon: LayoutDashboard },
      { id: 'ai', label: 'AI Assistant', icon: Bot },
    ] as NavItem[]
  },
  {
    title: 'Planning',
    items: [
      { id: 'goals', label: 'Goals', icon: Target },
      { id: 'habits', label: 'Habits', icon: Repeat },
      { id: 'calendar', label: 'Calendar', icon: Calendar },
      { id: 'learning', label: 'Learning', icon: GraduationCap },
    ] as NavItem[]
  },
  {
    title: 'Life',
    items: [
      { id: 'health', label: 'Health', icon: Heart },
      { id: 'finance', label: 'Finance', icon: CreditCard },
    ] as NavItem[]
  },
  {
    title: 'Other',
    items: [
      { id: 'notes', label: 'Notes', icon: PenSquare },
      { id: 'analytics', label: 'Analytics', icon: Activity },
    ] as NavItem[]
  }
];

export const mobileNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Today', icon: LayoutDashboard },
  { id: 'ai', label: 'AI', icon: Bot },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'health', label: 'Health', icon: Heart },
  { id: 'habits', label: 'Habits', icon: Repeat },
];
