const mongoose = require('mongoose');

const OutOfStockSchema = new mongoose.Schema({}, { strict: false });
const OutOfStock = mongoose.model('OutOfStock', OutOfStockSchema);

module.exports = OutOfStock;
