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

        // Validasi input wajib diisi
        let fieldsName = ['name', 'product_id', 'price', 'stock', 'description']
        for (let index = 0; index < fieldsName.length; index++) {
            const item = req.body[fieldsName[index]];
            if (!item) {
                return res.status(400).json({
                    message: 'Failed to update bundle',
                    status: 400,
                    error: `${fieldsName[index]} field are required`,
                })
            }
        }

        // Cek apakah produk terkait ada
        const [product] = await db.query('SELECT * FROM products WHERE id = ?', [product_id]);
        if (!product.length) {
            return res.status(404).json({
                message: 'Failed to create bundle',
                status: 404,
                error: 'Product not found',
            });
        }

        // Validasi stok produk
        if (stock > product[0].stock) {
            return res.status(400).json({
                message: 'Failed to create bundle',
                status: 400,
                error: 'Stock exceeds available product stock',
            });
        }

        // Validasi jika ada nama bundle yang sama untuk produk terkait
        const [duplicateBundle] = await db.query(
            'SELECT * FROM bundles WHERE name = ? AND product_id = ?',
            [name, product_id]
        );
        if (duplicateBundle.length > 0) {
            return res.status(400).json({
                message: 'Failed to create bundle',
                status: 400,
                error: `A bundle with the name "${name}" already exists for the same product`,
            });
        }

        // Buat bundle baru
        const result = await BundleModel.createBundle({ name, product_id, price, stock, description });

        // Respon sukses
        res.status(201).json({
            message: 'Bundle created successfully',
            status: 201,
            data: {
                id: result.insertId,
                name,
                product_id,
                price,
                stock,
                description,
            },
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

exports.getBundleByProductId = async (req, res) => {
    try {
        const { product_id } = req.params;
        console.log("Response Req:", req.params);
        console.log("Response Product Id:", req);
        const bundle = await BundleModel.getBundleByProductId(product_id);

        // Jika bundle tidak ditemukan
        if (!bundle || (Array.isArray(bundle) && bundle.length === 0)) {
            return res.status(404).json({
                message: 'Bundle from product not found',
                status: 404,
                error: 'Bundle from product not found',
            });
        }

        res.status(200).json(bundle);
    } catch (error) {
        res.status(500).json({ error:error.message });
    }
};

// Menggunakan Transaction
exports.updateBundle = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, product_id, price, stock, description } = req.body;

        // Validasi request tidak boleh kosong
        // if (!name || !product_id || !price || !stock || !description) {
        //     return res.status(400).json({
        //         message: 'Failed to update bundle',
        //         status: 400,
        //         error: `${name, product_id, price, stock, description} fields are required`,
        //     })
        // }

        let fieldsName = ['name', 'product_id', 'price', 'stock', 'description']
        for (let index = 0; index < fieldsName.length; index++) {
            const item = req.body[fieldsName[index]];
            if (!item) {
                return res.status(400).json({
                    message: 'Failed to update bundle',
                    status: 400,
                    error: `${fieldsName[index]} field are required`,
                })
            }
        }

        // Mulai transaction
        await db.query('START TRANSACTION');

        // Mengecek stok produk
        const [product] = await db.query(`SELECT * FROM products WHERE id = ?`, [product_id]);
        if (!product.length) {
            await db.query('ROLLBACK');
            return res.status(404).json({
                message: 'Failed to update bundle',
                status: 404,
                error: 'Product not found',
            });
        }

        // Validasi jika stok melebihi stok produk
        if (stock > product[0].stock) {
            await db.query('ROLLBACK');
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
            await db.query('ROLLBACK');
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
            await db.query('ROLLBACK');
            return res.status(404).json({
                message: 'Failed to update bundle',
                status: 404,
                error: 'Bundle not found'
            });
        }

        // Commit transaction jika semua sukses
        await db.query('COMMIT');

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
        await db.query('ROLLBACK');
        res.status(500).json({
            message: 'Failed to update bundle',
            status: 500,
            error: error.message,
        });
    }
};