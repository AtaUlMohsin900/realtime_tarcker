const express = require("express");
const app = express();
const http = require("http");
const path = require("path");

const socket = require("socket.io");
const server = http.createServer(app);
const io = socket(server);

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

io.on("connection", function(_socket){
  console.log("connected");
});

app.get("/", function(req, res){
  res.render("index");
});

server.listen(3000);