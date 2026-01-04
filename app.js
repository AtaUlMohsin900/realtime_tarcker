const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server);

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

io.on("connection", function(socket){
  console.log("New user connected with id:", socket.id);
  
  // Send welcome message
  socket.emit("message", "Welcome to Real Time Tracking!");
  
  // Send initial location
  socket.emit("locationUpdate", { 
    lat: 20.5937, 
    lng: 78.9629,
    timestamp: new Date().toISOString()
  });
  
  // Handle location requests
  socket.on("getLocation", () => {
    console.log("Location requested by:", socket.id);
    
    // In real app, get location from database or GPS
    const testLocation = {
      lat: 20.5937 + (Math.random() - 0.5) * 0.1,
      lng: 78.9629 + (Math.random() - 0.5) * 0.1,
      timestamp: new Date().toISOString()
    };
    
    socket.emit("locationUpdate", testLocation);
  });
  
  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

app.get("/", function(req, res){
  res.render("index");
});

server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
  console.log("Socket.io server is ready");
});