// backend/controllers/plot.controller.js
const pool = require('../config/database');

async function getBurialRecords(req, res, next) {
  try {
    const familyId = req.params?.id || req.query?.family_contact || null;
    const limit = req.query?.limit ? Number(req.query.limit) : null;
    const offset = req.query?.offset ? Number(req.query.offset) : null;

    let sql = `
      SELECT g.*,
             u.first_name || ' ' || u.last_name AS family_contact_name
      FROM graves g
      LEFT JOIN users u ON g.family_contact = u.id
    `;

    const params = [];
    if (familyId) {
      params.push(familyId);
      sql += ` WHERE g.family_contact = $${params.length}`;
    }

    sql += ` ORDER BY g.id DESC`;

    if (Number.isFinite(limit) && limit > 0) {
      params.push(limit);
      sql += ` LIMIT $${params.length}`;
      if (Number.isFinite(offset) && offset >= 0) {
        params.push(offset);
        sql += ` OFFSET $${params.length}`;
      }
    }

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getBurialRecords,
};
