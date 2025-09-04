const router = require('express').Router();

router.use('/superadmin', require('./superadmin.routes'));
router.use('/auth', require('./auth.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/staff', require('./staff.routes'));
router.use('/visitor', require('./visitor.routes'));

module.exports = router;
