const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: "*",
    methods: ["GET", "POST"]
  } 
});

// Статические файлы
app.use(express.static(path.join(__dirname, 'calculator')));

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'calculator', 'guess-the-fact-online.html'));
});

// Хранение игр
let games = {};

// Socket.IO обработчики
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Присоединение к игре
  socket.on('joinGame', ({ roomId, playerId, name, avatar, isHost }) => {
    socket.join(roomId);
    
    if (!games[roomId]) {
      games[roomId] = {
        players: [],
        facts: [],
        currentFactIndex: 0,
        theme: '',
        phase: 'lobby',
        guesses: {},
        roundResults: [],
        hostId: null
      };
    }

    const game = games[roomId];
    
    // Проверяем, не занят ли аватар
    const avatarTaken = game.players.some(p => p.avatar === avatar);
    if (avatarTaken) {
      socket.emit('error', 'Этот аватар уже занят');
      return;
    }

    const player = {
      id: playerId,
      name: name,
      avatar: avatar,
      isHost: isHost,
      score: 0
    };

    if (isHost && !game.hostId) {
      game.hostId = playerId;
    }

    game.players.push(player);
    
    // Уведомляем всех в комнате
    io.to(roomId).emit('gameState', game);
    io.to(roomId).emit('playerJoined', player);
    
    console.log(`Player ${name} joined room ${roomId}`);
  });

  // Начало игры
  socket.on('startGame', ({ roomId }) => {
    const game = games[roomId];
    if (!game) return;

    game.phase = 'setup';
    io.to(roomId).emit('gameStarted');
    io.to(roomId).emit('gameState', game);
  });

  // Начало раунда
  socket.on('startRound', ({ roomId, theme, facts }) => {
    const game = games[roomId];
    if (!game) return;

    game.theme = theme;
    game.facts = facts;
    game.currentFactIndex = 0;
    game.phase = 'guessing';
    game.guesses = {};

    io.to(roomId).emit('gameState', game);
    io.to(roomId).emit('roundStarted', facts[0]);
  });

  // Угадывание
  socket.on('submitGuess', ({ roomId, playerId, guess }) => {
    const game = games[roomId];
    if (!game) return;

    game.guesses[playerId] = guess;

    // Проверяем, все ли угадали
    const allGuessed = game.players.every(player => 
      game.guesses[player.id] !== undefined
    );

    if (allGuessed) {
      // Вычисляем результаты раунда
      const currentFact = game.facts[game.currentFactIndex];
      const factAuthor = game.players.find(p => p.id === currentFact.authorId);
      
      let correct = 0, wrong = 0;
      game.players.forEach(player => {
        if (game.guesses[player.id] === factAuthor.id) {
          correct++;
          player.score++;
        } else {
          wrong++;
        }
      });

      const roundResult = {
        fact: currentFact,
        author: factAuthor.name,
        correct: correct,
        wrong: wrong,
        guesses: game.guesses
      };

      game.roundResults.push(roundResult);
      game.phase = 'results';

      io.to(roomId).emit('allGuessed');
      io.to(roomId).emit('roundResults', roundResult);
      io.to(roomId).emit('gameState', game);
    }
  });

  // Следующий раунд
  socket.on('nextRound', ({ roomId }) => {
    const game = games[roomId];
    if (!game) return;

    game.currentFactIndex++;
    
    if (game.currentFactIndex >= game.facts.length) {
      // Игра закончена
      game.phase = 'finished';
      const finalResults = game.players
        .sort((a, b) => b.score - a.score)
        .map((player, index) => ({ ...player, place: index + 1 }));
      
      io.to(roomId).emit('gameFinished', finalResults);
    } else {
      // Следующий факт
      game.phase = 'guessing';
      game.guesses = {};
      io.to(roomId).emit('roundStarted', game.facts[game.currentFactIndex]);
      io.to(roomId).emit('gameState', game);
    }
  });

  // Завершение игры
  socket.on('finishGame', ({ roomId }) => {
    const game = games[roomId];
    if (!game) return;

    const finalResults = game.players
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({ ...player, place: index + 1 }));
    
    io.to(roomId).emit('gameFinished', finalResults);
  });

  // Отключение игрока
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Удаляем игрока из всех игр
    Object.keys(games).forEach(roomId => {
      const game = games[roomId];
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        const player = game.players[playerIndex];
        game.players.splice(playerIndex, 1);
        
        // Если это был ведущий, назначаем нового
        if (player.isHost && game.players.length > 0) {
          game.players[0].isHost = true;
          game.hostId = game.players[0].id;
        }
        
        // Если игроков не осталось, удаляем игру
        if (game.players.length === 0) {
          delete games[roomId];
        } else {
          io.to(roomId).emit('playerLeft', socket.id);
          io.to(roomId).emit('gameState', game);
        }
      }
    });
  });
});

// Очистка старых игр каждые 30 минут
setInterval(() => {
  const now = Date.now();
  Object.keys(games).forEach(roomId => {
    const game = games[roomId];
    if (now - game.lastActivity > 30 * 60 * 1000) { // 30 минут
      delete games[roomId];
      console.log(`Cleaned up inactive game: ${roomId}`);
    }
  });
}, 30 * 60 * 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 