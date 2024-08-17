const express = require('express');
const { uploadExcel, getExcelData ,updateExcel,deleteMasterExistingFile} = require('../../controllers/masterExcelcontroller/MasterExcelController');
const multer=require('multer')
const router = express.Router();
const upload = multer({ dest: 'uploads/',
    limits:{fileSize:50*1024*1024}
 });



router.post('/upload', upload.single('file'), uploadExcel);
router.delete('/master-delete',deleteMasterExistingFile)
router.get('/data', getExcelData);
router.put('/update', express.json({ limit: '50mb' }), updateExcel)

module.exports = router;
