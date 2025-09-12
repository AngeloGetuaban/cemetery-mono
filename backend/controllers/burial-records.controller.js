// backend/controllers/plot.controller.js
const pool = require('../config/database');


async function getBurialRecords(req, res, next) {
    try {
      // optional pagination: /api/graves?limit=100&offset=0
      const limit = req.query?.limit ? Number(req.query.limit) : null;
      const offset = req.query?.offset ? Number(req.query.offset) : null;
  
      let sql = `SELECT * FROM graves ORDER BY id DESC`;
      const params = [];
  
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
    getBurialRecords
};