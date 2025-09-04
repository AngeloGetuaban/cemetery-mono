const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { dashboardMetrics } = require('../controllers/admin.controller');

router.use(verifyToken, requireRole('admin'));

// GET /admin/metrics
router.get('/metrics', dashboardMetrics);

module.exports = router;
