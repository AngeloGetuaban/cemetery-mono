const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const adminController = require('../controllers/admin.controller');

router.use(verifyToken, requireRole('admin'));

router.get('/metrics', adminController.dashboardMetrics);
router.put("/edit-plot", adminController.editPlots);
router.post('/add-plot', adminController.addPlots);
router.delete('/delete-plot/:id', adminController.deletePlots);

router.post("/add-road-plot", adminController.addRoadPlots);
router.put("/edit-road-plot", adminController.editRoadPlots);
router.delete("/delete-road-plot/:id", adminController.deleteRoadPlots);

router.post("/add-building-plot", adminController.addBuildingPlots);
router.put("/edit-building-plot", adminController.editBuildingPlots);
router.delete("/delete-building-plot/:id", adminController.deleteBuildingPlots);
router.get('/graves', adminController.getBurialRecords);
router.post('/graves', adminController.addBurialRecord);
module.exports = router;
