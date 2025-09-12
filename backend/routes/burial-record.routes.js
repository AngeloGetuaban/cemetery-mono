const express = require('express');
const router = express.Router();
const BurialRecordsController = require('../controllers/burial-records.controller');

router.get('/graves', BurialRecordsController.getBurialRecords);

module.exports = router;
