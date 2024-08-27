const DmartQutation = require("../../Models/Qutations/DmartQuotationData");
const SparQutation = require("../../Models/Qutations/SparQutation");
const XLSX = require("xlsx");
const fs = require('fs');


exports.QutationUpload = async (req, res) => {
  try {
    const { QutationType} = req.params;
    console.log("qutationtype",QutationType)
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (QutationType=== "D-martqutation") {
      await DmartQutation.insertMany(worksheet);
      
      res.status(200).json({ message: "D-MART Qutation uploaded successfully!" });
    } else if (QutationType=== "SPAR-qutation") {
      console.log("SPAR Qutation processing logic goes here");
      res.status(200).json({ message: "SPAR Qutation processing complete!" });
    } else {
      res.status(400).json({ message: "Invalid QutationTypeprovided" });
    }

    fs.unlink(file.path, (err) => {
      if (err) {
        console.error("Error removing file:", err);
      }
    });
  } catch (error) {
    console.error("Error uploading Qutation:", error);
    res.status(500).json({ message: "Error uploading Qutation", error });
  }
};
exports.getQutationsByType = async (req, res) => {
  try {
    const { QutationType } = req.params;
    console.log("qutationtype",QutationType)
    const DmartData = await DmartQutation.find({});
    const SparData = await SparQutation.find({});
    if (QutationType === "D-martqutation") {
      res.status(200).json(DmartData);
    } else if (QutationType === "SPAR-qutation") {  // Fixed the comparison
      res.status(200).json(SparData);
      // res.status(200).json(SparData);
    }
  } catch (error) {
    res.status(500).json({ message: "Error fetching data", error });
  }
};


