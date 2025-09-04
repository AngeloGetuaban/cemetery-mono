const express = require('express');
const router = express.Router();
const { addUser, users } = require('../controllers/superadmin.controller');
const { verifyToken } = require('../middleware/auth'); // if you already have JWT middleware

router.post('/add-user', verifyToken, addUser);
router.get('/users', verifyToken, users);

module.exports = router;
