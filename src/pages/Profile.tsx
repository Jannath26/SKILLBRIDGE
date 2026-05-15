import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  User as UserIcon, 
  Mail, 
  Github, 
  Twitter, 
  Linkedin, 
  Save, 
  CheckCircle,
  Plus,
  X,
  Award,
  Zap,
  TrendingUp,
  Layout
} from 'lucide-react';
import { motion } from 'motion/react';

export default function Profile() {
  const { profile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  
  const [formData, setFormData] = useState({
    displayName: '',
    professionalTitle: '',
    bio: '',
    role: 'learner',
    skills: [],
    specialties: [],
    interests: [],
    hourlyRate: 0,
    availability: '',
    githubUrl: '',
    twitterUrl: '',
    linkedinUrl: ''
  });

  // Sync formData with profile when it loads
  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        professionalTitle: profile.professionalTitle || '',
        bio: profile.bio || '',
        role: profile.role || 'learner',
        skills: profile.skills || [],
        specialties: profile.specialties || [],
        interests: profile.interests || [],
        hourlyRate: profile.hourlyRate || 0,
        availability: profile.availability || '',
        githubUrl: profile.githubUrl || '',
        twitterUrl: profile.twitterUrl || '',
        linkedinUrl: profile.linkedinUrl || ''
      });
    }
  }, [profile?.uid]); // Only reset when the user identity changes (mount/login)

  const handleSave = async () => {
    if (!profile?.uid) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        ...formData,
        updatedAt: serverTimestamp()
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      
      const auth = profile; // Use existing profile for auth info
      const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        operationType: 'update',
        path: `users/${profile.uid}`,
        authInfo: {
          userId: profile.uid,
          email: profile.email,
          role: profile.role
        }
      };
      console.error('Firestore Error Detail:', JSON.stringify(errInfo));
    } finally {
      setIsSaving(false);
    }
  };

  const addSkill = () => {
    if (newSkill && !formData.skills.includes(newSkill)) {
      setFormData({...formData, skills: [...formData.skills, newSkill]});
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({...formData, skills: formData.skills.filter((s: string) => s !== skill)});
  };

  return (
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Profile Card */}
        <div className="space-y-8">
           <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 text-center shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-32 bg-indigo-600/5 group-hover:h-full transition-all duration-700"></div>
              <div className="relative z-10">
                <div className="relative inline-block mb-6">
                  <img src={profile?.photoURL} alt="" className="w-32 h-32 rounded-[3rem] object-cover border-4 border-white shadow-xl" />
                  <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-3 rounded-2xl shadow-lg border-4 border-white">
                    <UserIcon className="w-5 h-5" />
                  </div>
                </div>
                <h2 className="text-3xl font-black tracking-tighter uppercase leading-none mb-2">{profile?.displayName}</h2>
                <p className="text-xs font-bold text-gray-400 border border-gray-100 px-4 py-1 rounded-full uppercase tracking-widest inline-block">{profile?.role}</p>
                
                <div className="flex justify-center gap-3 mt-6">
                  {profile?.githubUrl && (
                    <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-gray-50 text-gray-900 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
                      <Github className="w-4 h-4" />
                    </a>
                  )}
                  {profile?.twitterUrl && (
                    <a href={profile.twitterUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-gray-50 text-gray-900 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                  {profile?.linkedinUrl && (
                    <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-gray-50 text-gray-900 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 mt-8">
                   <div className="bg-gray-50 p-4 rounded-3xl text-left border border-gray-100">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Credits</div>
                      <div className="text-xl font-black text-indigo-600 flex items-center gap-1">
                        <Zap className="w-4 h-4" /> {profile?.credits}
                      </div>
                   </div>
                </div>
              </div>
           </div>


        </div>

        {/* Edit Section */}
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-sm">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black tracking-tighter uppercase leading-none">Identity Configuration</h3>
                <button 
                  onClick={handleSave}
                  className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest flex items-center gap-2 transition-all hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                >
                  {success ? <><CheckCircle className="w-5 h-5" /> Saved</> : isSaving ? 'Saving...' : <><Save className="w-5 h-5" /> Update Profile</>}
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">Full Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-50 border-none px-6 py-4 rounded-2xl font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                    value={formData.displayName}
                    onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">Professional Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Senior Frontend Developer"
                    className="w-full bg-gray-50 border-none px-6 py-4 rounded-2xl font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                    value={formData.professionalTitle}
                    onChange={(e) => setFormData({...formData, professionalTitle: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">Role</label>
                  <select 
                    className="w-full bg-gray-50 border-none px-6 py-4 rounded-2xl font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all appearance-none shadow-inner"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="learner">Learner</option>
                    <option value="mentor">Mentor</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 mb-8">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">Short Bio</label>
                <textarea 
                  rows={4}
                  className="w-full bg-gray-50 border-none px-6 py-4 rounded-2xl font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner resize-none"
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                />
              </div>

              <div className="space-y-4 mb-8">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">Skills Architecture</label>
                <div className="flex gap-2 mb-4">
                  <input 
                    type="text" 
                    placeholder="Add a skill (e.g. React, Python)" 
                    className="flex-1 bg-gray-50 border-none px-6 py-4 rounded-2xl font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                  />
                  <button onClick={addSkill} className="px-6 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all">
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.skills?.map((skill: string) => (
                    <div key={skill} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 border border-indigo-100">
                      {skill}
                      <button onClick={() => removeSkill(skill)}><X className="w-3 h-3 hover:text-rose-600 transition-colors" /></button>
                    </div>
                  ))}
                </div>
              </div>

              {formData.role === 'mentor' && (
                <div className="mt-12 p-8 bg-indigo-50/30 rounded-[2rem] border border-indigo-100/50">
                  <h4 className="text-sm font-black tracking-tighter uppercase mb-6 flex items-center gap-2 text-indigo-900">
                    <Zap className="w-4 h-4" /> Professional Settings
                  </h4>
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">Hourly Rate (Credits)</label>
                      <input 
                        type="number" 
                        className="w-full bg-white border-none px-6 py-4 rounded-2xl font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                        value={formData.hourlyRate}
                        onChange={(e) => setFormData({...formData, hourlyRate: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">Availability Schedule</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Mon-Fri, 9am-5pm EST"
                        className="w-full bg-white border-none px-6 py-4 rounded-2xl font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                        value={formData.availability}
                        onChange={(e) => setFormData({...formData, availability: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="h-px bg-gray-100 my-10"></div>

              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Connected Nodes</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-3xl border border-gray-100/50">
                    <a 
                      href={formData.githubUrl || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`p-3 bg-gray-900 text-white rounded-2xl transition-all ${formData.githubUrl ? 'hover:bg-indigo-600 cursor-pointer' : 'cursor-default opacity-50'}`}
                      onClick={(e) => !formData.githubUrl && e.preventDefault()}
                    >
                      <Github className="w-5 h-5" />
                    </a>
                    <div className="flex-1">
                      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-0.5">GitHub Integration</div>
                      <input 
                        type="text" 
                        placeholder="https://github.com/your-username"
                        className="w-full bg-transparent border-none p-0 font-bold text-xs text-gray-900 focus:ring-0 placeholder:text-gray-300"
                        value={formData.githubUrl}
                        onChange={(e) => setFormData({...formData, githubUrl: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-3xl border border-gray-100/50">
                    <a 
                      href={formData.twitterUrl || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`p-3 bg-gray-900 text-white rounded-2xl transition-all ${formData.twitterUrl ? 'hover:bg-indigo-600 cursor-pointer' : 'cursor-default opacity-50'}`}
                      onClick={(e) => !formData.twitterUrl && e.preventDefault()}
                    >
                      <Twitter className="w-5 h-5" />
                    </a>
                    <div className="flex-1">
                      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-0.5">X / Twitter Node</div>
                      <input 
                        type="text" 
                        placeholder="https://x.com/your-handle"
                        className="w-full bg-transparent border-none p-0 font-bold text-xs text-gray-900 focus:ring-0 placeholder:text-gray-300"
                        value={formData.twitterUrl}
                        onChange={(e) => setFormData({...formData, twitterUrl: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-3xl border border-gray-100/50">
                    <a 
                      href={formData.linkedinUrl || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`p-3 bg-gray-900 text-white rounded-2xl transition-all ${formData.linkedinUrl ? 'hover:bg-indigo-600 cursor-pointer' : 'cursor-default opacity-50'}`}
                      onClick={(e) => !formData.linkedinUrl && e.preventDefault()}
                    >
                      <Linkedin className="w-5 h-5" />
                    </a>
                    <div className="flex-1">
                      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-0.5">LinkedIn Career Hub</div>
                      <input 
                        type="text" 
                        placeholder="https://linkedin.com/in/your-profile"
                        className="w-full bg-transparent border-none p-0 font-bold text-xs text-gray-900 focus:ring-0 placeholder:text-gray-300"
                        value={formData.linkedinUrl}
                        onChange={(e) => setFormData({...formData, linkedinUrl: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>
           </div>
        </div>
      </div>
    </AppLayout>
  );
}
