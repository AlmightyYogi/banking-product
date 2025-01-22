const db = require('../config/db')

// Menambah product menggunakan query ke table products
exports.createProduct = async (product) => {
    try {
        const [rows] = await db.query(
            `INSERT INTO products (name, price, stock, description)
            VALUES (?, ?, ?, ?)`,
            [product.name, product.price, product.stock, product.description]
        );
        return rows;
    } catch (error) {
        throw new Error('Failed to create product');
    }
};

// Mengambil semua data product dari table products
exports.getProducts = async () => {
    try {
        const [rows] = await db.query(`SELECT * FROM products`);
        return rows;
    } catch (error) {
        throw new Error('Failed to fetch products');
    }
};

// Mengambil data berdasarkan id dari table products
exports.getProductById = async (id) => {
    try {
        const [rows] = await db.query(`SELECT * FROM products WHERE id = ?`, [id]);
        return rows;
    } catch (error) {
        throw new Error('Failed to fetch product by id');
    } 
};

// Meng-update data product dari table products
exports.updateProduct = async (id, product) => {
    try {
        const [rows] = await db.query(
            `UPDATE products SET name = ?, price = ?, stock = ?, description = ? WHERE id = ?`,
            [product.name, product.price, product.stock, product.description, id]
        );
        return rows;
    } catch (error) {
        throw new Error('Failed to update product');
    }
};