const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const env = require('./config/env');
const { supabasePublic } = require('./lib/supabase');
const { notFoundHandler, errorHandler } = require('./middleware/errors');

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin(origin, callback) {
    // Allow server-to-server / curl (no Origin header).
    if (!origin) return callback(null, true);
    if (env.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
};

const io = new Server(server, { cors: corsOptions });

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (req, res) =>
  res.json({ ok: true, env: env.nodeEnv, time: new Date().toISOString() })
);

/**
 * Socket connections must present a valid Supabase access token. The old
 * server accepted any anonymous connection.
 */
io.use(async (socket, next) => {
  const token =
    (socket.handshake.auth && socket.handshake.auth.token) ||
    (socket.handshake.headers.authorization || '').replace(/^Bearer /, '');

  if (!token) return next(new Error('Authentication required'));

  const { data, error } = await supabasePublic.auth.getUser(token);
  if (error || !data || !data.user) return next(new Error('Invalid or expired token'));

  socket.data.userId = data.user.id;
  next();
});

io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

app.set('io', io);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/assessment', require('./routes/assessment'));
app.use('/api/leaderboard', require('./routes/leaderboard'));

app.use(notFoundHandler);
app.use(errorHandler);

server.listen(env.port, () => {
  console.log(`[server] listening on http://localhost:${env.port} (${env.nodeEnv})`);
  console.log(`[server] CORS origins: ${env.corsOrigins.join(', ')}`);
});

module.exports = { app, server };
