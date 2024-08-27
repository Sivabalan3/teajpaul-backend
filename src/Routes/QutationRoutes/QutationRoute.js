const express = require('express');
const multer = require('multer');
const { QutationUpload,getQutationsByType } = require('../../controllers/QuotationController/quotationController');

const router = express.Router();
const upload = multer({ dest: 'uploads/qutation/', limits: { fileSize: 50 * 1024 * 1024 } });

// Corrected route definition with leading slash
router.post('/qutation/:QutationType', upload.single('file'), QutationUpload);
router.get('/qutation/:QutationType', getQutationsByType)

module.exports = router;
