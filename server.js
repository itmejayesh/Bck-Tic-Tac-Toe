//import statements
const express = require("express");
const {Server} = require("socket.io");
const {createServer} = require("http");

//server configrations
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
	cors: "https://frnt-tic-tac-toe.vercel.app/",
});

const allUsers = {};
const allRooms = [];

// Socket.IO connection handling
io.on("connection", (socket) => {
	allUsers[socket.id] = {
		socket,
		online: true,
	};

	socket.on("request_to_play", (data) => {
		const currentUser = allUsers[socket.id];
		currentUser.playerName = data.playerName;

		let opponentPlayer;

		for (const key in allUsers) {
			const user = allUsers[key];
			if (user.online && !user.playing && socket.id !== key) {
				opponentPlayer = user;
				break;
			}
		}

		if (opponentPlayer) {
			allRooms.push({
				player1: opponentPlayer,
				player2: currentUser,
			});

			// Emit opponent information along with player turn
			currentUser.socket.emit("OpponentFound", {
				opponentName: opponentPlayer.playerName,
				playingAs: "circle",
			});
			opponentPlayer.socket.emit("OpponentFound", {
				opponentName: currentUser.playerName,
				playingAs: "cross",
			});
			// Recive information from client side
			currentUser.socket.on("gameStateFromClientSide", (data) => {
				opponentPlayer.socket.emit("gameStateFromServerSide", {
					...data,
				});
			});
			opponentPlayer.socket.on("gameStateFromClientSide", (data) => {
				currentUser.socket.emit("gameStateFromServerSide", {
					...data,
				});
			});
		} else {
			currentUser.socket.emit("OpponentNotFound");
		}
	});

	socket.on("disconnect", () => {
		const currentUser = allUsers[socket.id];
		currentUser.online = false;
		currentUser.playing = false;

		for (let index = 0; index < allRooms.length; index++) {
			const {player1, player2} = allRooms[index];

			if (player1.socket.id === socket.id) {
				player2.socket.emit("opponentLeftMatchg");
			}

			if (player2.socket.id === socket.id) {
				player1.socket.emit("opponentLeftMatchg");
			}
		}
	});
});

// Express route for handling GET requests
app.get("/", (req, res) => {
	res.send("Hello, this is the homepage!");
});

// Start the server
httpServer.listen(8000, () => {
	console.log("server is running on:8000");
});
