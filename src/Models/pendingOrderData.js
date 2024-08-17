const mongoose = require('mongoose');

const PendingOrderSchema = new mongoose.Schema({}, { strict: false });
const PendingOrder = mongoose.model('PendingOrder', PendingOrderSchema);

module.exports = PendingOrder;
