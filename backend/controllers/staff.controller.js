const pool = require('../config/database');

// Example: my assigned maintenance
async function myTasks(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id, request_type, description, priority, status, created_at
       FROM maintenance_requests
       WHERE assigned_staff_id = $1
       ORDER BY created_at DESC`, [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

module.exports = { myTasks };
