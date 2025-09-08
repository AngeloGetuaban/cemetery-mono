const express = require('express');
const router = express.Router();
const { addUser, users, updateUser, deleteUser } = require('../controllers/superadmin.controller');
const { verifyToken } = require('../middleware/auth');

router.post('/add-user', verifyToken, addUser);
router.get('/users', verifyToken, users);
router.put('/update-user/:id', verifyToken, updateUser);
router.delete('/delete-user/:id', verifyToken, deleteUser);

module.exports = router;
