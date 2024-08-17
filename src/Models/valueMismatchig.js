const mongoose = require('mongoose');

const ValuemismatchSchema = new mongoose.Schema({}, { strict: false });
const Valuemismatch = mongoose.model('Valuemismatch', ValuemismatchSchema);

module.exports = Valuemismatch;
