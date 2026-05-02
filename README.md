# WhatsApp Web Clone — MERN + Socket.io

A production-ready real-time chat application faithfully replicating WhatsApp Web's core experience, built with the MERN stack and Socket.io.

![WhatsApp Clone](https://img.shields.io/badge/Stack-MERN-brightgreen) ![Socket.io](https://img.shields.io/badge/Real--time-Socket.io-black) ![License](https://img.shields.io/badge/License-MIT-blue)

---

## ✨ Features

- **Real-time messaging** via Socket.io WebSockets
- **JWT authentication** (register / login)
- **Two-panel layout** — sidebar contact list + chat window
- **Online / offline status** with live updates
- **Typing indicators** — see when someone is typing
- **Unread message badges** per conversation
- **Read receipts** (blue double-ticks ✓✓)
- **Message timestamps** with date separators
- **Persistent chat history** in MongoDB
- **Auto-scroll** to latest message
- **Responsive** — mobile-friendly layout

---

## 🗂 Project Structure

```
whatsapp-clone/
├── backend/
│   ├── models/
│   │   ├── User.js          # Mongoose User schema
│   │   └── Message.js       # Mongoose Message schema
│   ├── routes/
│   │   ├── auth.js          # POST /register, POST /login, GET /me
│   │   ├── users.js         # GET /users, GET /users/:id
│   │   └── messages.js      # GET /messages/:userId, POST /messages
│   ├── middleware/
│   │   └── auth.js          # JWT protect middleware
│   ├── socket/
│   │   └── socketManager.js # All Socket.io event handlers
│   ├── server.js            # Express + Socket.io bootstrap
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── Sidebar.js        # Contact list + Avatar component
    │   │   ├── ChatWindow.js     # Messages + input area
    │   │   └── ProtectedRoute.js # Auth guard HOC
    │   ├── context/
    │   │   ├── AuthContext.js    # Auth state + Socket init
    │   │   └── ChatContext.js    # Messages, users, socket events
    │   ├── pages/
    │   │   ├── AuthPage.js       # Login / Register
    │   │   └── ChatPage.js       # Main chat layout
    │   ├── utils/
    │   │   ├── api.js            # Axios instance + API helpers
    │   │   └── socket.js         # Socket.io singleton
    │   ├── App.js
    │   ├── App.css              # All styles (dark WhatsApp theme)
    │   └── index.js
    ├── .env.example
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | >= 16.x |
| npm | >= 8.x |
| MongoDB | >= 5.x (local) OR MongoDB Atlas (cloud) |

---

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/whatsapp-clone.git
cd whatsapp-clone
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Copy and configure the environment file:

```bash
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/whatsapp-clone
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
CLIENT_URL=http://localhost:3000
```

> **MongoDB Atlas:** Replace `MONGO_URI` with your Atlas connection string:
> `mongodb+srv://username:password@cluster.mongodb.net/whatsapp-clone`

Start the backend:

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The server starts on **http://localhost:5000**

---

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
```

Copy and configure the environment file:

```bash
cp .env.example .env
```

Edit `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

Start the frontend:

```bash
npm start
```

The app opens at **http://localhost:3000**

---

## 🔌 API Reference

### Auth

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | `{ username, email, password }` | Register new user |
| POST | `/api/auth/login` | `{ email, password }` | Login, returns JWT |
| GET | `/api/auth/me` | — | Get current user (auth required) |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Get all users except self |
| GET | `/api/users/:id` | Get a specific user |
| PUT | `/api/users/profile` | Update profile |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/:userId` | Get conversation messages |
| POST | `/api/messages` | Send message (REST fallback) |
| GET | `/api/messages/unread/count` | Get unread counts per sender |

---

## ⚡ Socket.io Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `joinRoom` | `{ receiverId }` | Join a private chat room |
| `leaveRoom` | `{ receiverId }` | Leave a chat room |
| `sendMessage` | `{ receiverId, content }` | Send a real-time message |
| `typing` | `{ receiverId }` | Start typing indicator |
| `stopTyping` | `{ receiverId }` | Stop typing indicator |
| `markRead` | `{ senderId }` | Mark messages as read |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `newMessage` | `Message` | Incoming new message |
| `onlineUsers` | `string[]` | Current online user IDs |
| `userOnline` | `{ userId, username }` | A user came online |
| `userOffline` | `{ userId, lastSeen }` | A user went offline |
| `userTyping` | `{ userId, username }` | Someone is typing |
| `userStopTyping` | `{ userId }` | Someone stopped typing |
| `messagesRead` | `{ byUserId }` | Messages were read |
| `messageNotification` | `{ message, sender }` | New message notification |

---

## 🗄 Database Schemas

### User

```js
{
  username:  String (unique, 3–30 chars),
  email:     String (unique),
  password:  String (bcrypt hashed),
  avatar:    String (URL, optional),
  status:    String (bio, max 139 chars),
  isOnline:  Boolean,
  lastSeen:  Date,
  socketId:  String (transient)
}
```

### Message

```js
{
  sender:      ObjectId → User,
  receiver:    ObjectId → User,
  content:     String (max 4096 chars),
  messageType: Enum ['text', 'image', 'file'],
  isRead:      Boolean,
  readAt:      Date,
  roomId:      String (sorted "userId1_userId2", indexed)
}
```

---

## 🧪 Testing the App

1. Open **two browser windows** (or use Incognito for the second)
2. **Register two accounts** — e.g., `alice@test.com` and `bob@test.com`
3. In each window, **log in as a different user**
4. Click on the other user in the sidebar to start chatting
5. Messages appear in real-time in both windows
6. Watch for **typing indicators**, **online status**, and **read receipts**

---

## 🔧 Troubleshooting

| Issue | Fix |
|-------|-----|
| `MongoDB connection error` | Ensure MongoDB is running locally (`mongod`) or check Atlas URI |
| `CORS error` | Verify `CLIENT_URL` in backend `.env` matches your frontend URL |
| `Socket auth error` | Check that `REACT_APP_SOCKET_URL` points to the backend |
| `Port already in use` | Change `PORT` in backend `.env` and update frontend `.env` |
| `npm install` fails | Ensure Node >= 16: `node --version` |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router 6, Axios, date-fns |
| Backend | Node.js, Express 4 |
| Real-time | Socket.io 4 |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcrypt |
| Styling | Pure CSS (WhatsApp dark theme) |

---

## 📄 License

MIT License — free to use, modify, and distribute.
