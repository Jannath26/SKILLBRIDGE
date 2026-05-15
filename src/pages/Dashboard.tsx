import React from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import MentorshipRequests from '../components/MentorshipRequests';
import { 
  Zap, 
  Map, 
  Users, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Award,
  ArrowUpRight,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

import { useQuery } from '@tanstack/react-query';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export default function Dashboard() {
  const { user, profile } = useAuth();

  const { data: activeRoadmaps, isLoading: loadingRoadmaps } = useQuery({
    queryKey: ['active-roadmaps', user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(
        collection(db, 'roadmaps'),
        where('userId', '==', user.uid),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(2)
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    enabled: !!user
  });

  const { data: mentorships, isLoading: loadingMentorships } = useQuery({
    queryKey: ['mentorships-count', user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(
        collection(db, 'mentorships'),
        where(profile?.role === 'mentor' ? 'mentorId' : 'learnerId', '==', user.uid),
        where('status', '==', 'accepted')
      );
      const snap = await getDocs(q);
      return snap.docs.length;
    },
    enabled: !!user && !!profile
  });

  const { data: recommendedMentors, isLoading: loadingMentors } = useQuery({
    queryKey: ['recommended-mentors', profile?.skills],
    queryFn: async () => {
      if (!user) return [];
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'mentor'),
        limit(10)
      );
      const snap = await getDocs(q);
      const mentors = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((m: any) => m.uid !== user.uid);

      if (profile?.skills?.length > 0) {
        return mentors.sort((a: any, b: any) => {
          const aOverlap = (a.skills || []).filter((s: string) => profile.skills.includes(s)).length;
          const bOverlap = (b.skills || []).filter((s: string) => profile.skills.includes(s)).length;
          return bOverlap - aOverlap;
        }).slice(0, 3);
      }
      
      return mentors.slice(0, 3);
    },
    enabled: !!user && !!profile
  });

  const stats = [
    { label: 'Total Credits', value: profile?.credits || 0, icon: <Zap className="w-5 h-5" />, color: 'bg-amber-50 text-amber-600' },
    { label: 'Active Roadmaps', value: activeRoadmaps?.length || 0, icon: <Map className="w-5 h-5" />, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Mentorships', value: mentorships || 0, icon: <Users className="w-5 h-5" />, color: 'bg-rose-50 text-rose-600' },
  ];

  return (
    <AppLayout>
      {/* Welcome Section */}
      <div className="mb-12">
        <h2 className="text-5xl font-black tracking-tighter uppercase leading-none mb-4 italic font-serif">
          Status: {profile?.role === 'mentor' ? 'SYNDICATE EXPERT' : 'EVOLVING LEARNER'}
        </h2>
        <p className="text-gray-400 font-medium text-lg">Welcome back, {profile?.displayName}. Your intellectual growth trajectory is steady.</p>
      </div>

      {profile?.role === 'mentor' && <MentorshipRequests />}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            whileHover={{ y: -4 }}
            className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
            <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</div>
            <div className="text-3xl font-black text-gray-900">{stat.value}</div>
          </motion.div>
        ))}

        {/* ByteStorm Logo Block */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="p-6 bg-gray-900 border border-gray-800 rounded-3xl shadow-xl shadow-indigo-100/10 transition-all flex flex-col justify-center items-center text-center group overflow-hidden relative"
        >
          <div className="relative z-10">
            <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-3 mx-auto">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Created by</div>
            <div className="text-xl font-black text-white tracking-tighter italic font-serif">BYTESTORM</div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Roadmaps */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">Your Progress</h2>
              <p className="text-gray-400 text-sm font-medium mt-1">Keep track of your learning milestones</p>
            </div>
            <Link to="/roadmaps" className="text-sm font-bold text-indigo-600 hover:underline uppercase tracking-widest">View All</Link>
          </div>

          <div className="grid gap-6">
            {loadingRoadmaps ? (
               [1,2].map(i => <div key={i} className="h-48 bg-white border border-gray-100 rounded-[2rem] animate-pulse" />)
            ) : activeRoadmaps && activeRoadmaps.length > 0 ? (
              activeRoadmaps.map((roadmap: any, i: number) => {
                const currentStep = roadmap.steps[roadmap.currentStepIndex || 0];
                const nextMilestone = currentStep?.milestones?.find((m: string) => !currentStep.completedMilestones?.includes(m)) || 'Stage Completed';
                
                return (
                  <div key={roadmap.id} className="bg-white p-8 border border-gray-100 rounded-[2rem] shadow-sm hover:border-indigo-100 transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight italic font-serif ">{roadmap.title}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <BookOpen className="w-4 h-4 text-gray-400" />
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{roadmap.skill}</span>
                        </div>
                      </div>
                      <Link to="/roadmaps" className="p-3 bg-gray-50 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <ArrowUpRight className="w-5 h-5" />
                      </Link>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">Progress</span>
                        <span className="text-sm font-black text-indigo-600">{roadmap.progress || 0}%</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${roadmap.progress || 0}%` }}
                          transition={{ delay: 0.5, duration: 1 }}
                          className="h-full bg-indigo-600"
                        />
                      </div>
                      <div className="flex items-start gap-2 bg-gray-50 p-4 rounded-2xl border border-gray-100/50">
                        <CheckCircle2 className="w-5 h-5 text-indigo-600 mt-0.5" />
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Current Milestone</div>
                          <div className="text-sm font-bold text-gray-800">{nextMilestone}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white p-10 border border-dashed border-gray-200 rounded-[2rem] text-center">
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-4">No active roadmaps found</p>
                <Link to="/roadmaps" className="text-indigo-600 font-black text-xs uppercase tracking-[0.2em] hover:underline">Start New Path</Link>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Tasks / Community */}
        <div className="space-y-8">
          {/* Become a Mentor CTA */}
          {profile?.role === 'learner' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden group cursor-pointer"
              onClick={() => window.location.href = '/profile'}
            >
              <div className="relative z-10">
                <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Share Your Skills</h3>
                <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-6">Switch to Mentor role and start earning credits today.</p>
                <div className="flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] bg-white/20 w-fit px-4 py-2 rounded-full backdrop-blur-md group-hover:bg-white group-hover:text-indigo-600 transition-all">
                  Become a Mentor <ArrowUpRight className="w-3 h-3" />
                </div>
              </div>
              <Users className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 -rotate-12 group-hover:scale-110 transition-transform" />
            </motion.div>
          )}

          {/* Daily Streak Card */}
          <div className="bg-gray-900 text-white p-8 rounded-[2rem] relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-2xl font-black italic font-serif leading-none mb-2">{profile?.streak || 0} DAY STREAK</h3>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6">
                {profile?.streak > 0 ? "You're on fire! Keep going." : "Start your learning journey today!"}
              </p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <div key={d} className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${d <= (profile?.streak % 8 || 0) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-gray-800 text-gray-600'}`}>
                    {d}
                  </div>
                ))}
              </div>
            </div>
            <Zap className="absolute -right-4 -bottom-4 w-32 h-32 text-indigo-600/20 rotate-12" />
          </div>

          {/* Recommended Mentors */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tighter uppercase leading-none">Recommended Mentors</h2>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Based on your skills</p>
            </div>
            <div className="space-y-4">
              {loadingMentors ? (
                [1,2,3].map(i => <div key={i} className="h-24 bg-white border border-gray-100 rounded-3xl animate-pulse" />)
              ) : recommendedMentors && recommendedMentors.length > 0 ? (
                recommendedMentors.map((mentor: any) => (
                  <Link 
                    key={mentor.id} 
                    to="/mentors"
                    className="bg-white p-4 border border-gray-100 rounded-3xl flex items-center gap-4 hover:border-indigo-200 transition-all group cursor-pointer shadow-sm"
                  >
                    <img 
                      src={mentor.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${mentor.displayName}`} 
                      alt={mentor.displayName} 
                      className="w-12 h-12 rounded-2xl bg-gray-50 object-cover" 
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{mentor.displayName}</h4>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          <Award className="w-3 h-3 fill-current" />
                          <span className="text-[10px] font-bold">{mentor.rating || '5.0'}</span>
                        </div>
                      </div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{mentor.professionalTitle || 'Expert'}</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                         {(mentor.skills || []).slice(0, 2).map((tag: string) => (
                           <span key={tag} className="text-[8px] font-bold bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-widest border border-gray-100">{tag}</span>
                         ))}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No matching experts found</p>
                </div>
              )}
            </div>
            <Link 
              to="/mentors"
              className="block w-full py-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-gray-50 transition-all text-center"
            >
              Discover All Experts
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
