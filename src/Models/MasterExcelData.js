const mongoose = require('mongoose');

const ExcelDataSchema = new mongoose.Schema({}, { strict: false });

const ExcelData = mongoose.model('MasterExcelData', ExcelDataSchema);


module.exports = ExcelData;
