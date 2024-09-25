const express = require('express');
const router = express.Router();
const multer = require('multer');
const { ArticleUploadController ,getArticleFile,deleteArticles} = require('../../controllers/ArticleController/ArticleController');

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB file size limit
});

router.post('/article/:articleType', upload.single('file'), ArticleUploadController);
router.get('/article/:articleType',getArticleFile)
router.delete("/article/delete/:articleType", deleteArticles);
module.exports = router;
 