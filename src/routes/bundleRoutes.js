const express = require('express');
const BundleController = require('../controllers/bundleController');

const router = express.Router();

router.post('/', BundleController.createBundle);
router.get('/:id',BundleController.getBundleById);
router.put('/:id', BundleController.updateBundle)
router.get('/', BundleController.getBundles);

module.exports = router;