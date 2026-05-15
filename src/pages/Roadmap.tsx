import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import { generateLearningRoadmap } from '../services/geminiService';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  Map as MapIcon, 
  ArrowRight, 
  Sparkles, 
  Loader2,
  BookOpen,
  Target,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function Roadmap() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    skill: '',
    currentLevel: 'Beginner',
    targetLevel: 'Expert'
  });

  const [selectedRoadmap, setSelectedRoadmap] = useState<any>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [stepResources, setStepResources] = useState<any[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(false);

  const toggleMilestone = async (stepIdx: number, milestone: string) => {
    if (!selectedRoadmap) return;

    const newSteps = [...selectedRoadmap.steps];
    const step = { ...newSteps[stepIdx] };
    const completed = step.completedMilestones || [];
    
    if (completed.includes(milestone)) {
      step.completedMilestones = completed.filter((m: string) => m !== milestone);
    } else {
      step.completedMilestones = [...completed, milestone];
    }
    
    newSteps[stepIdx] = step;

    // Calculate overall progress
    const totalMilestones = newSteps.reduce((acc, s) => acc + (s.milestones?.length || 0), 0);
    const completedMilestonesCount = newSteps.reduce((acc, s) => acc + (s.completedMilestones?.length || 0), 0);
    const progress = Math.round((completedMilestonesCount / totalMilestones) * 100);

    const updatedRoadmap = { 
      ...selectedRoadmap, 
      steps: newSteps,
      progress 
    };

    setSelectedRoadmap(updatedRoadmap);

    try {
      await updateDoc(doc(db, 'roadmaps', selectedRoadmap.id), {
        steps: newSteps,
        progress,
        updatedAt: serverTimestamp()
      });
      queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
    } catch (err) {
      console.error("Failed to update roadmap progress:", err);
    }
  };

  const fetchResourcesForStep = async (query: string) => {
    setIsLoadingResources(true);
    try {
      const resp = await fetch(`/api/resources?query=${encodeURIComponent(query)}`);
      const data = await resp.json();
      setStepResources(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingResources(false);
    }
  };

  const { data: roadmaps, isLoading } = useQuery({
    queryKey: ['roadmaps', user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(
        collection(db, 'roadmaps'), 
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    enabled: !!user
  });

  const createRoadmapMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const generatedData = await generateLearningRoadmap(
        formData.skill, 
        formData.currentLevel, 
        formData.targetLevel
      );
      
      const newRoadmap = {
        userId: user?.uid,
        skill: formData.skill,
        currentLevel: formData.currentLevel,
        targetLevel: formData.targetLevel,
        title: generatedData.title,
        steps: generatedData.steps.map((s: any) => ({
          ...s,
          completedMilestones: []
        })),
        currentStepIndex: 0,
        progress: 0,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'roadmaps'), newRoadmap);
      return newRoadmap;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
      setIsGenerating(false);
      setShowForm(false);
      setFormData({ skill: '', currentLevel: 'Beginner', targetLevel: 'Expert' });
    }
  });

  return (
    <AppLayout>
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">
            {selectedRoadmap ? selectedRoadmap.title : 'Your Evolution'}
          </h2>
          <p className="text-gray-400 text-sm font-medium mt-1">
            {selectedRoadmap 
              ? `${selectedRoadmap.skill} Path from ${selectedRoadmap.currentLevel} to ${selectedRoadmap.targetLevel}` 
              : 'Design your personalized AI-powered learning path'}
          </p>
        </div>
        <div className="flex gap-4">
          {selectedRoadmap && (
            <button 
              onClick={() => setSelectedRoadmap(null)}
              className="bg-white border border-gray-100 text-gray-500 px-6 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:text-indigo-600 transition-all shadow-sm"
            >
              Back to List
            </button>
          )}
          <button 
            onClick={() => {
              if (selectedRoadmap) setSelectedRoadmap(null);
              setShowForm(!showForm);
            }}
            className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
          >
            {showForm ? 'Cancel' : <><Plus className="w-5 h-5" /> Generate New Path</>}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedRoadmap ? (
          <motion.div 
            key="viewer"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-10"
          >
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1 space-y-4">
              {selectedRoadmap.steps.map((step: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveStepIndex(idx);
                    fetchResourcesForStep(step.searchQuery || step.title);
                  }}
                  className={`w-full p-6 text-left rounded-[2rem] border transition-all ${
                    activeStepIndex === idx 
                      ? 'bg-white border-indigo-600 shadow-xl shadow-indigo-100' 
                      : 'bg-white/50 border-gray-100 hover:border-indigo-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                      activeStepIndex === idx ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      Stage {idx + 1}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {step.estimatedWeeks} Weeks
                    </span>
                  </div>
                  <h4 className={`text-lg font-black uppercase tracking-tight leading-none ${activeStepIndex === idx ? 'text-indigo-600' : 'text-gray-900'}`}>
                    {step.title}
                  </h4>
                </button>
              ))}
            </div>

            {/* Stage Content */}
            <div className="lg:col-span-2 space-y-10">
              <div className="bg-white border border-gray-100 rounded-[3rem] p-10 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-600">
                    <MapIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter text-gray-900 leading-none">
                      {selectedRoadmap.steps[activeStepIndex].title}
                    </h3>
                    <p className="text-gray-400 text-sm font-medium mt-1">Deep Dive into {selectedRoadmap.steps[activeStepIndex].title}</p>
                  </div>
                </div>

                <p className="text-gray-600 leading-relaxed font-medium mb-10 text-lg">
                  {selectedRoadmap.steps[activeStepIndex].description}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2">
                      <Target className="w-4 h-4" /> Core Milestones
                    </h4>
                    <ul className="space-y-4">
                      {selectedRoadmap.steps[activeStepIndex].milestones.map((ms: string, i: number) => {
                        const isCompleted = selectedRoadmap.steps[activeStepIndex].completedMilestones?.includes(ms);
                        return (
                          <li 
                            key={i} 
                            className="flex items-start gap-3 group cursor-pointer"
                            onClick={() => toggleMilestone(activeStepIndex, ms)}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all ${
                              isCompleted 
                                ? 'bg-indigo-600 border-indigo-600' 
                                : 'border-indigo-100 group-hover:border-indigo-600'
                            }`}>
                              {isCompleted ? (
                                <Sparkles className="w-3 h-3 text-white" />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-indigo-600 scale-0 group-hover:scale-100 transition-transform"></div>
                              )}
                            </div>
                            <span className={`text-sm font-bold leading-tight transition-colors ${
                              isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'
                            }`}>{ms}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" /> Curated Resources
                    </h4>
                    <div className="space-y-4">
                      {isLoadingResources ? (
                        [1, 2].map(i => (
                          <div key={i} className="h-20 bg-gray-50 rounded-2xl animate-pulse" />
                        ))
                      ) : stepResources.length > 0 ? (
                        stepResources.map((res: any) => (
                          <a 
                            key={res.id} 
                            href={res.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:border-indigo-200 hover:shadow-lg transition-all group"
                          >
                            <img src={res.thumbnail} className="w-12 h-12 rounded-xl object-cover grayscale group-hover:grayscale-0 transition-all" />
                            <div className="flex-1 min-w-0">
                               <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-0.5">
                                 {res.type === 'video' ? '📺 Tutorial' : res.type === 'docs' ? '📄 Documentation' : '🚀 GitHub'}
                               </div>
                               <h5 className="text-xs font-black text-gray-900 truncate uppercase tracking-tight">
                                 {res.title}
                               </h5>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                          </a>
                        ))
                      ) : (
                        <div className="p-10 border border-dashed border-gray-200 rounded-3xl text-center">
                          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">No resources fetched yet</p>
                          <button 
                            onClick={() => fetchResourcesForStep(selectedRoadmap.steps[activeStepIndex].searchQuery || selectedRoadmap.steps[activeStepIndex].title)}
                            className="mt-4 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                          >
                            Force Discovery
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center p-8 bg-gray-900 rounded-[2.5rem] shadow-xl shadow-indigo-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center text-indigo-400">
                     <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-0.5">Step Progression</div>
                    <div className="text-white font-black italic font-serif">KNOWLEDGE ACQUIRED</div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (activeStepIndex < selectedRoadmap.steps.length - 1) {
                      const next = activeStepIndex + 1;
                      setActiveStepIndex(next);
                      fetchResourcesForStep(selectedRoadmap.steps[next].searchQuery || selectedRoadmap.steps[next].title);
                    }
                  }}
                  className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all"
                >
                  {activeStepIndex === selectedRoadmap.steps.length - 1 ? 'Path Complete' : 'Next Stage'} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            {showForm && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                className="bg-white border border-indigo-100 p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-100 mb-10"
              >
                {/* ... (rest of form logic) ... */}
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 leading-none">AI Path Conceptor</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Specify your goals for Gemini AI</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">What do you want to learn?</label>
                    <div className="relative">
                      <Search className="w-5 h-5 absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input 
                        type="text" 
                        placeholder="e.g. Quantum Computing, React, Chess..." 
                        className="w-full bg-gray-50 border-none px-14 py-5 rounded-[1.5rem] font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={formData.skill}
                        onChange={(e) => setFormData({...formData, skill: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">Current Level</label>
                    <select 
                      className="w-full bg-gray-50 border-none px-8 py-5 rounded-[1.5rem] font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                      value={formData.currentLevel}
                      onChange={(e) => setFormData({...formData, currentLevel: e.target.value})}
                    >
                      <option>Beginner</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">Target Mastery</label>
                    <select 
                      className="w-full bg-gray-50 border-none px-8 py-5 rounded-[1.5rem] font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                      value={formData.targetLevel}
                      onChange={(e) => setFormData({...formData, targetLevel: e.target.value})}
                    >
                      <option>Expert</option>
                      <option>Professional</option>
                      <option>Full Mastery</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={() => createRoadmapMutation.mutate()}
                  disabled={isGenerating || !formData.skill}
                  className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-bold text-lg flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-6 h-6 animate-spin" /> Synthesizing Path...</>
                  ) : (
                    <><Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform" /> Generate Personalized Roadmap</>
                  )}
                </button>
              </motion.div>
            )}

            <motion.div 
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {isLoading && (
                [1,2,3].map(i => (
                  <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm animate-pulse h-64" />
                ))
              )}

              {roadmaps?.map((roadmap: any) => (
                <motion.div 
                  key={roadmap.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => {
                    setSelectedRoadmap(roadmap);
                    setActiveStepIndex(0);
                    fetchResourcesForStep(roadmap.steps[0].searchQuery || roadmap.steps[0].title);
                  }}
                  className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all cursor-pointer flex flex-col group"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600">
                      <MapIcon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest border border-indigo-100">
                      {roadmap.status}
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-black tracking-tight text-gray-900 group-hover:text-indigo-600 transition-colors mb-2 uppercase leading-none">
                    {roadmap.title}
                  </h3>
                  
                  <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3" /> {roadmap.currentLevel}
                    </div>
                    <ChevronRight className="w-3 h-3" />
                    <div className="flex items-center gap-1 text-indigo-600">
                      <ArrowRight className="w-3 h-3" /> {roadmap.targetLevel}
                    </div>
                  </div>

                  <div className="mt-auto space-y-4">
                     <div className="flex items-center justify-between text-xs font-bold">
                       <span className="text-gray-400 uppercase tracking-widest">Modules</span>
                       <span className="text-gray-900">{roadmap.steps?.length} Stages</span>
                     </div>
                     <button className="w-full mt-4 py-4 bg-gray-50 text-gray-900 rounded-2xl font-bold text-xs uppercase tracking-widest group-hover:bg-indigo-600 group-hover:text-white transition-all flex items-center justify-center gap-2">
                       Continue Learning <BookOpen className="w-4 h-4" />
                     </button>
                  </div>
                </motion.div>
              ))}

              {!isLoading && roadmaps?.length === 0 && !showForm && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
                   <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-6">
                     <MapIcon className="w-10 h-10" />
                   </div>
                   <h3 className="text-2xl font-bold text-gray-900 mb-2">No roadmaps yet</h3>
                   <p className="text-gray-500 mb-8 max-w-sm">Use our AI Path Conceptor to design your first industrial-grade learning journey.</p>
                   <button 
                     onClick={() => setShowForm(true)}
                     className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest flex items-center gap-2"
                   >
                     Start Learning Now
                   </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
