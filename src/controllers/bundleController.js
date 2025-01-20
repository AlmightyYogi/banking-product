const db = require('../config/db');
const BundleModel = require('../models/bundleModel');

exports.getBundles = async (req, res) => {
    try {
        const bundles = await BundleModel.getBundles();
        res.status(200).json(bundles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createBundle = async (req, res) => {
    try {
        const { name, product_id, price, stock, description } = req.body;

        // Validasi request tidak boleh kosong
        if (!name || !product_id || !price || !stock || !description) {
            return res.status(400).json({
                message: 'Failed to create bundle',
                status: 400,
                error: 'All fields are required'
            });
        }

        // Mengecek stok produk
        const [product] = await db.query(`SELECT stock FROM products WHERE id = ?`, [product_id]);
        if (!product.length) {
            return res.status(404).json({
                message: 'Failed to create bundle',
                status: 404,
                error: 'Product not found'
            });
        }

        // Validasi jika product yang dipilih melebihi stok
        if (stock > product[0].stock) {
            return res.status(400).json({
                message: 'Failed to create bundle',
                status: 400,
                error: 'Stock exceeds available product stock'
            });
        }

        // Mengecek jika ada bundle dengan name yang sama, tetap berelasi dengan produk berbeda
        const [existingBundle] = await db.query(`SELECT * FROM bundles WHERE name = ? AND product_id != ?`, [name, product_id]);
        if (existingBundle.length > 0) {
            return res.status(400).json({
                message: 'Failed to create bundle',
                status: 400,
                error: `A bundle with the same name already exists for a different product`
            });
        }

        // Update stok produk
        await db.query(`UPDATE products SET stock = ? WHERE id = ?`, [stock, product_id]);

        const result = await BundleModel.createBundle({ name, product_id, price, stock, description });
        
        // Mengembalikan response sesuai request
        res.status(201).json({
            message: 'Bundle created',
            status: 201,
            data: {
                id: result.insertId,
                name,
                product_id,
                price,
                stock,
                description
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateBundle = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, product_id, price, stock, description } = req.body;

        // Validasi request tidak boleh kosong
        if (!name || !product_id || !price || !stock || !description) {
            return res.status(400).json({
                message: 'Failed to update bundle',
                status: 400,
                error: 'All fields are required'
            });
        }

        // Update bundle
        const result = await db.query(
            `UPDATE bundles SET name = ?, product_id = ?, price = ?, stock = ?, description = ? WHERE id = ?`,
            [name, product_id, price, stock, description, id]
        );

        // Jika id tidak ditemukan, return error not found
        if (result[0].affectedRows === 0) {
            return res.status(404).json({
                message: 'Failed to update bundle',
                status: 404,
                error: 'Bundle not found'
            });
        }

        // Update stok produk terkait
        await db.query(`UPDATE products SET stock = ? WHERE id = ?`, [stock, product_id]);

        res.status(200).json({
            message: 'Bundle updated successfully',
            status: 200,
            data: {
                id,
                name,
                product_id,
                price,
                stock,
                description
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};