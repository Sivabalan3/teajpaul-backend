const CustomerOrder = require("../../Models/CustomerOrder");
const ItemMaster = require("../../Models/MasterExcelData");
const PendingOrder = require("../../Models/pendingOrderData");
const BatchOrder = require("../../Models/BatchExcelData");
const OutOfStock = require("../../Models/OutOfOrderData");
const Valuemismatch = require("../../Models/valueMismatchig");
const DmartArticleMaster = require("../../Models/Article/DmartArticle");
const XLSX = require("xlsx");

exports.uploadCustomerOrder = async (req, res) => {
  try {
    const file = req.file;
    const { articleType } = req.params;

    // Check if a customer file already exists
    const existingCustomerFile = await CustomerOrder.findOne();
    if (existingCustomerFile) {
      return res.status(400).json({
        message:
          "A customer file has already been uploaded. Please delete the existing file before uploading a new one.",
      });
    }

    // Read and process the Excel file
    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Retrieve item master data and batch data
    const masterData = await ItemMaster.find().lean();
    const batchData = await BatchOrder.find().lean();
    let dmartData = [];
    // D-Mart logic
    if (articleType === "D-mart") {
      dmartData = await DmartArticleMaster.find().lean();
    }

    // Initialize arrays for orders
    const ordersToUpdate = [];
    const outOfStocks = [];
    const valuemismatch = [];
    const pendingorder = [];

    // Process each row from the uploaded file
    worksheet.forEach((orderRow) => {
      const { EAN, Qty, Price } = orderRow;
      const orderEan = String(EAN).trim();

      if (articleType === "D-mart") {
        // Filter all matching EAN entries from DmartArticleMaster
        const matchedDmartArticles = dmartData.filter(
          (dmart) => String(dmart.EAN).trim() === orderEan
        );

        if (matchedDmartArticles.length === 0) {
          console.log(
            "No match found for EAN:",
            orderEan,
            "in D-mart articles."
          );
          return;
        }

        // Process each matched D-mart article
        matchedDmartArticles.forEach((matchedDmartArticle) => {
          const { Brandcode, MKSU } = matchedDmartArticle;

          // Filter ItemMasterData for matching Brandcode and MKSU
          const matchingMasterRows = masterData.filter(
            (master) =>
              String(master.ItemCode).trim() === String(Brandcode).trim() &&
              String(master.MKSU).trim() === String(MKSU).trim()
          );

          if (matchingMasterRows.length === 0) {
            // Out of Stock - Add to outOfStocks if conditions are met
            if (
              orderEan !== String(matchedDmartArticle.EAN).trim() &&
              String(Brandcode).trim() !== String(masterData.ItemCode).trim()
            ) {
              outOfStocks.push(orderRow);
            }
            return;
          }

          // Process each matched master row
          matchingMasterRows.forEach((masterRow) => {
            // Match ItemCode and MKSU with BatchOrder
            const batchMatch = batchData.find(
              (batch) =>
                String(batch.ItemCode).trim() === masterRow.ItemCode &&
                String(batch.MKSU).trim() === masterRow.MKSU
            );

            if (batchMatch) {
              const qtyProblem =
                Number(batchMatch.Qty) < Number(Qty) ? "Quantity Problem" : "";
              const priceProblem =
                Number(batchMatch.Price) > Number(Price) ? "Price Problem" : "";

              if (
                Number(batchMatch.Qty) >= Number(Qty) &&
                Number(batchMatch.Price) <= Number(Price)
              ) {
                // Success order - Add to ordersToUpdate
                ordersToUpdate.push(orderRow);
              } else if (qtyProblem) {
                // Pending order - Add to pendingorder
                pendingorder.push({ ...orderRow, qtyProblem });
              } else if (priceProblem) {
                // Value mismatch - Add to valuemismatch
                valuemismatch.push({ ...orderRow, priceProblem });
              }
            } else {
              // Out of Stock - Add to outOfStocks
              outOfStocks.push(orderRow);
            }
          });
        });
      }
    });

    // Insert matched data into CustomerOrder
    if (ordersToUpdate.length > 0) {
      await CustomerOrder.insertMany(ordersToUpdate);
      console.log("Orders successfully updated in CustomerOrder");
    }

    // Insert value mismatch data
    if (valuemismatch.length > 0) {
      await Valuemismatch.insertMany(valuemismatch);
      console.log("Orders successfully added to Valuemismatch");
    }

    // Insert pending orders data
    if (pendingorder.length > 0) {
      await PendingOrder.insertMany(pendingorder);
      console.log("Orders successfully added to PendingOrder");
    }

    // Insert out-of-stock data
    if (outOfStocks.length > 0) {
      await OutOfStock.insertMany(outOfStocks);
      console.log("Orders successfully added to OutOfStock");
    }

    res.status(200).json({
      message: "File uploaded and data processed successfully!",
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ message: "Error uploading file", error });
  }
};

exports.getCustomerSuccessOrder = async (req, res) => {
  try {
    const data = await CustomerOrder.find();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching data", error });
  }
};
exports.getCustomerOutofStockOrder = async (req, res) => {
  try {
    const data = await OutOfStock.find();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching data", error });
  }
};
exports.getcustomerPending = async (req, res) => {
  try {
    const data = await PendingOrder.find();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching data", error });
  }
};
exports.getcustomerMismatchValue = async (req, res) => {
  try {
    const data = await Valuemismatch.find();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching data", error });
  }
};
exports.DeleteAllOrderfile = async (req, res) => {
  try {
    const deleteSucessorder = await CustomerOrder.deleteMany({});
    const deletePendingOrder = await PendingOrder.deleteMany({});
    const deleteValuemismatch = await Valuemismatch.deleteMany({});
    const deleteOutOfStocks = await OutOfStock.deleteMany({});

    // Check if any deletions occurred
    if (
      deleteSucessorder.deletedCount === 0 &&
      deletePendingOrder.deletedCount === 0 &&
      deleteValuemismatch.deletedCount === 0 &&
      deleteOutOfStocks.deletedCount === 0
    ) {
      return res.status(404).json({ message: "No existing files to delete" });
    }

    res.status(200).json({
      message: "Existing files deleted successfully!",
    });
  } catch (error) {
    console.error("Error deleting files:", error); // Log the error for debugging
    res
      .status(500)
      .json({ message: "Error deleting files", error: error.message });
  }
};
