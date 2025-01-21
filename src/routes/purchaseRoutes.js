const express = require('express');
const db = require('../config/db');
const router = express.Router();

router.post('/', async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { products, bundles } = req.body;

        // Validasi kalo products dan bundles bukan array
        if (!Array.isArray(products) || !Array.isArray(bundles)) {
            return res.status(400).json({
                message: 'Failed to process purchase',
                status: 400,
                error: '`products` and `bundles` must be arrays',
            });
        }

        let totalCost = 0;

        // Menyimpan stok awal untuk rollback kalo ada eror
        const rollbackQueries = [];

        // Transaksi DB
        await connection.beginTransaction();

        // Jika tidak ada produk atau tidak ada bundle atau tidak ada keduanya jika beli sekali dua, saat beli namun value kosong 
        if (products.length === 0 && bundles.length === 0) {
            return res.status(400).json({
                message: 'Failed to process purchase',
                status: 400,
                error: 'No products or bundles selected for purchase',
            });
        } else if (products.length === 0) {
            return res.status(400).json({
                message: 'Failed to process purchase',
                status: 400,
                error: 'No products selected for purchase'
            });
        } else if (bundles.length === 0) {
            return res.status(400).json({
                message: 'Failed to process purchase',
                status: 400,
                error: 'No bundles selected for purchase',
            });
        }
        

        // Lakukan looping untuk melakukan pembelian product dan bundles karena array
        if (products.length > 0) { // Tujuan untuk mengecek apakah products dibeli atau tidak
            for (const product of products) {
                const [result] = await db.query(`SELECT id, price, stock FROM products WHERE id = ?`, [product.id]);
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

                // Menyimpan query rollback produk
                rollbackQueries.push({
                    query: `UPDATE products SET stock = stock + ? WHERE id = ?`,
                    params: [product.quantity, product.id],
                });
            }
        }
        
        if (bundles.length > 0) { // Tujuan untuk mengecek apakah bundles dibeli atau tidak
            for (const bundle of bundles) {
                const [result] = await db.query(`SELECT id, price, stock FROM bundles WHERE id = ?`, [bundle.id]);
                if (!result.length) {
                    // Rollback product
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
                    // Rollback product
                    for (const rollback of rollbackQueries) {
                        await db.query(rollback.query, rollback.params);
                    }

                    return res.status(400).json({
                        message: 'Failed to process purchase',
                        status: 400,
                        error: `Not enough stock for bundle ID ${bundle.id}`,
                    });
                }
                totalCost += result[0].price * bundle.quantity;

                // Menyimpan query rollback bundle
                rollbackQueries.push({
                    query: `UPDATE bundles SET stock = stock = ? WHERE id = ?`,
                    params: [bundle.quantity, bundle.id],
                });
            }
        }

        // Update kalo validasi telah berhasil
        if (products.length > 0) {
            for (const product of products) {
                await connection.query(`UPDATE products SET stock = stock - ? WHERE id = ?`, [product.quantity, product.id]);
            }
        }

        if (bundles.length > 0) {
            for (const bundle of bundles) {
                await connection.query(`UPDATE bundles SET stock = stock - ? WHERE id = ?`, [bundle.quantity, bundle.id]);
            }
        }

        // Kalo validasi sukses, maka query akan di tetapkan (commit) supaya query berjalan
        await connection.commit();

        res.status(200).json({
            message: 'Purchase successfull',
            status: 200,
            totalCost,
        });
    } catch (error) {
        // Rollback semua stok jika eror
        if (rollbackQueries.length > 0) {
            for (const rollback of rollbackQueries) {
                await db.query(rollback.query, rollback.params);
            }
        }

        res.status(500).json({
            message: 'Failed to process purchase',
            status: 500,
            error: error.message,
        });
    } finally {
        // Tutup koneksi DB
        connection.release(); // Cara untuk memastikan bahwa koneksi yang sudah selesai dipakai bisa digunakan kembali oleh aplikasi lain.
    }
});

module.exports = router;