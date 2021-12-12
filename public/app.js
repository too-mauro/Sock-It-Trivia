;
jQuery(function($)
{
    "use strict";

    /**
     * All the code relevant to Socket.IO is collected in the IO namespace.
     *
     * @type {{init: Function, bindEvents: Function, onConnected: Function, onNewGameCreated: Function, playerJoinedRoom: Function, beginNewGame: Function, onNewRound: Function, hostCheckAnswer: Function, gameOver: Function, error: Function}}
     */
    let IO = {

        /**
         * This is called when the page is displayed. It connects the Socket.IO client
         * to the Socket.IO server
         */
        init: function() {
            IO.socket = io.connect();
            IO.bindEvents();
        },

        /**
         * While connected, Socket.IO will listen to the following events emitted
         * by the Socket.IO server, then run the appropriate function.
         */
        bindEvents: function() {
            IO.socket.on("connected", IO.onConnected);
            IO.socket.on("newGameCreated", IO.onNewGameCreated);
            IO.socket.on("gameRestarted", IO.onGameRestarted);
            IO.socket.on("playerJoinedRoom", IO.playerJoinedRoom);
            IO.socket.on("beginNewGame", IO.beginNewGame);
            IO.socket.on("newRound", IO.onNewRound);
            IO.socket.on("hostCheckAnswer", IO.hostCheckAnswer);
            IO.socket.on("endRound", IO.onEndRound);
            IO.socket.on("enoughPlayersJoined", IO.enoughPlayersJoined);
            IO.socket.on("gameOver", IO.gameOver);
            IO.socket.on("error", IO.error);
        },

        /**
         * The client is successfully connected!
         */
        onConnected: function() {
            // Cache a copy of the client's socket.IO session ID on the App
            App.mySocketId = IO.socket.id;
            //console.log(App);
        },

        /**
         * A new game has been created and a random game ID has been generated.
         * @param data {{ gameId: int, mySocketId: * }}
         */
        onNewGameCreated: function(data) {
            App.Host.maxPlayersAllowed = data.maxPlayersAllowed;
            App.Host.gameInit(data);
        },

        /**
         * An existing game has been restarted.
         */
        onGameRestarted: function (data) {
          if (App.myRole === "Host") {
            App.Host.displayNewGameScreen();
          }

          if (App.myRole === "Player") {
            App.Player.onJoinClick();
          }
        },

        /**
         * A player has successfully joined the game.
         * @param data {{playerName: string, gameId: int, mySocketId: int}}
         */
        playerJoinedRoom: function(data) {
            // When a player joins a room, do the updateWaitingScreen function.
            // There are two versions of this function: one for the "host" and
            // another for the "player".
            //
            // So on the "host" browser window, the App.Host.updateWaitingScreen function is called.
            // And on the player"s browser, App.Player.updateWaitingScreen is called.

            App[App.myRole].updateWaitingScreen(data);
        },

        /**
         * All players have joined the game.
         * @param data
         */
        beginNewGame: function(data) {
            App[App.myRole].gameCountdown(data);
        },

        /**
         * A new question and answer for the round is returned from the server.
         * @param data
         */
        onNewRound: function(data) {
            // Update the current round
            App.currentRound = data.round;

            // Change the word for the Host and Player
            App[App.myRole].newRound(data);
        },

        /**
         * The round is over, let the host and players know.
         * @param data
         */
        onEndRound: function(data) {
            App[App.myRole].endRound(data);
        },

        /**
         * A player answered. If this is the host, check the answer.
         * @param data
         */
        hostCheckAnswer: function(data) {
            if (App.myRole === "Host") {
                App.Host.checkAnswer(data);
            }
        },

        enoughPlayersJoined: function(data) {
            if (App.myRole === "Player") {
                App.Player.enoughPlayersJoined(data);
            }
        },

        /**
         * Let everyone know the game has ended.
         * @param data
         */
        gameOver: function(data) {
            data.hostPlayer = App.Host.hostPlayer;
            App[App.myRole].endGame(data);
        },

        /**
         * An error has occurred.
         * @param data
         */
        error: function(data) {
            alert(data.message);
        }

    };

    let App = {

        /**
         * Keep track of the gameId, which is identical to the ID
         * of the Socket.IO Room used for the players and host to communicate
         *
         */
        gameId: 0,

        /**
         * This is used to differentiate between "Host" and "Player" browsers.
         */
        myRole: "",   // "Player" or "Host"

        /**
         * The Socket.IO socket object identifier. This is unique for
         * each player and host. It is generated when the browser initially
         * connects to the server when the page loads for the first time.
         */
        mySocketId: "",

        /**
         * Identifies the current round. Starts at 0 because it corresponds
         * to the array of word data stored on the server.
         */
        currentRound: 0,

        /**
        * A reference to the maximum number of players can join a given lobby (received from the server)
        */
        maxPlayersAllowed: 0,

        /* *************************************
         *                Setup                *
         * *********************************** */

        /**
         * This runs when the page initially loads.
         */
        init: function () {
            App.cacheElements();
            App.showInitScreen();
            App.bindEvents();

            // Initialize the fastclick library
            FastClick.attach(document.body);
        },

        /**
         * Create references to on-screen elements used throughout the game.
         */
        cacheElements: function () {
            App.$doc = $(document);

            // Templates
            App.$gameArea = $("#gameArea");
            App.$scrollingBackground = $("#scrollingBackground");
            App.$templateIntroScreen = $("#intro-screen-template").html();
            App.$templateNewGame = $("#create-game-template").html();
            App.$templateJoinGame = $("#join-game-template").html();
            App.$hostGame = $("#host-game-template").html();
            App.$endGameOptions = $("#game-restart-template").html();
        },

        /**
         * Create some click handlers for the various buttons that appear on-screen.
         */
        bindEvents: function () {
            // Host
            App.$doc.on("click", "#btnCreateGame", App.Host.onCreateClick);

            // Player
            App.$doc.on("click", "#btnJoinGame", App.Player.onJoinClick);
            App.$doc.on("click", "#btnStart", App.Player.onPlayerStartClick);
            App.$doc.on("click", ".btnAnswer", App.Player.onPlayerAnswerClick);
            App.$doc.on("click", "#btnPlayerRestart", App.Player.onGameRestart);
            App.$doc.on("click", "#btnGameStart", App.Player.startTheGame);
        },

        /* *************************************
         *             Game Logic              *
         * *********************************** */

        /**
         * Show the initial Sock It! Title Screen
         * (with Start and Join buttons)
         */

        showInitScreen: function() {
            App.$gameArea.html(App.$templateIntroScreen);
        },

        /* *******************************
           *         HOST CODE           *
           ******************************* */
        Host: {

            /**
             * Contains references to player data
             */
            players: [],

            /**
            * A reference to the first entrant of a given lobby.
            */
            hostPlayer: null,

            /**
             * Flag to indicate if a new game is starting.
             * This is used after the first game ends, and players initiate a new game
             * without refreshing the browser windows.
             */
            isNewGame: false,

            /**
            * A flag to check if the host should be taking answers from the players
            */
            takingAnswers: false,

            /**
             * Keep track of the number of players that have joined the game.
             */
            numPlayersInRoom: 0,

            /**
             * A reference to the correct answer for the current round.
             */
            currentCorrectAnswer: "",

            /**
             * A reference to the category for the current round.
             */
            currentCategory: "",

            /**
            * A reference to the timer that appears during each round.
             */
            clockTimer: null,

            /**
            * A reference to the list of players who answered during a given round
            */
            playersWhoAnswered: [],

            /**
             * Handler for the "Start" button on the Title Screen.
             */
            onCreateClick: function () {
                // console.log("Clicked "Create A Game"");
                IO.socket.emit("hostCreateNewGame");
            },

            /**
             * The Host screen is displayed for the first time.
             * @param data{{ gameId: int, mySocketId: * }}
             */
            gameInit: function (data) {
                App.gameId = data.gameId;
                App.mySocketId = data.mySocketId;
                App.myRole = "Host";
                App.Host.numPlayersInRoom = 0;

                App.Host.displayNewGameScreen();
                // console.log("Game started with ID: " + App.gameId + " by host: " + App.mySocketId);
            },

            /**
             * Show the Host screen containing the game URL and unique game ID
             */
            displayNewGameScreen: function() {
              if (App.Host.isNewGame) {
                // Reset game data
                App.Host.numPlayersInRoom = 0;
                App.Host.players.length = 0;
                App.backgroundFadeSwap(1);
                App.Host.isNewGame = false; // change flag back so elements appear properly
              }

              // Fill the game screen with the appropriate HTML
              App.$scrollingBackground.css("filter", "brightness(50%) blur(8px)");
              App.$gameArea.html(App.$templateNewGame);

              // Display the URL on screen
              $("#gameURL").text(window.location.href);
              App.doTextFit("#gameURL");

              // Show the gameId / room id on screen
              $("#spanNewGameCode").text(App.gameId);
            },

            /**
             * Update the Host screen when the first player joins
             * @param data{{playerName: string}}
             */
            updateWaitingScreen: function(data) {

                // get random character portrait for player
                let iconNum = App.getRandomStockIconNum();
                data.iconNum = iconNum;

                // Store the new player's data on the Host.
                App.Host.players.push(data);
                App.Host.numPlayersInRoom += 1;

                // Set the lobby's first entrant to be the "host" player
                // (this allows them to start and restart the game)
                if (App.Host.numPlayersInRoom == 1) {
                  App.Host.hostPlayer = App.Host.players[0];
                }

                let playerNum = "#player" + App.Host.numPlayersInRoom + "Score";
                $(playerNum)
                  .removeClass("blinker", 1000, "easeIn")
                  .find(".playerName")
                  .html("<div class='stockIconContainer'><img id='iconNum" + iconNum + "' class='playerStockIcon' src='img/icon_" + iconNum + ".png' /><span class='stockIconText'>" + data.playerName + "</span></div>")

                // If at least two players have joined, send event button to first entrant's screen to allow them to start the game
                if (App.Host.numPlayersInRoom >= 2) {
                    IO.socket.emit("enoughPlayersJoined", App.Host.players);
                    $("#playersWaiting").html("Waiting on " + App.Host.hostPlayer.playerName + " to start the game!");
                }

                // show the lobby is full on the host screen
                if (App.Host.numPlayersInRoom === App.Host.maxPlayersAllowed) {
                    $("#playersWaiting").append("<br>(Lobby is full!)");
                }
            },

            /**
             * Show the countdown screen
             */
            gameCountdown: function() {

                // Prepare the game screen with new HTML
                App.$gameArea.html(App.$hostGame);
                App.doTextFit("#triviaQuestion");

                // Begin the on-screen countdown timer
                let $secondsLeft = $("#triviaQuestion");
                App.countDown($secondsLeft, 5, function() {
                    IO.socket.emit("hostCountdownFinished", App.gameId);
                });

                // Display the players" names on screen
                for (let p = 0; p < App.Host.numPlayersInRoom; p++) {

                  // Construct player score and attach their socket id to the score to keep track
                  let playerScoreEl = "#player" + (p + 1) + "Score";
                  let player = App.Host.players[p];

                  $(playerScoreEl)
                    .css("visibility", "hidden")
                    .find(".playerName")
                    .html("<div class='stockIconContainer'><img class='playerStockIcon' src='img/icon_" + player.iconNum + ".png' /><span class='stockIconText'>" + player.playerName + "</span></div>");

                  // Set the Score section on screen to 0 for each player.
                  $(playerScoreEl).find(".score").prop("id", player.mySocketId);
                }
            },

            /**
             * Show the word for the current round on screen.
             * @param data{{round: *, word: *, answer: *, list: Array}}
             */
            newRound: function(data) {
                // Hide every stock icon, score, and reset score colors
                $("#playerScores").css("height", "145px");
                for (let p = 0; p < App.Host.numPlayersInRoom; p++) {
                  let playerScoreEl = "#player" + (p + 1) + "Score";
                  $(playerScoreEl).css("visibility", "hidden");
                  $(playerScoreEl).find(".score").css("display", "none");
                  $("#" + App.Host.players[p].mySocketId).css("background-color", "#bec4c4");
                }

                // Update the data for the current round
                App.Host.takingAnswers = true;
                App.Host.currentCorrectAnswer = data.answer;
                App.Host.currentCategory = data.category;
                App.Host.currentRound = data.round;
                App.Host.pointCount = data.points;
                App.Host.remainingQuestions = data.triviaQuestions;

                // Insert the new question into the DOM
                $("#timer").css("display", "block");
                $("#triviaQuestion").html("<span style='font-size: 80%'><u><b>Round " + (data.round + 1) + "</b> / <b>" + data.category + "</b></u></span><br>" + data.question);
                App.doTextFit("#triviaQuestion");

                let timerTimeLeft = 30;
                App.Host.clockTimer = setInterval(decrementTimer, 1000);

                function decrementTimer() {
                  timerTimeLeft -= 1;
                  let minutes = parseInt(timerTimeLeft / 60, 10);
                  let seconds = parseInt(timerTimeLeft % 60, 10);
                  seconds = seconds < 10 ? "0" + seconds : seconds;
                  $("#timerTime").text(minutes + ":" + seconds);

                  if (timerTimeLeft == 10) {
                      $("#timer").css("color", "orange");
                  }
                  if (timerTimeLeft == 5) {
                      $("#timer").css("color", "red");
                  }
                  else if (timerTimeLeft == 0) {
                    App.Host.takingAnswers = false;

                    setTimeout(function () {
                      let data = { gameId: App.gameId };
                      IO.socket.emit("hostEndRound", data);
                    }, 250);
                  }
                }
            },

            /**
             * Check the answer clicked by a player.
             * @param data{{round: *, playerId: *, answer: *, gameId: *}}
             */
            checkAnswer: function(data) {
                // Verify that the answer clicked is from the current round.
                // This prevents a "late entry" from a player whos screen has not
                // yet updated to the current round.
                if (data.round === App.currentRound && App.Host.takingAnswers) {
                    let endOfRoundData = {
                      gameId: App.gameId
                    };

                    // Get the player's score and display their stock icon to show they answered
                    let $pScore = $("#" + data.playerId);
                    let playerScoreEl = "#player" + (App.Host.players.findIndex(entry => entry.mySocketId == data.playerId) + 1) + "Score";
                    $(playerScoreEl).css("visibility", "visible");

                    if (!App.Host.playersWhoAnswered.some(entry => entry.playerId == data.playerId)) {
                      // Advance player's score if it is correct
                      if (App.Host.currentCorrectAnswer === data.answer) {

                          // Add the question's point count to the player"s score
                          $pScore.text(+($pScore.text()) + App.Host.pointCount);
                          $pScore.css("background-color", "#88ff7a");

                          App.Host.playersWhoAnswered.push({
                            playerId: data.playerId,
                            correct: true,
                            passed: false
                          });
                      }
                      else if (data.answer == "pass") {
                        // Player passed on the question. Don't deduct any points
                        // TODO: add counter for number of passes each player uses and deduct one here
                        App.Host.playersWhoAnswered.push({
                          playerId: data.playerId,
                          correct: false,
                          passed: true
                        });
                      }
                      else {
                          // A wrong answer was submitted, so decrement the player's score and change the score color to light red.
                          if (+($pScore.text()) - App.Host.pointCount < 0) {
                            $pScore.text(0);
                          }
                          else {
                            $pScore.text(+($pScore.text()) - App.Host.pointCount);
                          }
                          $pScore.css("background-color", "#ff887d");

                          App.Host.playersWhoAnswered.push({
                            playerId: data.playerId,
                            correct: false,
                            passed: false
                          });
                      }

                      if (App.Host.playersWhoAnswered.length >= App.Host.players.length) {
                        // All players have answered. End the round
                        IO.socket.emit("hostEndRound", endOfRoundData);
                      }
                    }
                }
            },

            endRound: function(data) {
              App.Host.takingAnswers = false;

              // Remove timer countdown and hide timer
              clearInterval(App.Host.clockTimer);
              $("#timer").css("display", "none");
              $("#timer").css("color", "");
              $("#timerTime").text("0:30");

              $("#triviaQuestion").html("<b>Round over!</b><br><br>The correct answer was: " + App.Host.currentCorrectAnswer);

              // show all players' icons and scores
              $("#playerScores").css("height", "185px");
              for (let p = 0; p < App.Host.numPlayersInRoom; p++) {
                let playerScoreEl = "#player" + (p + 1) + "Score";
                $(playerScoreEl).css("visibility", "visible");
                $(playerScoreEl).find(".score").css("display", "inline-block");
              }

              // Advance the round
              App.currentRound += 1;

              // Empty players who answered array
              App.Host.playersWhoAnswered.length = 0;

              // Prepare data to send to the server
              let prepareNewRoundData = {
                  gameId: App.gameId,
                  round: App.currentRound,
                  triviaQuestions: App.Host.remainingQuestions
              }

              setTimeout(function () {
                // Notify the server to start the next round.
                IO.socket.emit("hostNextRound", prepareNewRoundData);
              }, 5000);

            },

            /**
             * All rounds have played out. End the game.
             * @param data
             */
            endGame: function(data) {
              // Hide timer and show every stock icon
              $("#timer").css("display", "none");

              $("#playerScores").css("height", "185px");
              let players = [];
              let winnerArray = [];

              // get the data for each player from the host screen and show every stock icon
              for (let p = 0; p < App.Host.numPlayersInRoom; p++) {
                let player = "#player" + (p + 1) + "Score";
                $(player).css("visibility", "visible");
                $(player).find(".score").css("display", "inline-block");
                $(player).find(".score").css("background-color", "#bec4c4");

                players.push({
                  player: $(player).find(".stockIconText").text(),
                  score: $(player).find(".score").text(),
                  num: p + 1
                });
              }

              App.getHighestScoreIndexes(players).forEach(inx => {
                // get winners and change their score boxes to yellow to designate them
                winnerArray.push(players[inx].player);
                $("#player" + players[inx].num + "Score").find(".score").css("background-color", "#fffa75");
              });

              let winMessage = (winnerArray.length > 1) ? "TIE" : "WINNER";

              $("#triviaQuestion").html("<b><u>FINAL RESULTS</u><br><br>GOT A " + winMessage + "!</b><br>" + winnerArray.join(" / "));
              App.doTextFit("#triviaQuestion");

              App.Host.isNewGame = true; // set flag here so a new game can be started
            }
        },


        /* *****************************
           *        PLAYER CODE        *
           ***************************** */

        Player: {

            /**
             * A reference to the socket ID of the Host
             */
            hostSocketId: "",

            /**
             * A reference to the "host" player (received from the Host)
             */
            hostPlayer: null,

            /**
             * The player's name entered on the "Join" screen.
             */
            myName: "",

            /**
             * The player's stock icon number received from the host.
             */
            myStockIconNum: 0,

            /**
             * Click handler for the "JOIN" button
             */
            onJoinClick: function () {
                // console.log("Clicked "Join A Game"");

                // Display the Join Game HTML on the player's screen.
                App.$scrollingBackground.css("filter", "brightness(50%) blur(8px)");
                App.$gameArea.html(App.$templateJoinGame);

                if (App.gameId && App.Player.myName) {
                  // fill out data if defined. used if host clicked the "return to lobby" button
                  $("#inputPlayerName").val(App.Player.myName);
                  $("#inputGameId").val(App.gameId);
                }
            },

            /**
             * The player entered their name and gameId (hopefully)
             * and clicked Start.
             */
            onPlayerStartClick: function() {
                // console.log("Player clicked "Start"");

                // collect data to send to the server
                let data = {
                    gameId: $("#inputGameId").val(),
                    playerName: $("#inputPlayerName").val()
                };

                // Send the gameId and playerName to the server
                IO.socket.emit("playerJoinGame", data);

                // Set the appropriate properties for the current player.
                App.myRole = "Player";
                App.Player.myName = data.playerName;
            },

            /**
             *  Click handler for the Player hitting a word in the word list.
             */
            onPlayerAnswerClick: function() {
                // console.log("Clicked Answer Button");
                let $btn = $(this);      // the tapped button
                let answer = $btn.val(); // The tapped word

                // Send the player info and tapped word to the server so
                // the host can check the answer.
                let data = {
                    gameId: App.gameId,
                    playerId: App.mySocketId,
                    answer: answer,
                    round: App.currentRound
                }
                IO.socket.emit("playerAnswer", data);

                $("#gameArea")
                    .html("<div class='gameOver'>Answer sent!</div>")
                    .append("<div id='playerScreenNameContainer'><img id='playerSockIcon' src='img/icon_" + App.Player.myStockIconNum + "_nobg.png'><span style='padding-left: 30px'>" + App.Player.myName + "</span></div>");
            },

            /**
             *  Click handler for the "Return to Lobby" button that appears
             *  when a game is over.
             */
            onGameRestart: function() {
                // reset round data and emit event that tells host to show game ID again
                App.currentRound = 0;
                let data = {gameId: App.gameId};
                IO.socket.emit("gameRestart", data);
            },

            /**
             * Display the waiting screen for players
             * @param data
             */
            updateWaitingScreen: function(data) {
              if (App.mySocketId === data.mySocketId) {
                  App.myRole = "Player";
                  App.gameId = data.gameId;

                  // Destroy the form to prevent player from submitting again
                  if ($(".info").length) {
                    $(".info").remove();
                  }

                  $("#playerWaitingMessage")
                    .css("top", "50%")
                    .addClass("info")
                    .append("<p/>")
                    .html("<h3>Welcome aboard, " + data.playerName + "!<br>You've joined game " + data.gameId + ".<br><br>Please wait while more players join the lobby.</h3>");
              }
            },

            enoughPlayersJoined: function(data) {
              // Attach the first entrant's data to the players' hostPlayer variable.
              App.Player.hostPlayer = data[0];

              // Get each player's assigned sock puppet icon to the player so it appears properly during the game.
              data.forEach(entry => {
                if (entry.mySocketId == App.mySocketId) {
                  App.Player.myStockIconNum = entry.iconNum;
                }
              });

              if (App.mySocketId === App.Player.hostPlayer.mySocketId) {
                // show a "start" button on the first entrant's screen that initiates the countdown to start the game
                $("#playerWaitingMessage")
                  .html("<h3>Hey, " + App.Player.myName + "! Enough players are in the lobby for " + App.Player.hostPlayer.gameId + ".</h3><div>Press the \"Start\" button to begin the game.</div><br><br>")
                  .append("<div class='buttons'>")
                  .append(
                    $("<button>START</button>")
                      .css("style", "font-size: 0.9em")
                      .prop("id", "btnGameStart")
                      .addClass("btn")
                  )
                  .append("</div>");
              }
            },

            startTheGame: function(data) {
              // Start button from first entrant's screen was pressed. Start the game.
              IO.socket.emit("hostRoomFull", App.gameId);
            },

            /**
             * Display "Get Ready" while the countdown timer ticks down.
             * @param hostData
             */
            gameCountdown: function(hostData) {
                App.Player.hostSocketId = hostData.mySocketId;

                let startTime = 5;
                let $playerEl = $("#gameArea");
                $playerEl
                  .html("<div class='gameOver'><b>Get Ready!</b></div>")
                  .append("<div id='playerScreenNameContainer'><img id='playerSockIcon' src='img/icon_" + App.Player.myStockIconNum + "_nobg.png'><span style='padding-left: 30px'>" + App.Player.myName + "</span></div>");
                $playerEl.find(".gameOver").css("color", "white");

                // Start the transition
                App.backgroundFadeSwap(startTime);

                setTimeout(function() {
                  // revert color back to default (helps with visibility)
                  $playerEl.find(".gameOver").css("color", "");
                }, (startTime - 3) * 1000);
            },

            endRound: function (data) {
              $("#gameArea")
                  .html("<div class='gameOver'><b>Round over!</b><br><br>Get ready, the next round will<br>start soon!</div>")
                  .append("<div id='playerScreenNameContainer'><img id='playerSockIcon' src='img/icon_" + App.Player.myStockIconNum + "_nobg.png'><span style='padding-left: 30px'>" + App.Player.myName + "</span></div>");
            },

            /**
             * Show the list of words for the current round.
             * @param data{{round: *, word: *, answer: *, list: Array}}
             */
            newRound: function (data) {
                // Create an unordered list element
                let $list = $("<ul/>").prop("id", "ulAnswers");

                // Insert a list item for each word in the word list
                // received from the server.
                $.each(data.choices, function() {
                    $list                               //  <ul> </ul>
                        .append( $("<li/>")             //  <ul> <li> </li> </ul>
                            .append( $("<button/>")     //  <ul> <li> <button> </button> </li> </ul>
                                .addClass("btnAnswer")  //  <ul> <li> <button class="btnAnswer"> </button> </li> </ul>
                                .addClass("btn")        //  <ul> <li> <button class="btnAnswer"> </button> </li> </ul>
                                .val(this)              //  <ul> <li> <button class="btnAnswer" value="word"> </button> </li> </ul>
                                .html(this) //  <ul> <li> <button class="btnAnswer" value="word">word</button> </li> </ul>
                            )
                        )
                });

                // Add a "Pass question" option
                $list                               //  <ul> </ul>
                    .append( $("<li/>")             //  <ul> <li> </li> </ul>
                        .append( $("<button/>")     //  <ul> <li> <button> </button> </li> </ul>
                            .addClass("btnAnswer")  //  <ul> <li> <button class="btnAnswer"> </button> </li> </ul>
                            .addClass("btn")        //  <ul> <li> <button class="btnAnswer"> </button> </li> </ul>
                            .val("pass")            //  <ul> <li> <button class="btnAnswer" value="word"> </button> </li> </ul>
                            .html("Don't Know / Pass")           //  <ul> <li> <button class="btnAnswer" value="word">word</button> </li> </ul>
                        )
                    );

                // Insert the list onto the screen.
                $("#gameArea").html("<div id='playerScreenNameContainer'><img id='playerSockIcon' src='img/icon_" + App.Player.myStockIconNum + "_nobg.png'><span style='padding-left: 30px'>" + App.Player.myName + "</span></div>").append($list);
            },

            /**
             * Show the "Game Over" screen.
             */
            endGame: function() {
              // start transitions
              App.backgroundFadeSwap(1);

              setTimeout(function () {
                $(".gameOver").css("color", "white");
              }, 750);

              App.$gameArea
                .html("<div class='gameOver'><b>Game over!</b></div>");

              // Add a rematch and return button to the 'host' player (first entrant in lobby)
              if (App.Player.hostPlayer && (App.mySocketId === App.Player.hostPlayer.mySocketId)) {
                App.$gameArea.append(App.$endGameOptions);
              }
              else {
                App.$gameArea.append("<div class='gameOver blinker'>Waiting for <b>" + App.Player.hostPlayer.playerName + "</b> to start<br>a rematch or a new game...</div>");
              }
            }
        },


        /* **************************
                  UTILITY CODE
           ************************** */

        /**
         * Display the countdown timer on the Host screen
         *
         * @param $el The container element for the countdown timer
         * @param startTime
         * @param callback The function to call when the timer ends.
         */
        countDown: function ($el, startTime, callback) {
            // Display the starting time on the screen.
            if (App.$scrollingBackground.css("display") !== "none") {
              // change its color only when the scrolling BG is visible
              $el.css("color", "white");
            }
            $el.html("<b>Get Ready!</b><br><br>The game will begin in:<br><b>" + startTime + "</b>");
            App.doTextFit("#triviaQuestion");

            // Start a 1 second timer
            let timer = setInterval(countItDown, 1000);

            // start fade in/out transition
            if (App.$scrollingBackground.css("display") !== "none") {
              App.backgroundFadeSwap(startTime);
            }

            // Decrement the displayed timer value on each "tick"
            function countItDown() {
                startTime -= 1;
                $el.html("<b>Get Ready!</b><br><br>The game will begin in:<br><b>" + startTime + "</b>");
                App.doTextFit("#triviaQuestion");

                if (startTime == 3) {
                    // strip text of white font color (revert to black for question)
                    $el.css("color", "");
                }

                if (startTime <= 0) {
                    // Timer's finished. Do the callback
                    clearInterval(timer);
                    callback();
                    return;
                }
            }

        },

        /**
         * Make the text inside the given element as big as possible
         * See: https://github.com/STRML/textFit
         *
         * @param el The parent element of some text
         */
        doTextFit: function(el) {
            textFit(
                $(el)[0],
                {
                    alignHoriz: true,
                    alignVert: false,
                    widthOnly: true,
                    reProcess: true,
                    detectMultiLine: true,
                    multiLine: true,
                    maxFontSize: 40
                }
            );
        },

        backgroundFadeSwap: function(swapDuration) {
          // Swaps the scrolling background with the solid background (in seconds)
          App.$scrollingBackground.fadeToggle(swapDuration * 1000); // transitions the top element in and out
        },

        getRandomStockIconNum: function () {
          let iconNum = Math.floor(Math.random() * (Math.floor(7) - Math.ceil(0) + 1) + Math.ceil(0));

          // check if icon is already being used. if it is, use another one
          if ($("#iconNum" + iconNum.toString()).length) {
            return App.getRandomStockIconNum();
          }

          return iconNum;
        },

        getHighestScoreIndexes: function (roster) {
          let scoreArray = [];
          roster.forEach(entry => scoreArray.push(entry.score));

          const max = Math.max(...scoreArray);
          const maxIndexes = [];
          for (let index = 0; index < scoreArray.length; index++) {
            if (scoreArray[index] == max) {
              maxIndexes.push(index);
            }
          }
          // at least one entry will be in the array
          return maxIndexes;
        }

    };

    IO.init();
    App.init();

}
($));
