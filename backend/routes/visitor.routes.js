const express = require('express');
const router = express.Router();

const {
  createBurialRequest,
  createMaintenanceRequest,
  getBurialRequests,
  getMaintenanceRequests,
  cancelBurialRequest,
  cancelMaintenanceRequest,
} = require('../controllers/visitor.controller');

// ---------------- Burial Requests ----------------
router.post('/request-burial', createBurialRequest);

router.get('/my-burial-requests/:family_contact', getBurialRequests);

router.patch('/request-burial/cancel/:id', cancelBurialRequest);

router.post('/request-maintenance', createMaintenanceRequest);

router.get('/my-maintenance-requests/:family_contact', getMaintenanceRequests);

router.patch('/request-maintenance/cancel/:id', cancelMaintenanceRequest);

module.exports = router;
