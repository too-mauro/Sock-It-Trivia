const path = require("path");
const express = require("express");
const morgan = require("morgan");
const serveStatic = require("serve-static");
const http = require("http");
const { Server } = require("socket.io");

// get .env data
const result = require("dotenv").config();
if (result.error) throw result.error;

// Create a new Express application
const app = express();

// Create a simple Express application
// Turn down the logging activity
//app.use(morgan("dev"));

// Serve static html, js, css, and image files from the 'public' directory
app.use(serveStatic(path.join(__dirname,"public")));

// Create an http server with Node's HTTP module.
// Pass it the Express application, and listen on port 8080.
const httpServer = http.createServer(app);

// Instantiate Socket.IO hand have it listen on the Express/HTTP server
const io = new Server(httpServer);

// Import the Socket-Trivia file here
const sockTrivia = require("./socketTrivia.js");

io.on("connection", socket => {
    sockTrivia.initializeGame(io, socket);
});

let port = parseInt(process.env.PORT) || 8080;
httpServer.listen(port, () => {
  console.log(`HTTP server listening on port ${port}!`);
});
