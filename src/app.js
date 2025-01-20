const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const productRoutes = require('./routes/productRoutes');
const bundleRoutes = require('./routes/bundleRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');

const app = express(); // Membuat instance dari aplikasi express

app.use(cors()); // Mengizinkan semua domain untuk mengakses API / Fungsinya membatasi akses ke resource dari domain yang berbeda
app.use(bodyParser.json()); // mem-parsing JSON di request body supaya json dapat di proses
app.use('/api/products', productRoutes);
app.use('/api/bundles', bundleRoutes);
app.use('/api/purchase', purchaseRoutes);

module.exports = app;