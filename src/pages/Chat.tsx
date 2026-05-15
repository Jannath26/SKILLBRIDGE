import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useVideoCall } from '../context/VideoCallContext';
import { useLocation } from 'react-router-dom';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Smile, 
  MoreVertical, 
  Search,
  Check,
  CheckCheck,
  Clock,
  MessageSquare,
  Video
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

export default function Chat() {
  const { user, profile } = useAuth();
  const { socket } = useSocket();
  const { callUser } = useVideoCall();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const targetConvoId = queryParams.get('id');

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Socket via context - we just need to listen for events
  useEffect(() => {
    if (!socket || !user) return;

    socket.on('receive_message', (data) => {
      // Logic for instant updates if needed beyond Firestore
    });

    socket.on('user_typing', (data) => {
      if (activeConversation && data.senderId === activeConversation.otherUser.uid) {
        setOtherUserTyping(true);
        setTimeout(() => setOtherUserTyping(false), 3000);
      }
    });

    return () => {
      socket.off('receive_message');
      socket.off('user_typing');
    };
  }, [user, socket, activeConversation]);

  // Fetch Conversations
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      try {
        const convos = await Promise.all(snap.docs.map(async (d) => {
          const data = d.data();
          const otherUserId = data.participants.find((id: string) => id !== user.uid);
          const userSnap = await getDoc(doc(db, 'users', otherUserId));
          const userData = userSnap.data();
          return { id: d.id, ...data, otherUser: { ...userData, uid: otherUserId } };
        }));
        setConversations(convos);

        // Handle deep linking
        if (targetConvoId && !activeConversation) {
          const target = convos.find(c => c.id === targetConvoId);
          if (target) {
            setActiveConversation(target);
          }
        }
      } catch (err) {
        console.error("Error processing conversations:", err);
      }
    }, (error) => {
      console.error("Conversations listener error:", error);
    });

    return () => unsubscribe();
  }, [user, targetConvoId]);

  // Fetch Messages for active conversation
  useEffect(() => {
    if (!activeConversation) return;
    const q = query(
      collection(db, `conversations/${activeConversation.id}/messages`),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      scrollToBottom();
    }, (error) => {
      console.error("Messages listener error:", error);
    });

    return () => unsubscribe();
  }, [activeConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeConversation) return;

    const messageData = {
      text: newMessage,
      senderId: user.uid,
      timestamp: serverTimestamp(),
      type: 'text',
      status: 'sent'
    };

    const textToEmit = newMessage;
    setNewMessage('');

    // Write to Firestore
    await addDoc(collection(db, `conversations/${activeConversation.id}/messages`), messageData);
    
    // Update Conversation last message
    await setDoc(doc(db, 'conversations', activeConversation.id), {
      lastMessage: {
        text: textToEmit,
        senderId: user.uid,
        timestamp: new Date().toISOString()
      },
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Emit via Socket for instant notification/realtime
    socket?.emit('send_message', {
      ...messageData,
      timestamp: new Date().toISOString(),
      receiverId: activeConversation.otherUser.uid,
      senderName: profile?.displayName,
      conversationId: activeConversation.id
    });
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socket?.emit('typing', {
        senderId: user?.uid,
        receiverId: activeConversation?.otherUser?.uid
      });
      setTimeout(() => setIsTyping(false), 3000);
    }
  };

  return (
    <AppLayout>
      <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-xl shadow-indigo-100/20 flex overflow-hidden h-[calc(100vh-200px)]">
        {/* Contacts Sidebar */}
        <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/50">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold tracking-tighter uppercase mb-4">Conversations</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search chats..." 
                className="w-full bg-white border border-gray-100 pl-10 pr-4 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => setActiveConversation(convo)}
                className={`w-full p-4 flex items-center gap-4 transition-all hover:bg-white border-b border-gray-100/50 ${activeConversation?.id === convo.id ? 'bg-white shadow-sm z-10' : ''}`}
              >
                <div className="relative">
                  <img src={convo.otherUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${convo.otherUser?.uid}`} alt="" className="w-12 h-12 rounded-2xl bg-white border border-gray-200 shadow-sm" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
                </div>
                <div className="flex-1 text-left">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-bold text-sm text-gray-900 leading-none">{convo.otherUser?.displayName}</span>
                    <span className="text-[10px] font-bold text-gray-400">12:45</span>
                  </div>
                  <div className="text-[11px] font-bold text-gray-400 line-clamp-1 truncate uppercase tracking-widest leading-none">
                    {convo.lastMessage?.senderId === user?.uid ? 'You: ' : ''}{convo.lastMessage?.text || 'Start chatting...'}
                  </div>
                </div>
              </button>
            ))}
            
            {conversations.length === 0 && (
              <div className="p-10 text-center text-gray-400">
                <p className="text-xs font-bold uppercase tracking-widest">No active chats</p>
              </div>
            )}
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 flex flex-col bg-white">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <img src={activeConversation.otherUser.photoURL} alt="" className="w-10 h-10 rounded-xl" />
                  <div>
                    <h3 className="font-bold text-gray-900 leading-none">{activeConversation.otherUser.displayName}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                        {otherUserTyping ? 'typing...' : 'Online'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => callUser(activeConversation.otherUser.uid, activeConversation.otherUser.displayName, activeConversation.otherUser.photoURL)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    title="Start Video Call"
                  >
                    <Video className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                    <Search className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Messages Grid */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/20">
                {messages.map((msg, i) => {
                  const isMe = msg.senderId === user?.uid;
                  return (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] group`}>
                         <div className={`p-4 rounded-2xl shadow-sm ${
                           isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-900 rounded-tl-none'
                         }`}>
                           <p className="text-sm font-medium leading-[1.4]">{msg.text}</p>
                         </div>
                         <div className={`flex items-center gap-2 mt-2 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                               {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'just now'}
                            </span>
                            {isMe && (
                              <div className="text-indigo-600">
                                {msg.status === 'seen' ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                              </div>
                            )}
                         </div>
                      </div>
                    </motion.div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-6 bg-white border-t border-gray-100">
                <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 p-1">
                    <button type="button" className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"><Paperclip className="w-5 h-5" /></button>
                    <button type="button" className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"><ImageIcon className="w-5 h-5" /></button>
                  </div>
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      placeholder="Type your message..." 
                      className="w-full bg-gray-50 border-none px-6 py-4 rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all"
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                      }}
                    />
                    <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-amber-500 transition-colors"><Smile className="w-5 h-5" /></button>
                  </div>
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:scale-95"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-20">
               <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-8">
                 <MessageSquare className="w-10 h-10" />
               </div>
               <h3 className="text-3xl font-black tracking-tighter uppercase mb-4 leading-none">Realtime Communications</h3>
               <p className="text-gray-400 font-medium max-w-sm">Select a mentor or learner from the contact list to start sharing knowledge in realtime.</p>
               <div className="mt-8 flex gap-3">
                 <div className="flex items-center gap-2 text-[10px] font-bold bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full uppercase tracking-widest border border-emerald-100">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    Direct Messaging
                 </div>
                 <div className="flex items-center gap-2 text-[10px] font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full uppercase tracking-widest border border-indigo-100">
                    <CheckCheck className="w-3 h-3" />
                    Read Receipts
                 </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
