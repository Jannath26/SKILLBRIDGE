import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Bell, CheckCircle2, MessageSquare, Award, Zap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Notifications listener error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_message': return <MessageSquare className="w-4 h-4 text-indigo-600" />;
      case 'roadmap_completion': return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'earned_credits': return <Zap className="w-4 h-4 text-amber-600" />;
      case 'mentorship_request': return <Award className="w-4 h-4 text-purple-600" />;
      default: return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-500 hover:text-indigo-600 transition-all shadow-sm relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 mt-4 w-96 bg-white border border-gray-100 rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Event Nexus</h3>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                  {unreadCount} New
                </span>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No signals detected</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-6 border-b border-gray-50 flex gap-4 transition-all hover:bg-gray-50 cursor-pointer ${!n.read ? 'bg-indigo-50/20' : ''}`}
                    >
                      <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                           <span className="text-xs font-bold text-gray-900 leading-none">{n.title}</span>
                           <span className="text-[9px] font-bold text-gray-400 uppercase flex items-center gap-1">
                             <Clock className="w-2 h-2" />
                             {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'just now'}
                           </span>
                        </div>
                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 text-center border-t border-gray-50">
                 <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">
                   Configure Filters
                 </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const Clock = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
