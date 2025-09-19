// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { notFound, errorHandler } = require('./middleware/errorHandler');
const api = require('./routes');
const pool = require('./config/database');

const app = express();

// ---- security
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // allow fetch/XHR/WebSocket to same origin + blob:s
        connectSrc: ["'self'", "blob:"],
        // typical allowances
        imgSrc: ["'self'", "data:", "blob:"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
        // needed if you spawn Web Workers (map libs, etc.)
        workerSrc: ["'self'", "blob:"],
        // (optional) in some browsers childSrc controls workers too
        childSrc: ["'self'", "blob:"],
      },
    },
  })
);
app.use(cors());

// ---- body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- logs
app.use(morgan('dev'));

// ---- serve uploaded images
app.use(
  '/uploads',
  express.static(path.join(process.cwd(), 'uploads'), {
    setHeaders(res) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

// ---- health checks
app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS now');
    res.json({
      ok: true,
      message: '✅ API + DB connection working',
      time: result.rows[0].now,
    });
  } catch (err) {
    console.error('DB health check error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---- API
app.use('/api', api);

// ---- FRONTEND (built React/Vite app)

// --- Serve the built frontend (resolve from backend/ up to repo root)
const ROOT_DIR = path.resolve(__dirname, '..');                 // <repo-root>
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend', 'dist');   // <repo-root>/frontend/dist

app.use(express.static(FRONTEND_DIR));

// SPA fallback for non-API routes
app.get(/^(?!\/api\/|\/uploads\/|\/health$).*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// ---- 404 + error handlers
app.use(notFound);
app.use(errorHandler);

// ---- start
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}/visitor/home`);
});
