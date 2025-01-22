const db = require('../config/db');
const BundleModel = require('../models/bundleModel');

exports.getBundles = async (req, res) => {
    try {
        // Tarik data bundle (pake await agar dapat menjadi array bukan Promise)
        const bundles = await BundleModel.getBundles();

        // Tambah detail produk
        const bundleWithProductDetails = await Promise.all(
            bundles.map(async (bundle) => {
                // Query mendapatkan data produk berdasarkan product_id
                const [productData] = await db.query(`SELECT * FROM products WHERE id = ?`, [bundle.product_id]);
                return {
                    ...bundle,
                    data: productData.length > 0 ? productData[0] : null, // Tampilkan data produk jika ada
                };
            })
        );

        res.status(200).json(bundleWithProductDetails);
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
        const [duplicateBundle] = await db.query(
            `SELECT * FROM bundles WHERE name = ? AND product_id = ?`,
            [name, product_id]
        );
        if (duplicateBundle.length > 0) {
            return res.status(400).json({
                message: 'Failed to create bundle',
                status: 400,
                error: `A bundle with the name "${name}" already exists for the same product`,
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
                description,
                product_details: product[0],
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getBundleById = async (req, res) => {
    try {
        const {id} = req.params;
        const bundle = await BundleModel.getBundleById(id);

        // Jika bundle tidak ditemukan
        if (!bundle || (Array.isArray(bundle) && bundle.length === 0)) {
            return res.status(404).json({
                message: 'Bundle not found',
                status: 404,
                error: 'Bundle not found',
            });
        }

        res.status(200).json(bundle);
    } catch (error) {
        res.status(500).json({ error:error.message });
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

        // Mengecek stok produk
        const [product] = await db.query(`SELECT * FROM products WHERE id = ?`, [product_id]);
        if (!product.length) {
            return res.status(404).json({
                message: 'Failed to update bundle',
                status: 404,
                error: 'Product not found',
            });
        }

        // Validasi jika stok melebihi stok produk
        if (stock > product[0].stock) {
            return res.status(400).json({
                message: 'Failed to update bundle',
                status: 400,
                error: 'Stock exceeds available product stock',
            });
        }

        // Validasi bundle kalo ada yang sama untuk produk yang sama
        const [duplicateBundle] = await db.query(
            `SELECT * FROM bundles WHERE name = ? AND product_id = ? AND id != ?`,
            [name, product_id, id]
        );
        if (duplicateBundle.length > 0) {
            return res.status(400).json({
                message: 'Failed to update bundle',
                status: 400,
                error: `A bundle with the name "${name}" already exists for the same product`,
            });
        }

        // Update bundle
        const result = await BundleModel.updateBundle(id, { name, product_id, price, stock, description });

        // Jika id tidak ditemukan, return error not found
        if (result && result.affectedRows === 0) {
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
                description,
                product_details: product[0],
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};