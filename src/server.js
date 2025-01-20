const app = require('./app');
require('dotenv').config();

// Menentukan port yang akan digunakan, default ke 3000 jika tidak ada di .env
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});