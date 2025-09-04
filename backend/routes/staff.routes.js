const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { myTasks } = require('../controllers/staff.controller');

router.use(verifyToken, requireRole('staff','admin'));
router.get('/my-tasks', myTasks);

module.exports = router;
