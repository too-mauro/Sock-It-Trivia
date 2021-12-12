const fetch = require("node-fetch"); // needed to get the trivia questions
const {decode} = require("he"); // needed to clean up trivia questions
const result = require("dotenv").config();
if (result.error) throw result.error;

let io;
let gameSocket;
let maxRounds = parseInt(process.env.MAX_ROUNDS) || 15;
let maxPlayers = parseInt(process.env.MAX_PLAYERS) || 4;
let socketRooms = [];

exports.initializeGame = (sio, socket) => {
  io = sio;
  gameSocket = socket;
  gameSocket.emit("connected", { message: "You are connected!" });

  // Host Events
  gameSocket.on("hostCreateNewGame", hostCreateNewGame);
  gameSocket.on("enoughPlayersJoined", enoughPlayersJoined);
  gameSocket.on("hostRoomFull", hostPrepareGame);
  gameSocket.on("hostCountdownFinished", hostStartGame);
  gameSocket.on("hostNextRound", hostNextRound);
  gameSocket.on("hostEndRound", hostEndRound);

  // Player Events
  gameSocket.on("playerJoinGame", playerJoinGame);
  gameSocket.on("playerAnswer", playerAnswer);
  gameSocket.on("gameRestart", gameRestart);
}

/*
  Host Functions
*/
function hostCreateNewGame() {
    // Create a unique Socket.IO Room (a 5-character uppercase string)

    let thisGameId = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < 5; i++) {
        thisGameId += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
    this.emit("newGameCreated", {gameId: thisGameId, mySocketId: this.id, maxPlayersAllowed: maxPlayers});

    // Join the Room and wait for the players
    this.join(thisGameId.toString());
}

function hostPrepareGame(gameId) {
    // All players are present. Lock the game into play and start!
    let sock = this;
    let data = {
        mySocketId: sock.id,
        gameId: gameId
    };

    // Lock the game here
    socketRooms.forEach(entry => {
      if (entry.roomCode == data.gameId) { entry.locked = true; }
    });

    // Get the game started!
    io.sockets.in(data.gameId).emit("beginNewGame", data);
}

function hostNextRound(data) {
  if (data.round < maxRounds || data.triviaQuestions.length > 0) {
      // Send a new question and answer set back to the host and players.
      startRound(data.round, data.gameId, data.triviaQuestions);
  }
  else {
      // If the current round exceeds the length of questions, send the 'gameOver' event.
      io.sockets.in(data.gameId).emit("gameOver", data);
  }
}

function hostEndRound(data) {
  io.sockets.in(data.gameId).emit("endRound", data);
}

function enoughPlayersJoined(data) {
  // The incoming data has all the players' data in here, so grab the first entry's gameId to pass back.
  io.sockets.in(data[0].gameId).emit("enoughPlayersJoined", data);
}

function playerJoinGame(data) {
    // A reference to the player's Socket.IO socket object
    let sock = this;
    let roomIsLocked = false;
    data.gameId = data.gameId.toString().toUpperCase();
    let nameCheck = data.playerName.replace(/\s+/g, "").trim();

    // Look up the room ID in the Socket.IO rooms Map.
    let room = io.of("/").adapter.rooms.get(data.gameId);

    // If the room exists...
    if (room != undefined) {
        // Add a lock check to the room id if not already done (used to prevent players from joining the room after the game begins)
        if (!socketRooms.some(entry => entry.roomCode == data.gameId)) {
          socketRooms.push({
            roomCode: data.gameId,
            locked: false
          })
        }

        // Check if room is locked
        socketRooms.forEach(entry => {
          if ((entry.roomCode == data.gameId) && entry.locked) { roomIsLocked = true; }
        });

        if (!nameCheck) {
          this.emit("error", { message: "Please enter a name." } );
        }
        else if (roomIsLocked) {
          this.emit("error", { message: "This room is locked. Please wait until the game is finished or enter another game ID." } );
        }
        // Check if room is full (set by MAX_PLAYERS variable in env file)
        else if (room.size > maxPlayers) {
          this.emit("error", { message: "This room is full. Please wait until the game is finished or enter another game ID." } );
        }
        else {
          // attach the socket id to the data object, join the room, and emit a "player joined" event.
          data.mySocketId = sock.id;
          sock.join(data.gameId);
          io.sockets.in(data.gameId).emit("playerJoinedRoom", data);
        }
    }
    else {
        // Otherwise, send an error message back to the player.
        this.emit("error", { message: "This room does not exist. Please enter a valid room code." } );
    }
}

function playerAnswer(data) {
    // The player's answer is attached to the data object.
    // Emit an event with the answer so it can be checked by the 'Host'
    io.sockets.in(data.gameId).emit("hostCheckAnswer", data);
}

function gameRestart(data) {
    // Emit an event that tells the host and player devices to show the
    // game ID and data entry screens, respectively.

    // Unlock the room here so other players can join it.
    socketRooms.forEach(entry => {
      if (entry.roomCode == data.gameId) { entry.locked = false; }
    });

    io.sockets.in(data.gameId).emit("gameRestarted", data);
}

function hostStartGame(gameId) {
    try {
      fetch(`https://opentdb.com/api.php?amount=${maxRounds}`)
        .then(res => res.json())
        .then(json => {
          //console.log('Game Started.');
          startRound(0, gameId, json.results);
        });
    }
    catch (err) {
      // No questions, no game.
      console.err(err);
    }
}

function startRound(roundNum, gameId, triviaQuestions) {
    let roundInfo = triviaQuestions.shift();
    let data = getTriviaData(roundNum, roundInfo);

    // attach remaining questions to object so the game can continue after one round
    data.triviaQuestions = triviaQuestions;

    io.sockets.in(gameId).emit("newRound", data);
}

function getTriviaData(roundNum, roundData) {
  console.log(roundData);

  // get point count based on difficulty
  let points;
  switch (roundData.difficulty) {
    case "easy": points = 1; break;
    case "medium": points = 2; break;
    case "hard": points = 3; break;
    default: points = 1; break;
  }

  // combine all answers and shuffle them
  roundData.incorrect_answers.push(roundData.correct_answer);
  let answers = roundData.incorrect_answers.reverse();
  for (let i = answers.length - 1; i > 0; i--) {
    answers[i] = decode(answers[i]);  // decode any HTML entities

    const j = Math.floor(Math.random() * i);
    const temp = decode(answers[i]);
    answers[i] = decode(answers[j]);
    answers[j] = decode(temp);
  }

  let triviaData = {
    round: roundNum,
    category: decode(roundData.category),
    question: decode(roundData.question),
    answer: decode(roundData.correct_answer),
    choices: roundData.incorrect_answers, // choices for player (both correct and incorrect)
    points: points  // used to add or subtract points depending on answer
  };
  return triviaData;
}
