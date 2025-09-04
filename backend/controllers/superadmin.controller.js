const pool = require('../config/database');
const bcrypt = require('bcrypt');

// Insert new user
async function addUser(req, res, next) {
  try {
    const {
      username,
      email,
      first_name,
      last_name,
      phone,
      address,
      role = 'admin',
      is_active = 1,
      password_str, // plain 6-char password from frontend
    } = req.body;

    // hash the password before storing
    const hashedPassword = await bcrypt.hash(password_str, 10);

    const sql = `
      INSERT INTO users
      (username, email, first_name, last_name, phone, address, role, is_active, password_str, password_hash)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id, username, email, first_name, last_name, phone, address, role, is_active, created_at
    `;

    const values = [
      username,
      email,
      first_name,
      last_name,
      phone,
      address,
      role,
      is_active,
      password_str,     // store generated password string (optional field for auditing)
      hashedPassword,   // actual secure hash
    ];

    const { rows } = await pool.query(sql, values);

    res.status(201).json({
      success: true,
      message: 'User added successfully',
      user: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

async function users(req, res, next) {
    try {
      // Assuming verifyToken middleware attaches the decoded token to req.user
      const meId =
        req.user?.id || req.user?.user_id || req.user?.sub;
  
      if (!meId) {
        return res.status(400).json({
          success: false,
          message: 'Missing authenticated user id.',
        });
      }
  
      const sql = `
        SELECT
          id,
          uid,
          username,
          email,
          first_name,
          last_name,
          phone,
          address,
          role,
          is_active,
          password_str,
        COALESCE(created_at, NOW()) AS created_at
        FROM users
        WHERE id <> $1
        ORDER BY created_at DESC
      `;
  
      const { rows } = await pool.query(sql, [meId]);
  
      res.json({
        success: true,
        users: rows,
      });
    } catch (err) {
      next(err);
    }
  }
  
module.exports = { addUser, users };
