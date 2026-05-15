import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { Buffer } from 'buffer';
import process from 'process';

// Polyfills for simple-peer (WebRTC)
if (typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}
(window as any).Buffer = Buffer;
(window as any).process = process;
if (!process.nextTick) {
  (process as any).nextTick = (fn: any, ...args: any[]) => setTimeout(() => fn(...args), 0);
}

import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './lib/firebase';

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection established");
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is reporting as offline.");
    } else if (error instanceof Error && error.message.includes('permission-denied')) {
      // Permission denied still means we reached the server, which is good for a connectivity test
      console.log("Firebase connection verified (server reached)");
    } else {
      // Ignore other connectivity test errors to avoid confusing users
      console.debug("Note: Firestore connectivity test skipped or restricted", error);
    }
  }
}

testConnection();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
