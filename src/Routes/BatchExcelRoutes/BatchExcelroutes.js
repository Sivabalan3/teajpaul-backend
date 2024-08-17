const express = require('express');
const { uploadBatchExcel,updateBatchExcel,getBatchExcelData,deleteBatchExcel} = require('../../controllers/BatchExcelController/BatchExcelController');
const multer=require('multer')
const router = express.Router();
const upload = multer({ dest: 'uploads/',
    limits:{fileSize:50*1024*1024}
 });



router.post('/upload/batchfile', upload.single('file'), uploadBatchExcel);
router.delete('/batch-delete',deleteBatchExcel)
router.get('/data/batchfile', getBatchExcelData);
router.put('/update/batchfile', express.json({ limit: '50mb' }), updateBatchExcel)

module.exports = router;
