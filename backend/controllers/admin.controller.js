const pool = require('../config/database');

// Example: dashboard metrics
async function dashboardMetrics(req, res, next) {
  try {
    const sql = `
      SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM plots) AS plots,
        (SELECT COUNT(*) FROM graves) AS graves,
        (SELECT COUNT(*) FROM maintenance_requests WHERE status <> 'closed') AS open_maintenance
    `;
    const { rows } = await pool.query(sql);
    res.json(rows[0]);
  } catch (err) { next(err); }
}

module.exports = { dashboardMetrics };
