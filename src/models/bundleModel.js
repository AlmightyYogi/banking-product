const db = require('../config/db')

// Menambah bundle menggunakan query ke table bundles
exports.createBundle = async (bundle) => {
    const [rows] = await db.query(
        `INSERT INTO bundles (name, product_id, price, stock, description)
         VALUES (?, ?, ?, ?, ?)`,
        [bundle.name, bundle.product_id, bundle.price, bundle.stock, bundle.description]
    );
    return rows;
};

// Mengambil semua data bundle dari table bundles
exports.getBundles = async () => {
    const [rows] = await db.query(`SELECT * FROM bundles`);
    return rows;
};

// Meng-update data bundle dari table bundles
exports.updateBundle = async (id, bundle) => {
    const [rows] = await db.query(
        `UPDATE bundles SET name = ?, product_id = ?, price = ?, stock = ?, description = ? WHERE id = ?`,
        [bundle.name, bundle.product_id, bundle.price, bundle.stock, bundle.description, id]
    );
    return rows;
};