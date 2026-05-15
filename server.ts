import express from "express";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.resolve();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---
  
  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Resource Fetching (Simulated logic to return relevant educational content)
  app.get("/api/resources", async (req, res) => {
    const { query } = req.query;
    if (!query) return res.json([]);
    
    const resources = [
      { 
        id: "1",
        title: `Full ${query} Masterclass 2026`, 
        url: `https://www.youtube.com/results?search_query=${query}+tutorial+2024`, 
        type: "video",
        thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80",
        description: "A comprehensive guide covering fundamentals to advanced industry patterns."
      },
      { 
        id: "2",
        title: `Official ${query} Specifications`, 
        url: `https://duckduckgo.com/?q=${query}+official+docs`, 
        type: "docs",
        thumbnail: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=400&q=80",
        description: "The primary source of truth for syntax and authoritative API references."
      },
      { 
        id: "3",
        title: `Best ${query} Repositories`, 
        url: `https://github.com/search?q=${query}+topic%3Aawesome`, 
        type: "github",
        thumbnail: "https://images.unsplash.com/photo-1618401471353-b98aade1555a?w=400&q=80",
        description: "Curated lists of libraries, tools, and tutorials for the modern developer."
      }
    ];

    res.json(resources);
  });

  // Credit Transaction System (Simulation for specific logic)
  app.post("/api/credits/earn", async (req, res) => {
    const { userId, amount, reason } = req.body;
    // In a production app, we would verify the activity and update Firestore using Admin SDK
    res.json({ success: true, message: `Earned ${amount} credits for ${reason}` });
  });

  // Socket.io for Realtime Chat & Notifications
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join", (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined room`);
    });

    socket.on("send_message", (data) => {
      // Broadcast to the target user
      io.to(data.receiverId).emit("receive_message", data);
      io.to(data.receiverId).emit("notification", {
        type: "new_message",
        title: "New Message",
        message: `From ${data.senderName}: ${data.text.substring(0, 50)}...`,
        data: data
      });
    });

    socket.on("typing", (data) => {
      io.to(data.receiverId).emit("user_typing", data);
    });

    // --- Video Call Signaling ---
    socket.on("call_user", (data) => {
      console.log(`User ${data.from} is calling ${data.userToCall}`);
      io.to(data.userToCall).emit("incoming_call", {
        signal: data.signalData,
        from: data.from,
        callerName: data.callerName,
        callerPhoto: data.callerPhoto
      });
    });

    socket.on("answer_call", (data) => {
      console.log(`Call answered by ${data.from} for ${data.to}`);
      io.to(data.to).emit("call_accepted", {
        signal: data.signal,
        from: data.from
      });
    });

    socket.on("end_call", (data) => {
      console.log(`Call ended by ${data.from} for ${data.to}`);
      io.to(data.to).emit("call_ended");
    });

    socket.on("reject_call", (data) => {
      io.to(data.to).emit("call_rejected");
    });

    socket.on("confirm_session", (data) => {
      console.log(`Session confirmed by ${data.from} for ${data.to}`);
      io.to(data.to).emit("session_confirmed", { from: data.from });
    });

    socket.on("send_signal", (data) => {
      io.to(data.to).emit("receive_signal", {
        signal: data.signal,
        from: data.from
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
