const express = require('express');
const multer = require('multer');
const { uploadCustomerOrder, getCustomerSuccessOrder,getCustomerOutofStockOrder, getcustomerPending,getcustomerMismatchValue ,DeleteAllOrderfile} = require('../../controllers/CustomerOrderController/CustomerOrderController');

const upload = multer({ dest: 'uploads/', limits: { fileSize: 50 * 1024 * 1024 } });

const router = express.Router();

router.post('/upload/customer-order/:articleType', upload.single('file'), uploadCustomerOrder);
// router.post('/upload/customer-order', upload.single('file'), uploadCustomerOrder);

router.get('/data/customer-sucess-order', getCustomerSuccessOrder);
router.get('/data/customer-outofsyocks-order', getCustomerOutofStockOrder);
router.get('/data/customer-pending-order', getcustomerPending);
router.get('/data/customer-mismatch-value',getcustomerMismatchValue)
router.delete('/orderfile/deleteorderfile',DeleteAllOrderfile)


module.exports = router;
