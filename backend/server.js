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

// security & body parsing
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// logs
app.use(morgan('dev'));

// serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// root route – check DB connection
app.get('/', async (req, res) => {
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

// health only (no DB)
app.get('/health', (_req, res) => res.json({ ok: true }));

// api
app.use('/api', api);

// 404 + error
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 API listening on http://localhost:${PORT}`));
