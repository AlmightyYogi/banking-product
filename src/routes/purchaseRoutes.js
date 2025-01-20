const express = require('express');
const db = require('../config/db');
const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { products, bundles } = req.body;

        let totalCost = 0;

        for (const product of products) {
            const [result] = await db.query(`SELECT price, stock FROM products WHERE id = ?`, [product.id]);
            if (!result.length) {
                return res.status(404).json({ message: `Product with ID ${product.id} not found` });
            }
            if (result[0].stock < product.quantity) {
                return res.status(400).json({ message: `Not enough stock for product ID ${product.id}` });
            }
            totalCost += result[0].price * product.quantity;
            // Update stok produk setelah pembelian
            await db.query(`UPDATE products SET stock = stock - ? WHERE id = ?`, [product.quantity, product.id]);
        }

        for (const bundle of bundles) {
            const [result] = await db.query(`SELECT price, stock FROM bundles WHERE id = ?`, [bundle.id]);
            if (!result.length) {
                return res.status(404).json({ message: `Bundle with ID ${bundle.id} not found` });
            }
            if (result[0].stock < bundle.quantity) {
                return res.status(400).json({ message: `Not enough stock for bundle ID ${bundle.id}` });
            }
            totalCost += result[0].price * bundle.quantity;
            // Update stok bundle setelah pembelian
            await db.query(`UPDATE bundles SET stock = stock - ? WHERE id = ?`, [bundle.quantity, bundle.id]);
        }

        res.status(200).json({ totalCost });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;