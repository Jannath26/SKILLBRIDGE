import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import Peer from 'simple-peer';
import { db } from '../lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Video, Mic, MicOff, VideoOff, Maximize2, Minimize2, X, CheckCircle } from 'lucide-react';
import Draggable from 'react-draggable';

interface VideoCallContextType {
  callUser: (userId: string, name: string, photo?: string) => void;
  answerCall: () => void;
  leaveCall: () => void;
  isReceivingCall: boolean;
  isCalling: boolean;
  caller: string;
  callerName: string;
  callerPhoto: string;
  callAccepted: boolean;
  callEnded: boolean;
  stream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionStatus: string;
  sessionConfirmed: boolean;
  remoteSessionConfirmed: boolean;
  confirmSession: () => void;
  setConnectionStatus: React.Dispatch<React.SetStateAction<string>>;
  userVideo: React.RefObject<HTMLVideoElement | null>;
  partnerVideo: React.RefObject<HTMLVideoElement | null>;
}

const VideoCallContext = createContext<VideoCallContextType | undefined>(undefined);

export const VideoCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const { socket } = useSocket();
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerName, setCallerName] = useState("");
  const [callerPhoto, setCallerPhoto] = useState("");
  const [callerSignal, setCallerSignal] = useState<any>();
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [sessionConfirmed, setSessionConfirmed] = useState(false);
  const [remoteSessionConfirmed, setRemoteSessionConfirmed] = useState(false);
  
  const userVideo = useRef<HTMLVideoElement>(null);
  const partnerVideo = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<Peer.Instance | null>(null);
  const pendingSignals = useRef<any[]>([]);
  const creditProcessed = useRef(false);
  const profileRef = useRef(profile);
  const callAcceptedRef = useRef(callAccepted);
  const streamRef = useRef<MediaStream | null>(null);

  const resetCallState = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setIsReceivingCall(false);
    setIsCalling(false);
    setCallAccepted(false);
    setCallEnded(false);
    setStream(null);
    streamRef.current = null;
    setRemoteStream(null);
    setConnectionStatus("Connecting...");
    setSessionConfirmed(false);
    setRemoteSessionConfirmed(false);
    creditProcessed.current = false;
    connectionRef.current = null;
    pendingSignals.current = [];
  };

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    callAcceptedRef.current = callAccepted;
  }, [callAccepted]);

  const updateCredits = async () => {
    const currentProfile = profileRef.current;
    if (!currentProfile || creditProcessed.current || !callAcceptedRef.current) return;
    
    try {
      creditProcessed.current = true;
      const amount = currentProfile.role === 'mentor' ? 30 : -50;
      const userRef = doc(db, 'users', currentProfile.uid);

      // Daily Streak Logic
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let newStreak = currentProfile.streak || 0;
      let lastSessionDate = null;

      if (currentProfile.lastSessionAt) {
        const d = currentProfile.lastSessionAt.toDate ? currentProfile.lastSessionAt.toDate() : new Date(currentProfile.lastSessionAt);
        lastSessionDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      }

      if (!lastSessionDate) {
        newStreak = 1;
      } else {
        const diffTime = today.getTime() - lastSessionDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
        // If diffDays === 0, streak remains unchanged for today
      }

      await updateDoc(userRef, {
        credits: increment(amount),
        streak: newStreak,
        lastSessionAt: now,
        updatedAt: now
      });
      console.log(`Credits updated: ${amount} for ${currentProfile.role}. Streak: ${newStreak}`);
    } catch (err) {
      console.error("Failed to update credits:", err);
    }
  };

  useEffect(() => {
    if (!socket) return;

    socket.on("incoming_call", (data) => {
      console.log("Incoming call from:", data.from);
      setIsReceivingCall(true);
      setCaller(data.from);
      setCallerName(data.callerName);
      setCallerPhoto(data.callerPhoto);
      setCallerSignal(data.signal);
    });

    socket.on("call_accepted", (data) => {
      console.log("Call accepted by:", data.from);
      setIsCalling(false);
      setCallAccepted(true);
      setConnectionStatus("Establishing P2P connection...");
      if (connectionRef.current) {
        connectionRef.current.signal(data.signal);
      } else {
        console.log("Peer not ready, buffering answer");
        pendingSignals.current.push(data.signal);
      }
    });

    socket.on("receive_signal", (data) => {
      console.log("Received remote signal from:", data.from, data.signal.type || "ICE candidate");
      if (connectionRef.current) {
        try {
          connectionRef.current.signal(data.signal);
        } catch (e) {
          console.error("Error signaling peer:", e);
        }
      } else {
        console.log("Peer not ready, buffering signal");
        pendingSignals.current.push(data.signal);
      }
    });

    socket.on("call_ended", () => {
      console.log("Call ended by remote user");
      setCallEnded(true);
      if (connectionRef.current) {
        try { connectionRef.current.destroy(); } catch (e) {}
      }
      setTimeout(() => {
        resetCallState();
      }, 2000);
    });

    socket.on("session_confirmed", (data) => {
      console.log("Remote user confirmed session completion:", data.from);
      setRemoteSessionConfirmed(true);
    });

    socket.on("call_rejected", () => {
       console.log("Call rejected by remote user");
       alert("Call rejected");
       setConnectionStatus("Call rejected");
       setTimeout(() => resetCallState(), 2000);
    });

    return () => {
      socket.off("incoming_call");
      socket.off("call_accepted");
      socket.off("receive_signal");
      socket.off("call_ended");
      socket.off("session_confirmed");
      socket.off("call_rejected");
    };
  }, [socket]);


  useEffect(() => {
    if (sessionConfirmed && remoteSessionConfirmed && !creditProcessed.current) {
      updateCredits();
      alert(`Session completed! ${profile?.role === 'mentor' ? '+30 credits earned' : '-50 credits deducted'}`);
      // Auto leave after a few seconds
      setTimeout(() => {
        leaveCall();
      }, 3000);
    }
  }, [sessionConfirmed, remoteSessionConfirmed]);

  const callUser = (userId: string, name: string, photo?: string) => {
    console.log("Initiating call to:", userId);
    setIsCalling(true);
    setCallerName(name);
    setCallerPhoto(photo || "");
    setCaller(userId);
    setConnectionStatus("Waiting for answer...");
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
      setStream(currentStream);
      streamRef.current = currentStream;
      if (userVideo.current) {
        userVideo.current.srcObject = currentStream;
      }

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: currentStream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
          ]
        }
      });

      peer.on("signal", (data) => {
        console.log("Initiator signal generated:", data.type);
        socket?.emit("call_user", {
          userToCall: userId,
          signalData: data,
          from: user?.uid,
          callerName: profile?.displayName || user?.email,
          callerPhoto: profile?.photoURL || ""
        });
      });

      peer.on("connect", () => {
        console.log("P2P connection established (initiator)!");
        setConnectionStatus("Connected");
      });

      peer.on("stream", (remoteStream) => {
        console.log("Received remote stream (initiator)");
        setRemoteStream(remoteStream);
        setConnectionStatus("Connected");
      });

      peer.on("error", (err) => {
        console.error("Peer error (initiator):", err);
        setConnectionStatus("Connection failed");
      });

      connectionRef.current = peer;

      // Process buffered signals
      if (pendingSignals.current.length > 0) {
        console.log(`Processing ${pendingSignals.current.length} buffered signals for initiator`);
        pendingSignals.current.forEach(sig => peer.signal(sig));
        pendingSignals.current = [];
      }
    }).catch(err => {
      console.error("Failed to get media devices:", err);
      alert("Please allow camera and microphone access to make calls.");
    });
  };

  const answerCall = () => {
    setCallAccepted(true);
    setConnectionStatus("Establishing P2P connection...");
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
      setStream(currentStream);
      streamRef.current = currentStream;
      if (userVideo.current) {
        userVideo.current.srcObject = currentStream;
      }

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: currentStream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
          ]
        }
      });

      peer.on("signal", (data) => {
        console.log("Responder signal generated:", data.type);
        socket?.emit("answer_call", { signal: data, to: caller, from: user?.uid });
      });

      peer.on("connect", () => {
        console.log("P2P connection established (responder)!");
        setConnectionStatus("Connected");
      });

      peer.on("stream", (remoteStream) => {
        console.log("Received remote stream (responder)");
        setRemoteStream(remoteStream);
        setConnectionStatus("Connected");
      });

      peer.on("error", (err) => {
        console.error("Peer error (responder):", err);
        setConnectionStatus("Connection failed");
      });

      peer.signal(callerSignal);
      connectionRef.current = peer;

      // Process buffered signals
      if (pendingSignals.current.length > 0) {
        console.log(`Processing ${pendingSignals.current.length} buffered signals for responder`);
        pendingSignals.current.forEach(sig => peer.signal(sig));
        pendingSignals.current = [];
      }
    }).catch(err => {
      console.error("Failed to get media devices:", err);
      alert("Please allow camera and microphone access to answer calls.");
    });
  };

  const confirmSession = () => {
    if (sessionConfirmed) return;
    setSessionConfirmed(true);
    socket?.emit("confirm_session", { to: caller, from: user?.uid });
  };

  const leaveCall = async () => {
    console.log("Leaving call...");
    socket?.emit("end_call", { to: caller, from: user?.uid });
    if (connectionRef.current) {
      try { connectionRef.current.destroy(); } catch (e) {}
    }
    resetCallState();
  };

  return (
    <VideoCallContext.Provider
      value={{
        callUser,
        answerCall,
        leaveCall,
        isReceivingCall,
        isCalling,
        caller,
        callerName,
        callerPhoto,
        callAccepted,
        callEnded,
        stream,
        remoteStream,
        connectionStatus,
        sessionConfirmed,
        remoteSessionConfirmed,
        confirmSession,
        setConnectionStatus,
        userVideo,
        partnerVideo,
      }}
    >
      {children}
      <VideoCallUI />
    </VideoCallContext.Provider>
  );
};

const VideoCallUI = () => {
  const context = useContext(VideoCallContext);
  const draggableRef = useRef<HTMLDivElement>(null);
  if (!context) return null;

  const {
    isReceivingCall,
    isCalling,
    callerName,
    callerPhoto,
    answerCall,
    callAccepted,
    callEnded,
    userVideo,
    partnerVideo,
    leaveCall,
    stream,
    remoteStream,
    connectionStatus,
    sessionConfirmed,
    remoteSessionConfirmed,
    confirmSession,
  } = context;

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Attach streams to video elements
  useEffect(() => {
    if (userVideo.current && stream) {
      console.log("Attaching local stream to video element");
      userVideo.current.srcObject = stream;
    }
  }, [stream, callAccepted, isCalling, isReceivingCall, isMinimized, userVideo]);

  useEffect(() => {
    if (partnerVideo.current && remoteStream) {
      console.log("Attaching remote stream to video element");
      partnerVideo.current.srcObject = remoteStream;
    }
  }, [remoteStream, callAccepted, isMinimized, partnerVideo]);

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks()[0].enabled = isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks()[0].enabled = isVideoOff;
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <>
      {/* Incoming Call Notification */}
      <AnimatePresence>
        {isReceivingCall && !callAccepted && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-[100] w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 p-6"
          >
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                <img 
                  src={callerPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${callerName}`} 
                  className="w-20 h-20 rounded-full border-4 border-indigo-50"
                  alt=""
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{callerName}</h3>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6">Incoming Video Call...</p>
              
              <div className="flex gap-4 w-full">
                <button 
                  onClick={leaveCall}
                  className="flex-1 py-3 bg-red-50 text-red-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                >
                  <PhoneOff className="w-4 h-4" /> Decline
                </button>
                <button 
                  onClick={answerCall}
                  className="flex-1 py-3 bg-green-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                >
                  <Phone className="w-4 h-4" /> Accept
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outgoing Call Overlay */}
      <AnimatePresence>
        {isCalling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-gray-900/95 backdrop-blur-md flex flex-col items-center justify-center"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center text-center"
            >
              <div className="relative mb-8 flex items-center justify-center">
                <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20" />
                <div className="relative z-10 w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-gray-800">
                  {stream ? (
                    <video 
                      ref={userVideo} 
                      autoPlay 
                      muted 
                      playsInline 
                      className="w-full h-full object-cover scale-x-[-1]" 
                    />
                  ) : (
                    <img 
                      src={callerPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${callerName}`} 
                      className="w-full h-full object-cover opacity-50"
                      alt=""
                    />
                  )}
                </div>
                {/* Other user's avatar as a small badge */}
                <div className="absolute -bottom-2 -right-2 w-16 h-16 rounded-2xl border-4 border-indigo-600 overflow-hidden shadow-lg z-20 bg-white">
                  <img src={callerPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${callerName}`} className="w-full h-full object-cover" alt="" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2 underline decoration-indigo-500 decoration-4 underline-offset-8">Calling {callerName}...</h2>
              <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-12">Waiting for connection info...</p>
              
              <button 
                onClick={leaveCall}
                className="group flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:bg-red-700 transition-all shadow-xl shadow-red-900/40">
                  <PhoneOff className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">Cancel Call</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Call Window */}
      {callAccepted && !callEnded && (
        <Draggable nodeRef={draggableRef}>
          <div ref={draggableRef} className="fixed bottom-8 right-8 z-[100] group">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`bg-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-white relative transition-all duration-500 ${isMinimized ? 'w-48 h-32' : 'w-[400px] h-[500px]'}`}
            >
              {/* Partner Video (Full) */}
              <video 
                playsInline 
                ref={partnerVideo} 
                autoPlay 
                className="w-full h-full object-cover"
              />

              {/* My Video (Picture in Picture) */}
              <div className={`absolute bottom-4 right-4 bg-gray-800 rounded-2xl border-2 border-white overflow-hidden shadow-xl transition-all duration-500 ${isMinimized ? 'w-12 h-12 opacity-0' : 'w-24 h-32'}`}>
                <video 
                  playsInline 
                  muted 
                  ref={userVideo} 
                  autoPlay 
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Controls Overlay */}
              <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 transition-opacity duration-300 ${isMinimized ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100'}`}>
                <button 
                  onClick={toggleMute}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button 
                  onClick={toggleVideo}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                >
                  {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                </button>
                <button 
                  onClick={leaveCall}
                  className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-all shadow-xl shadow-red-900/20"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>

                <button 
                  onClick={confirmSession}
                  disabled={sessionConfirmed}
                  className={`px-4 h-10 rounded-full flex items-center gap-2 transition-all font-bold text-[10px] uppercase tracking-widest ${sessionConfirmed ? 'bg-green-600 text-white cursor-default' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-900/20'}`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {sessionConfirmed ? 'Confirmed' : 'Complete Session'}
                </button>
              </div>

              {/* Remote Confirmation Status */}
              <AnimatePresence>
                {remoteSessionConfirmed && !sessionConfirmed && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-indigo-100 shadow-xl"
                  >
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter flex items-center gap-2 whitespace-nowrap">
                      <CheckCircle className="w-3 h-3" /> Partner marked session complete
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Header Controls */}
              <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="w-8 h-8 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-all"
                >
                  {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                </button>
              </div>

              {/* Status Badge */}
              <div className="absolute top-4 left-6 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    connectionStatus === 'Connected' || connectionStatus === 'Live session' 
                      ? 'bg-green-500' 
                      : connectionStatus.includes('failed') || connectionStatus.includes('rejected')
                        ? 'bg-red-500' 
                        : 'bg-yellow-500'
                  }`} />
                  <span className="text-[10px] font-bold text-white uppercase tracking-widest opacity-80">
                    {connectionStatus === 'Connected' ? 'Live session' : connectionStatus}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </Draggable>
      )}
    </>
  );
};

export const useVideoCall = () => {
  const context = useContext(VideoCallContext);
  if (!context) {
    throw new Error('useVideoCall must be used within a VideoCallProvider');
  }
  return context;
};
