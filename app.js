const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store connected users
const users = new Map();

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  users.set(socket.id, { id: socket.id });
  
  // Send welcome message
  socket.emit("message", `Welcome! Your ID: ${socket.id}`);
  
  // Broadcast new user to others
  socket.broadcast.emit("user-connected", socket.id);
  
  // Handle location updates from client
  socket.on("send-location", (locationData) => {
    const { latitude, longitude } = locationData;
    
    // Update user data
    users.set(socket.id, {
      ...users.get(socket.id),
      latitude,
      longitude,
      lastUpdate: new Date().toISOString()
    });
    
    console.log(`Location from ${socket.id}:`, { latitude, longitude });
    
    // Broadcast to all other clients
    socket.broadcast.emit("receive-location", {
      id: socket.id,
      latitude,
      longitude
    });
  });
  
  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    users.delete(socket.id);
    
    // Notify other clients to remove marker
    socket.broadcast.emit("user-disconnected", socket.id);
  });
  
  // Send current users to new connection
  const currentUsers = Array.from(users.entries())
    .filter(([id, data]) => id !== socket.id && data.latitude && data.longitude)
    .map(([id, data]) => ({
      id,
      latitude: data.latitude,
      longitude: data.longitude
    }));
  
  if (currentUsers.length > 0) {
    socket.emit("existing-users", currentUsers);
  }
});

app.get("/", (req, res) => {
  res.render("index");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Active users: ${users.size}`);
});