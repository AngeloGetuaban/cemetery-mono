const router = require('express').Router();
const { mapInit } = require('../controllers/visitor.controller');

// public example
router.get('/map-init', mapInit);

module.exports = router;
