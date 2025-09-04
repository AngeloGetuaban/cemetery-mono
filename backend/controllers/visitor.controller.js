const pool = require('../config/database');

// Example: map bounds + nearby plots
async function mapInit(req, res, next) {
  try {
    const b = await pool.query('SELECT * FROM get_cemetery_bounds()');
    res.json({
      bounds: b.rows[0] || null
    });
  } catch (err) { next(err); }
}

module.exports = { mapInit };
