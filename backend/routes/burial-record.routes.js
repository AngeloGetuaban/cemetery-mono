const express = require('express');
const router = express.Router();
const BurialRecordsController = require('../controllers/burial-records.controller');

router.get('/graves', BurialRecordsController.getBurialRecords);

router.get('/graves/family/:id', BurialRecordsController.getBurialRecords);

module.exports = router;
