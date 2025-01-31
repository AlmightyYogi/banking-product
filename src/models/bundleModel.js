const db = require('../config/db')

// Menambah bundle menggunakan query ke table bundles
exports.createBundle = async (bundle) => {
    try {
        const [rows] = await db.query(
            `INSERT INTO bundles (name, product_id, price, stock, description)
            VALUES (?, ?, ?, ?, ?)`,
            [bundle.name, bundle.product_id, bundle.price, bundle.stock, bundle.description]
        );
        return rows;
    } catch (error) {
        throw new Error("Failed to create bundle");
    }
};

// Mengambil semua data bundle dari table bundles
exports.getBundles = async () => {
    try {
        const [rows] = await db.query(`SELECT * FROM bundles`);
        return rows;
    } catch (error) {
        throw new Error('Failed to fetch products');
    }
};

// Mengambil data berdasarkan id dari table bundles
exports.getBundleById = async (id) => {
    try {
        const [rows] = await db.query(`SELECT * FROM bundles WHERE id = ?`, [id]);
        return rows;
    } catch(error) {
        throw new Error('Failed to fetch bundle by id');
    }
};

// Mengambil data berdasarkan product_id dari table bundles
exports.getBundleByProductId = async (product_id) => {
    try {
        const [rows] = await db.query(`SELECT * FROM bundles WHERE product_id = ?`, [product_id]);
        console.log("Response:", product_id);
        return rows;
    } catch(error) {
        throw new Error('Failed to fetch bundle by product id');
    }
};

// Meng-update data bundle dari table bundles
exports.updateBundle = async (id, bundle) => {
    try {
        const [rows] = await db.query(
            `UPDATE bundles SET name = ?, product_id = ?, price = ?, stock = ?, description = ? WHERE id = ?`,
            [bundle.name, bundle.product_id, bundle.price, bundle.stock, bundle.description, id]
        );
        return rows;
    } catch (error) {
        throw new Error('Failed to update bundle');
    }
};