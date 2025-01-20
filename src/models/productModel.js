const db = require('../config/db')

// Menambah product menggunakan query ke table products
exports.createProduct = async (product) => {
    const [rows] = await db.query(
        `INSERT INTO products (name, price, stock, description)
         VALUES (?, ?, ?, ?)`,
        [product.name, product.price, product.stock, product.description]
    );
    return rows;
};

// Mengambil semua data product dari table products
exports.getProducts = async () => {
    const [rows] = await db.query(`SELECT * FROM products`);
    return rows;
};