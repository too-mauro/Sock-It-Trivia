<div align="center">
  <img src="https://user-images.githubusercontent.com/49416852/145696063-697c28e9-f559-4636-a6c9-00a4c9e34709.png" title="Sock It! Trivia Game" alt="Sock It Trivia Game" width="75%" height="75%">

  # Sock It! Trivia

  An online multiplayer, multi-screen party game that tests your knowledge on random bits of trivia.
  If you like or enjoy this repository, please feel free to leave a star ⭐ to help promote <b>Sock It!</b>
<hr>

  [Installation & Setup](#Installation--Setup) • [How to Play](#How-to-Play) • [License](#License) • [Acknowledgements](#Acknowledgements)

</div>
<hr>

## Installation & Setup
To set up this project:
1. Install Node.js on your computer. Node.js v16 is recommended; refer to the [Node.js website](https://nodejs.org/en/) for help installing.
2. Clone or download this repository: `git clone https://github.com/too-mauro/sock-it-trivia.git`
3. Get the necessary packages installed:
  - Open a command-line application and move to the `sock-it-trivia` folder.
  - Run `npm install`.
4. Start the back-end server: `node index.js`
5. Open a web browser and go to http://127.0.0.1:8080

### Setting up an Optional .env File
An optional .env file can specify a different port number and change the maximum number of rounds (questions) get asked and the maximum number of players who can join a room.
1. In the directory where this repository was cloned, create a new file named `.env`.
2. Enter the following lines in the following format and change the placeholder text with the desired numbers.
```
PORT=<port number to listen>
MAX_ROUNDS=<new maximum question limit>
MAX_PLAYERS=<new maximum player limit>
```
3. Save the file.

<b>** NOTE:</b> Due to trivia API limitations, `MAX_ROUNDS` has a limit of 50. <b>**</b>

## How to Play
### Setup
1. Ensure at least 3 devices can access the application server.
2. Start the <b>Sock It!</b> application.
3. Visit http://your.ip.address:8080 on a large screen device.
4. Click the CREATE button.
5. On a mobile device, visit http://your.ip.address:8080
6. Click JOIN on the mobile device screen.
7. Follow the on-screen instructions to join a game.
8. Find up to three other players and have them repeat steps 5-7 on another mobile device.
9. Once at least two players have joined, press the START button on the first player's screen to start the game.

### Gameplay
1. On the large screen (the game's Host), a question will appear. Each question is worth either 1 point for easy, 2 points for a medium, or 3 points for a hard one.
2. On each player's device, up to five choices will appear.
3. Each player must answer the question on the Host (or press the "Don't Know / Pass" option if they're stuck) within the time limit.
4. The round ends once either the timer runs out or all players have answered the question. All points are either added or subtracted depending on how they answered (incorrect answers get the question's point count deducted).
5. The player(s) with the most points after 15 rounds / questions wins!

## License
<b>Sock It!</b> is currently released under the [GNU GPL v3](https://www.gnu.org/licenses/gpl-3.0.en.html) license.

## Acknowledgements
A special thanks to these people for making this project possible!

- [Eric Terpstra's Anagrammatix](https://github.com/ericterpstra/anagrammatix) for providing a working base for the current code
- [Open Trivia Database](https://opentdb.com/) for sourcing the trivia questions
