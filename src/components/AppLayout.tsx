import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Map, 
  MessageSquare, 
  Users, 
  User, 
  LogOut, 
  Bell, 
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import NotificationCenter from './NotificationCenter';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Map className="w-5 h-5" />, label: 'Roadmaps', path: '/roadmaps' },
    { icon: <MessageSquare className="w-5 h-5" />, label: 'Messages', path: '/chat' },
    { icon: <Users className="w-5 h-5" />, label: 'Find Mentors', path: '/mentors' },
    { icon: <User className="w-5 h-5" />, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar (same as before) ... */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col fixed h-full z-30">
        <div className="p-6 flex items-center gap-2 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-100 italic font-serif">SB</div>
          <span className="font-black text-2xl tracking-tighter">SkillBridge</span>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-indigo-600'
                }`}
              >
                <div className={`${isActive ? 'text-white' : 'group-hover:text-indigo-600'}`}>
                  {item.icon}
                </div>
                <span className="font-bold text-sm uppercase tracking-wider">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-6 border-t border-gray-100 space-y-4">
          <div className="bg-indigo-50 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-bold text-indigo-900">{profile?.credits || 0}</span>
            </div>
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Credits</span>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-rose-600 transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-bold text-sm uppercase tracking-wider">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen">
        <header className="sticky top-0 z-20 bg-gray-50/80 backdrop-blur-md px-10 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">
              {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
            </h1>
            <p className="text-gray-400 text-sm font-medium mt-1">
              Welcome back, {profile?.displayName?.split(' ')[0]}!
            </p>
          </div>

          <div className="flex items-center gap-4">
            <NotificationCenter />

            <Link to="/profile" className="flex items-center gap-3 bg-white p-1.5 pr-4 border border-gray-100 rounded-2xl shadow-sm hover:border-indigo-200 transition-all">
              <img src={profile?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'} alt="Avatar" className="w-8 h-8 rounded-xl object-cover" />
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold text-gray-900 leading-none">{profile?.displayName}</div>
              </div>
            </Link>
          </div>
        </header>

        <div className="px-10 pb-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02, y: -10 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
