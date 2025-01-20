const express = require('express');
const ProductController = require('../controllers/productController');

const router = express.Router();

router.post('/', ProductController.createProduct);
router.put('/:id', ProductController.updateProduct);
router.get('/', ProductController.getProducts);

module.exports = router;