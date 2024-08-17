const mongoose = require('mongoose');

const CustomerOrderSchema = new mongoose.Schema({}, { strict: false });
const CustomerOrder = mongoose.model('CustomerOrder', CustomerOrderSchema);

module.exports = CustomerOrder;
