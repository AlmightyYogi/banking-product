const express = require('express');
const db = require('../config/db');
const router = express.Router();

router.post('/', async (req, res) => {
    // const connection = await db.getConnection();
    const rollbackQueries = [];

    try {
        const { products, bundles } = req.body;

        // Validasi field kosong
        if (!products && !bundles) {
            return res.status(400).json({
                message: 'Failed to process purchase',
                status: 400,
                error: 'All fields are required',
            });
        }

        // Validasi kalo products dan bundles bukan array
        if (!Array.isArray(products) || !Array.isArray(bundles)) {
            return res.status(400).json({
                message: 'Failed to process purchase',
                status: 400,
                error: 'products and bundles must be arrays',
            });
        }

        // Validasi quantity untuk semua items (product dan bundle)
        const allItems = [...products, ...bundles];
        const invalidItems = allItems.filter(item => item.quantity === undefined || item.quantity <= 0);

        if (invalidItems.length > 0) {
            return res.status(400).json({
                message: 'Failed to process purchase',
                status: 400,
                error: 'Each item (product or bundle) must have a valid quantity greater than 0',
                invalidItems,
            });
        }

        let totalCost = 0;

        // Transaksi DB
        await db.query('START TRANSACTION');

        // Lakukan proses pembelian produk
        if (products.length > 0) {
            for (const product of products) {
                const [result] = await db.query('SELECT id, price, stock FROM products WHERE id = ?', [product.id]);
                if (!result.length) {
                    return res.status(404).json({
                        message: 'Failed to process purchase',
                        status: 404,
                        error: `Product with ID ${product.id} not found`,
                    });
                }
                if (result[0].stock < product.quantity) {
                    return res.status(400).json({
                        message: 'Failed to process purchase',
                        status: 400,
                        error: `Not enough stock for product ID ${product.id}`,
                    });
                }
                totalCost += result[0].price * product.quantity;
                rollbackQueries.push({
                    query: 'UPDATE products SET stock = stock + ? WHERE id = ?',
                    params: [product.quantity, product.id],
                });

                // Memperbarui stok produk
                await db.query('UPDATE products SET stock = stock - ? WHERE id = ?', [product.quantity, product.id]);

                // Update stok bundle yang terkait dengan produk ini
                const [bundlesForProduct] = await db.query('SELECT id, stock FROM bundles WHERE product_id = ?', [product.id]);
                for (const bundle of bundlesForProduct) {
                    const proportionalReduction = Math.min(bundle.stock, product.quantity);
                    if (proportionalReduction > 0) {
                        rollbackQueries.push({
                            query: 'UPDATE bundles SET stock = stock + ? WHERE id = ?',
                            params: [proportionalReduction, bundle.id],
                        });

                        await db.query('UPDATE bundles SET stock = stock - ? WHERE id = ?', [proportionalReduction, bundle.id]);
                    }
                }
            }
        }

        // Lakukan proses pembelian bundle
        if (bundles.length > 0) {
            for (const bundle of bundles) {
                const [result] = await db.query('SELECT id, price, stock, product_id FROM bundles WHERE id = ?', [bundle.id]);
                if (!result.length) {
                    // Rollback jika bundle tidak ditemukan
                    for (const rollback of rollbackQueries) {
                        await db.query(rollback.query, rollback.params);
                    }
                    return res.status(404).json({
                        message: 'Failed to process purchase',
                        status: 404,
                        error: `Bundle with ID ${bundle.id} not found`,
                    });
                }
                
                if (result[0].stock < bundle.quantity) {
                    // Rollback jika stok bundle tidak cukup
                    for (const rollback of rollbackQueries) {
                        await db.query(rollback.query, rollback.params);
                    }
                    return res.status(400).json({
                        message: 'Failed to process purchase',
                        status: 400,
                        error: `Not enough stock for bundle ID ${bundle.id}`,
                    });
                }

                const [productResult] = await db.query('SELECT stock FROM products WHERE id = ?', [result[0].product_id]);
                if (!productResult.length || productResult[0].stock < bundle.quantity) {
                    for (const rollback of rollbackQueries) {
                        await db.query(rollback.query, rollback.params);
                    }
                    return res.status(400).json({
                        message: 'Failed to process purchase',
                        status: 400,
                        error: `Not enough stock for product related to bundle ID ${bundle.id}`,
                    });
                }

                totalCost += result[0].price * bundle.quantity;``

                // Menambahkan rollback untuk bundle dan produk terkait
                rollbackQueries.push({
                    query: 'UPDATE bundles SET stock = stock + ? WHERE id = ?',
                    params: [bundle.quantity, bundle.id],
                });

                rollbackQueries.push({
                    query: 'UPDATE products SET stock = stock + ? WHERE id = ?',
                    params: [bundle.quantity, result[0].product_id],  // Menggunakan product_id dari bundle
                });

                // Update stok bundle dan produk terkait
                await db.query('UPDATE bundles SET stock = stock - ? WHERE id = ?', [bundle.quantity, bundle.id]);
                await db.query('UPDATE products SET stock = stock - ? WHERE id = ?', [bundle.quantity, result[0].product_id]);
            }
        }

        // Commit transaksi jika semuanya sukses
        await db.query('COMMIT');

        res.status(200).json({
            message: 'Purchase successful',
            status: 200,
            totalCost,
        });
    } catch (error) {
        // Rollback semua stok jika ada error
        await db.query('ROLLBACK')
        for (const rollback of rollbackQueries) {
            await db.query(rollback.query, rollback.params);
        }

        res.status(500).json({
            message: 'Failed to process purchase',
            status: 500,
            error: error.message,
        });
    }
});

module.exports = router;
