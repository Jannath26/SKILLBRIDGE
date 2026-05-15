import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Star, 
  MessageCircle, 
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Filter,
  Plus,
  Github,
  Twitter,
  Linkedin,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

export default function MentorDiscovery() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const [requestSending, setRequestSending] = useState<string | null>(null);

  const { data: mentors, isLoading } = useQuery({
    queryKey: ['mentors'],
    queryFn: async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'mentor'));
      const snap = await getDocs(q);
      // Filter out the current user so they don't see themselves in the discovery list
      return snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((m: any) => m.uid !== user?.uid);
    },
    enabled: !!user
  });

  const handleMessageMentor = async (mentorId: string) => {
    if (!user) return;

    try {
      // Check if conversation already exists
      const convosRef = collection(db, 'conversations');
      const q = query(
        convosRef, 
        where('participants', 'array-contains', user.uid)
      );
      
      const snap = await getDocs(q);
      let conversationId = null;

      const existingConvo = snap.docs.find(doc => {
        const data = doc.data();
        return data.participants.includes(mentorId);
      });

      if (existingConvo) {
        conversationId = existingConvo.id;
      } else {
        // Create new conversation
        const newConvo = await addDoc(collection(db, 'conversations'), {
          participants: [user.uid, mentorId],
          lastMessage: {
            text: 'Started a new conversation',
            senderId: user.uid,
            timestamp: new Date().toISOString()
          },
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        conversationId = newConvo.id;
      }

      navigate(`/chat?id=${conversationId}`);
    } catch (err) {
      console.error("Failed to start conversation:", err);
    }
  };

  const sendRequestMutation = useMutation({
    mutationFn: async (mentorId: string) => {
      setRequestSending(mentorId);
      const request = {
        mentorId,
        learnerId: user?.uid,
        status: 'pending',
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'mentorships'), request);
      
      // Also create a conversation if it doesn't exist
      // Simplified: Just add notification
      await addDoc(collection(db, 'notifications'), {
        userId: mentorId,
        type: 'mentorship_request',
        title: 'New Connection Request',
        message: `${user?.displayName} wants to connect with you.`,
        read: false,
        createdAt: serverTimestamp()
      });
    },
    onSuccess: () => {
      setRequestSending(null);
      queryClient.invalidateQueries({ queryKey: ['mentorships'] });
    }
  });

  const filteredMentors = mentors?.filter((m: any) => 
    m.displayName.toLowerCase().includes(filter.toLowerCase()) ||
    m.skills?.some((s: string) => s.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">Mentor Network</h2>
          <p className="text-gray-400 text-sm font-medium mt-1">Connect with industry leaders and accelerate your growth</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="w-5 h-5 absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by skill or name..." 
              className="w-full bg-white border border-gray-100 pl-14 pr-6 py-4 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <button className="p-4 bg-white border border-gray-100 rounded-2xl text-gray-500 hover:text-indigo-600 transition-all shadow-sm">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading ? (
          [1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm animate-pulse h-80" />
          ))
        ) : filteredMentors?.map((mentor: any) => (
          <motion.div 
            key={mentor.id}
            whileHover={{ y: -8 }}
            className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:shadow-indigo-100/30 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8">
               <ShieldCheck className="w-6 h-6 text-indigo-100 group-hover:text-indigo-200 transition-colors" />
            </div>

            <div className="flex items-center gap-6 mb-8">
               <div className="relative">
                 <img src={mentor.photoURL} alt={mentor.displayName} className="w-20 h-20 rounded-[2rem] object-cover bg-gray-100 border-2 border-white shadow-lg" />
                 <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white"></div>
               </div>
               <div>
                  <h3 className="text-xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors leading-none uppercase tracking-tight">
                    {mentor.displayName}
                  </h3>
                  <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-2 flex items-center gap-1">
                    {mentor.professionalTitle || 'Knowledge Specialist'}
                  </div>
                  <div className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tight">
                    {mentor.availability || 'Flexible Schedule'}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                      <span className="text-[10px] font-black text-gray-900 ml-1">5.0</span>
                    </div>
                    <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase">
                      {mentor.hourlyRate || 0} Cr/hr
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    {mentor.githubUrl && (
                      <a href={mentor.githubUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-900 transition-colors">
                        <Github className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {mentor.twitterUrl && (
                      <a href={mentor.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-900 transition-colors">
                        <Twitter className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {mentor.linkedinUrl && (
                      <a href={mentor.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-900 transition-colors">
                        <Linkedin className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
               </div>
            </div>

            <p className="text-sm text-gray-500 mb-8 line-clamp-2 leading-relaxed">
               {mentor.bio || "Passionate about teaching modern web architecture and design systems. Helping mentees unlock their full potential."}
            </p>

            <div className="flex flex-wrap gap-2 mb-10">
               {mentor.skills?.slice(0, 3).map((skill: string) => (
                 <span key={skill} className="px-4 py-1.5 bg-gray-50 text-[10px] font-bold text-gray-500 rounded-full uppercase tracking-widest border border-gray-100">
                   {skill}
                 </span>
               ))}
               {(mentor.skills?.length || 0) > 3 && (
                 <span className="px-4 py-1.5 bg-indigo-50 text-[10px] font-bold text-indigo-600 rounded-full uppercase tracking-widest border border-indigo-100">
                   +{mentor.skills.length - 3} More
                 </span>
               )}
            </div>

            <div className="grid grid-cols-2 gap-4">
               <button 
                 onClick={() => handleMessageMentor(mentor.id)}
                 className="flex items-center justify-center gap-2 py-4 px-4 bg-gray-50 text-gray-900 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all"
               >
                 <MessageCircle className="w-4 h-4" /> Message
               </button>
               <button 
                 disabled={requestSending === mentor.id}
                 onClick={() => sendRequestMutation.mutate(mentor.id)}
                 className="flex items-center justify-center gap-2 py-4 px-4 bg-indigo-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
               >
                 {requestSending === mentor.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Request
               </button>
            </div>
          </motion.div>
        ))}
      </div>

      {!isLoading && filteredMentors?.length === 0 && (
        <div className="py-24 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-[2rem] flex items-center justify-center text-gray-300 mb-6">
              <Users className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-2 leading-none">No Experts Found</h3>
            <p className="text-gray-400 font-medium max-w-sm mb-8">Try adjusting your search criteria or explore our featured talent pool.</p>
            <button 
              onClick={() => setFilter('')}
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest"
            >
              Clear Filters
            </button>
        </div>
      )}
    </AppLayout>
  );
}
