import { io } from "socket.io-client";

// Connect to backend server (defaulting to localhost:5000)
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

export const socket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});

socket.on("connect", () => {
  console.log("🟢 Connected to ClearPath Real-Time Server:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("🔴 Disconnected from ClearPath Server:", reason);
});
