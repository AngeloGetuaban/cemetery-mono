// backend/routes/plot.routes.js
const express = require('express');
const router = express.Router();
const plotController = require('../controllers/plot.controller');

router.get('/road-plots', plotController.getRoadPlotsGeoJSON);
router.get('/road-plots/:id', plotController.getRoadPlotById);

router.get('/building-plots', plotController.getBuildingPlotsGeoJSON);
router.get('/building-plots/:id', plotController.getBuildingPlotById);

router.get('/', plotController.getPlotsGeoJSON);
router.get('/:id', plotController.getPlotById);

module.exports = router;
