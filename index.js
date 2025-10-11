const express = require("express");
const socketio = require("socket.io");
const http = require("http");
const cors = require("cors");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT;

const router = require("./router");
const { add_user, get_user, remove_user, get_room_users } = require("./users");

app.get('/', (req, res) => {
  res.send("Server is up and running :)")
})

// midlewares
app.use(cors());
app.use(express.json()); 
app.use(router);

const io = socketio(server, {
    cors: {
        origin: "https://bat4chat.vercel.app",
        methods: ["GET", "POST"], 
    },
});

io.on("connection", (socket) => {
    socket.on("join", ({ name, room, color }, callback) => {
        const { error, user } = add_user({ id: socket.id, name, room, color });
    
        if (error) {
            return callback(error); 
        }
    
        socket.emit('message', { user: 'Bat', text: `${user.name}, welcome to room ${user.room}` });
        socket.broadcast.to(user.room).emit('message', { user: 'Bat', text: `${user.name} has joined` });
    
        socket.join(user.room);
    
        io.to(user.room).emit('roomInfo', { room: user.room, users: get_room_users(user.room) });
    
        callback();
    });
    
    socket.on("send", (message, callback) => {
        const user = get_user(socket.id);
    
        if (user) {
            io.to(user.room).emit('message', { user: user.name, text: message, color: user.color });
            io.to(user.room).emit('roomInfo', { room: user.room, users: get_room_users(user.room) });
        } else {
            console.warn(`User not found for socket ID: ${socket.id}`);
            return callback({ error: "User not found" });
        }
    
        callback();
    });
    
    socket.on("disconnect", () => {
        const user = remove_user(socket.id);

        if (user) {
            io.to(user.room).emit('message', { user: "Bat", text: `${user.name} has left` });
            io.to(user.room).emit('roomInfo', { room: user.room, users: get_room_users(user.room) });
        } else {
            console.warn(`User not found during disconnect for socket ID: ${socket.id}`);
        }
    });
});

server.listen(port, () => console.log(`Listening on port ${port}...`));
