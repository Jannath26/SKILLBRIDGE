import React from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Zap, Target, MessageSquare, Shield, Globe } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const handleStart = async () => {
    if (user) {
      navigate('/dashboard');
    } else {
      await login();
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-indigo-100 italic-serif-headers">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">SB</div>
          <span className="font-bold text-xl tracking-tight">SkillBridge</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="text-sm font-medium hover:text-indigo-600 transition-colors uppercase tracking-wider">Features</a>
          <a href="#how-it-works" className="text-sm font-medium hover:text-indigo-600 transition-colors uppercase tracking-wider">How it works</a>
          <button 
            onClick={handleStart}
            className="bg-gray-900 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-all transform hover:scale-105"
          >
            {user ? 'Go to Dashboard' : 'Get Started'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-widest mb-6"
        >
          AI-Powered Learning Economy
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8"
        >
          MASTERY <span className="text-indigo-600">UNLOCKED</span><br />
          THROUGH <span className="italic font-serif font-light text-gray-400">EXCHANGE</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-gray-500 max-w-2xl mb-12"
        >
          Connect with world-class mentors, generate AI learning roadmaps, and trade skills in our dynamic credit-based economy.
        </motion.p>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <button 
            onClick={handleStart}
            className="group bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
          >
            Start Your Journey <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="bg-white border-2 border-gray-100 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all">
            See Mentor Network
          </button>
        </motion.div>
      </header>

      {/* Stats/Social Proof */}
      <section className="bg-gray-50 py-16 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Active Learners', value: '12K+' },
            { label: 'Expert Mentors', value: '450+' },
            { label: 'Skills Exchanged', value: '85K' },
            { label: 'Credits Earned', value: '1.2M' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-black text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm font-medium text-gray-500 uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-5xl font-black tracking-tighter mb-4 leading-none">BUILT FOR THE FUTURE OF <span className="text-indigo-600">KNOWLEDGE</span></h2>
            <p className="text-xl text-gray-500">Every feature is designed to accelerate your growth and build real connections.</p>
          </div>
          <div className="flex gap-2">
            <div className="w-12 h-1 bg-indigo-600"></div>
            <div className="w-4 h-1 bg-gray-200"></div>
            <div className="w-4 h-1 bg-gray-200"></div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { 
              icon: <Zap className="w-6 h-6" />, 
              title: "AI Roadmaps", 
              desc: "Generate personalized learning paths instantly with Gemini AI integration.",
              color: "bg-amber-100 text-amber-700" 
            },
            { 
              icon: <Target className="w-6 h-6" />, 
              title: "Skill Exchange", 
              desc: "Earn credits by mentoring others and spend them to learn something new.",
              color: "bg-indigo-100 text-indigo-700"
            },
            { 
              icon: <MessageSquare className="w-6 h-6" />, 
              title: "Realtime Chat", 
              desc: "Connect directly with mentors via our encrypted realtime messaging system.",
              color: "bg-emerald-100 text-emerald-700"
            },
            { 
              icon: <Shield className="w-6 h-6" />, 
              title: "Verified Mentors", 
              desc: "Every mentor is vetted and rated by the community to ensure quality.",
              color: "bg-rose-100 text-rose-700"
            },
            { 
              icon: <Globe className="w-6 h-6" />, 
              title: "Global Network", 
              desc: "Learn from experts across the globe in any timezone.",
              color: "bg-cyan-100 text-cyan-700"
            },
            { 
              icon: <Zap className="w-6 h-6" />, 
              title: "XP & Rewards", 
              desc: "Gamified learning system with badges, streaks, and leaderboards.",
              color: "bg-purple-100 text-purple-700"
            },
          ].map((feature, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -5 }}
              className="p-8 bg-white border border-gray-100 rounded-3xl hover:shadow-2xl hover:shadow-indigo-50 transition-all group"
            >
              <div className={`w-12 h-12 ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-gray-500">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12 border-b border-gray-800 pb-12 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold">SB</div>
              <span className="font-bold text-2xl tracking-tight">SkillBridge</span>
            </div>
            <p className="text-gray-400 max-w-sm">Elevating the way the world learns through collaboration and AI.</p>
          </div>
          <div className="flex gap-12 text-sm">
            <div className="flex flex-col gap-3">
              <span className="font-bold uppercase tracking-widest text-indigo-400">Platform</span>
              <a href="#" className="hover:text-indigo-400">Roadmaps</a>
              <a href="#" className="hover:text-indigo-400">Mentors</a>
              <a href="#" className="hover:text-indigo-400">Community</a>
            </div>
            <div className="flex flex-col gap-3">
              <span className="font-bold uppercase tracking-widest text-indigo-400">Company</span>
              <a href="#" className="hover:text-indigo-400">About</a>
              <a href="#" className="hover:text-indigo-400">Careers</a>
              <a href="#" className="hover:text-indigo-400">Privacy</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto flex justify-between items-center text-gray-500 text-xs">
          <span>© 2026 SkillBridge. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="#">Twitter</a>
            <a href="#">LinkedIn</a>
            <a href="#">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
