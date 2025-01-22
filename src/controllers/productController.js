const db = require('../config/db');
const ProductModel = require('../models/productModel');

exports.getProducts = async (req, res) => {
    try {
        const products = await ProductModel.getProducts();
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const { name, price, stock, description } = req.body;
        const existingProducts = await ProductModel.getProducts();

        // Pengecekan jika product sudah ada
        if (existingProducts.some((p) => p.name === name)) {
            return res.status(400).json({ 
                message: 'Failed to create product',
                status: 400,
                error: 'Product already exists'
             });
        }

        // Melakukan validasi required kepada semua kolom
        if (!name || !price || !stock || !description) {
            return res.status(400).json({ 
                message: 'Failed to create product',
                status: 400,
                error: 'All fields are required'
             });
        }

        // Menambahkan produk ke dalam db
        const result = await ProductModel.createProduct({ name, price, stock, description });

        // Cek apakah hasilnya berhasil
        if (result.affectedRows > 0) {
            res.status(200).json({
                message: 'Product created',
                status: 200,
                data: {
                    id: result.insertId,
                    name,
                    price,
                    stock,
                    description
                }
            });
        } else {
            // Menangani kesalahan tidak terduga yang terjadi selama proses pembuatan produk
            res.status(500).json({
                message: 'Failed to create product',
                status: 500,
                error: 'Unknown error occured during product creation'
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await ProductModel.getProductById(id);

        // Jika product tidak ditemukan
        if (!product || (Array.isArray(product) && product.length === 0)) {
            return res.status(404).json({
                message: 'Product not found',
                status: 404,
                error: 'Product not found',
            });
        }

        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, stock, description } = req.body;

        // Melakukan validasi required kepada semua kolom
        if (!name || !price || !stock || !description) {
            return res.status(400).json({
                message: 'Failed to update product',
                status: 400,
                error: 'All fields are required'
            });
        }

        // Mengecek apakah ada data yang di update dengan name product yang sama
        const existingProducts = await ProductModel.getProducts();
        if (existingProducts.some((p) => p.name === name && p.id !== parseInt(id))) {
            return res.status(400).json({
                message: 'Failed to update product',
                status: 400,
                error: 'Product with this name already exists'
            });
        }

        // Melakukan update product
        const result = await ProductModel.updateProduct(id, { name, price, stock, description });

        // Pengecekan data jika product tidak ada
        if (result && result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Failed to update product',
                status: 404,
                error: 'Product not found'
            });
        }

        // Mengembalikan response sesuai request
        res.status(200).json({
            message: 'Product updated successfully',
            status: 200,
            data: {
                id,
                name,
                price,
                stock,
                description
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};