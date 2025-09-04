// backend/controllers/auth.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');

const ROLE_SET = new Set(['super_admin', 'admin', 'staff', 'visitor']);

function sign(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function sanitizeUser(u) {
  return {
    id: u.id,
    uid: u.uid,
    username: u.username,
    email: u.email,
    role: u.role,
    first_name: u.first_name,
    last_name: u.last_name,
    phone: u.phone,
    address: u.address,
    is_active: u.is_active,
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
}

async function login(req, res, next) {
  try {
    const { usernameOrEmail, password } = req.body || {};
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: 'usernameOrEmail and password are required' });
    }

    const q = `
      SELECT id, uid, username, email, password_str,
             role, first_name, last_name, phone, address, is_active, created_at, updated_at
      FROM users
      WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)
      LIMIT 1
    `;
    const { rows } = await pool.query(q, [usernameOrEmail]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const u = rows[0];
    if (u.is_active === false) return res.status(403).json({ error: 'Account is inactive' });

    if (u.password_str !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = sign({ id: u.id, role: u.role, username: u.usernames, email: u.email });
    return res.json({ token, user: sanitizeUser(u) });
  } catch (err) {
    next(err);
  }
}


async function register(req, res, next) {
  try {
    const {
      username,
      email,
      password,
      first_name,
      last_name,
      phone,
      address,
      role,
    } = req.body || {};

    if (!username || !email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: 'username, email, password, first_name, last_name are required' });
    }

    // Determine effective role
    let effectiveRole = 'visitor';
    const actor = req.user; // set by auth middleware if present
    if (actor && (actor.role === 'admin' || actor.role === 'super_admin')) {
      if (role && ROLE_SET.has(role)) effectiveRole = role;
    }

    const hash = await bcrypt.hash(password, 10);

    const q = `
      INSERT INTO users
        (username, email, password_hash, password_str, role, first_name, last_name, phone, address, is_active)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9, TRUE)
      RETURNING id, uid, username, email, role, first_name, last_name, phone, address, is_active, created_at, updated_at
    `;
    const params = [
      username,
      email,
      hash,
      password,     
      effectiveRole,
      first_name,
      last_name,
      phone || null,
      address || null,
    ];

    const { rows } = await pool.query(q, params);
    const created = rows[0];
    return res.status(201).json({ user: sanitizeUser(created) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    if (req.user?.id) {
      await pool.query('UPDATE users SET updated_at = NOW() WHERE id = $1', [req.user.id]);
    }
    return res.json({ ok: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const { rows } = await pool.query(
      `SELECT id, uid, username, email, role, first_name, last_name, phone, address, is_active, created_at, updated_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: sanitizeUser(rows[0]) });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /auth/profile
 * Body: { first_name?, last_name?, phone?, address? }
 */
async function updateProfile(req, res, next) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const { first_name, last_name, phone, address } = req.body || {};
    const sets = [];
    const vals = [];
    let i = 1;

    if (typeof first_name !== 'undefined') { sets.push(`first_name = $${i++}`); vals.push(first_name); }
    if (typeof last_name  !== 'undefined') { sets.push(`last_name  = $${i++}`); vals.push(last_name); }
    if (typeof phone      !== 'undefined') { sets.push(`phone      = $${i++}`); vals.push(phone); }
    if (typeof address    !== 'undefined') { sets.push(`address    = $${i++}`); vals.push(address); }

    if (!sets.length) return res.status(400).json({ error: 'No fields to update' });

    const q = `
      UPDATE users SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = $${i}
      RETURNING id, uid, username, email, role, first_name, last_name, phone, address, is_active, created_at, updated_at
    `;
    vals.push(req.user.id);

    const { rows } = await pool.query(q, vals);
    return res.json({ user: sanitizeUser(rows[0]) });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username or email already exists' });
    next(err);
  }
}

/**
 * POST /auth/change-password
 * Body: { current_password, new_password }
 */
async function changePassword(req, res, next) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const { current_password, new_password } = req.body || {};
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password and new_password are required' });
    }

    const { rows } = await pool.query(
      `SELECT id, password_hash, password_str FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const ok = await verifyPassword(current_password, rows[0]);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query(
      `UPDATE users SET password_hash = $1, password_str = $2, updated_at = NOW() WHERE id = $3`,
      [newHash, new_password, req.user.id] // keep password_str only for dev
    );

    return res.json({ ok: true, message: 'Password updated' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  register,
  logout,
  me,
  updateProfile,
  changePassword,
};
