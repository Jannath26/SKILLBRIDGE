import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { UserCheck, UserX, Clock, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function MentorshipRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'mentorships'),
      where('mentorId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      try {
        const reqs = await Promise.all(snap.docs.map(async (d) => {
          const data = d.data();
          const learnerSnap = await getDoc(doc(db, 'users', data.learnerId));
          return { id: d.id, ...data, learner: learnerSnap.data() };
        }));
        setRequests(reqs);
      } catch (err) {
        console.error("Error processing mentorship requests:", err);
      }
    }, (error) => {
      console.error("Mentorship requests listener error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAction = async (requestId: string, status: 'accepted' | 'declined', learnerId: string) => {
    await updateDoc(doc(db, 'mentorships', requestId), { status });
    
    if (status === 'accepted') {
      // Create a conversation
      const convosRef = collection(db, 'conversations');
      await addDoc(convosRef, {
        participants: [user?.uid, learnerId],
        updatedAt: serverTimestamp(),
        lastMessage: {
          text: 'Mentorship connection established!',
          senderId: 'system',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Notify learner
    await addDoc(collection(db, 'notifications'), {
      userId: learnerId,
      type: 'mentorship_request',
      title: `Mentorship ${status.toUpperCase()}`,
      message: status === 'accepted' 
        ? `${user?.displayName} accepted your request! You can now start chatting.` 
        : `${user?.displayName} declined your request.`,
      read: false,
      createdAt: serverTimestamp()
    });
  };

  if (requests.length === 0) return null;

  return (
    <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm mb-10 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8">
         <div className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            {requests.length} New Requests
         </div>
      </div>

      <h3 className="text-2xl font-black uppercase tracking-tighter mb-8 leading-none italic font-serif">Inbound Connections</h3>
      
      <div className="space-y-4">
        {requests.map((req) => (
          <motion.div 
            key={req.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-6 bg-gray-50 border border-gray-100 rounded-3xl group hover:border-indigo-200 transition-all"
          >
            <div className="flex items-center gap-4">
              <img src={req.learner?.photoURL} alt="" className="w-14 h-14 rounded-2xl border-2 border-white shadow-sm" />
              <div>
                <h4 className="font-bold text-gray-900 leading-none">{req.learner?.displayName}</h4>
                <div className="flex items-center gap-2 mt-2">
                   <Clock className="w-3 h-3 text-gray-400" />
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                     Requested {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString() : 'recently'}
                   </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleAction(req.id, 'declined', req.learnerId)}
                className="p-3 bg-white text-rose-500 border border-gray-100 rounded-2xl hover:bg-rose-50 hover:border-rose-100 transition-all"
              >
                <UserX className="w-5 h-5" />
              </button>
              <button 
                onClick={() => handleAction(req.id, 'accepted', req.learnerId)}
                className="flex items-center gap-3 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
              >
                Accept <UserCheck className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
