const Dmart = require("../../Models/Article/DmartArticle");
const XLSX = require("xlsx");
const SparModel = require("../../Models/Article/SparArticle");
const fs = require("fs");

exports.ArticleUploadController = async (req, res) => {
  try {
    const { articleType } = req.params;
    const file = req.file;
    const workBook = XLSX.readFile(file.path);
    const sheetName = workBook.SheetNames[0];
    const worksheet = XLSX.utils.sheet_to_json(workBook.Sheets[sheetName]);

    if (articleType === "D-mart") {
      await Dmart.insertMany(worksheet);
    } else if (articleType === "Spaar") {
      await SparModel.insertMany(worksheet);
    } else {
      return res.status(400).json({ message: "Invalid article type." });
    }

    // Delete the file after processing
    fs.unlinkSync(file.path);

    return res
      .status(200)
      .json({ message: "File uploaded and data inserted successfully." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred while processing the file.", error });
  }
};

exports.getArticleFile = async (req, res) => {
  try {
    const { articleType } = req.params;
    const DmartData = await Dmart.find({});
    const SparData = await SparModel.find({});
    if (articleType === "D-mart") {
      res.status(200).json(DmartData);
    } else if (articleType === "Spaar") {
      res.status(200).json(SparData);
    }
  } catch (error) {
    res.status(500).json({ message: "Error fetching data", error });
  }
};


exports.deleteArticles = async (req, res) => {
  try {
    const { articleType } = req.params;

    if (articleType === "D-mart") {
      await Dmart.deleteMany({}); 
    } else if (articleType === "Spaar") {
      await SparModel.deleteMany({}); 
    } else {
      return res.status(400).json({ message: "Invalid article type." });
    }

    return res.status(200).json({ message: `${articleType} articles deleted successfully.` });
  } catch (error) {
    return res.status(500).json({ message: "Error deleting articles", error });
  }
};