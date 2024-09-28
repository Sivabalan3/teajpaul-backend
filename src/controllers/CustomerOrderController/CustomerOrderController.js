const CustomerOrder = require("../../Models/CustomerOrder");
const ItemMaster = require("../../Models/MasterExcelData");
const PendingOrder = require("../../Models/pendingOrderData");
const BatchOrder = require("../../Models/BatchExcelData");
const OutOfStock = require("../../Models/OutOfOrderData");
const Valuemismatch = require("../../Models/valueMismatchig");
const DmartArticleMaster = require("../../Models/Article/DmartArticle");
const DmartQutation = require("../../Models/Qutations/DmartQuotationData");
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
    const [masterData, batchData, dmartData, dmartQutationData] =
      await Promise.all([
        ItemMaster.find().lean(),
        BatchOrder.find().lean(),
        articleType === "D-mart"
          ? DmartArticleMaster.find().lean()
          : Promise.resolve([]),
        articleType === "D-mart" ? DmartQutation.find().lean() : [],
      ]);

    // Initialize arrays for orders
    const ordersToUpdate = [];
    const outOfStocks = [];
    const valuemismatch = [];
    const pendingorder = [];

    // Process each row from the uploaded file
    for (const orderRow of worksheet) {
      const { EAN, Qty, Price, MRP } = orderRow;
      const orderEan = String(EAN).trim();
      let remainingQty = Number(Qty); // Start with the total order quantity

      if (articleType === "D-mart") {
        const matchedDmartArticles = dmartData.filter(
          (dmart) => String(dmart.EAN).trim() === orderEan
        );

        if (matchedDmartArticles.length === 0) {
          // console.log(
          //   "No match found for EAN:",
          //   orderEan,
          //   "in D-mart articles."
          // );
          continue;
        }

        for (const matchedDmartArticle of matchedDmartArticles) {
          const { Brandcode, MKSU } = matchedDmartArticle;

          const matchingMasterRows = masterData.filter(
            (master) => String(master.MKSU).trim() === String(MKSU).trim()
          );

          if (matchingMasterRows.length === 0) {
            if (orderEan !== String(matchedDmartArticle.EAN).trim()) {
              outOfStocks.push({ ...orderRow });
            }
            continue;
          }

          for (const masterRow of matchingMasterRows) {
            const batchMatches = batchData.filter(
              (batch) =>
                // String(batch.ItemCode).trim() === masterRow.ItemCode &&
                String(batch.MKSU).trim() === masterRow.MKSU
            );

            for (let index = 0; index < batchMatches.length; index++) {
              const batchMatch = batchMatches[index];
            
              if (remainingQty <= 0) break; // No need to process further if quantity is fulfilled
            
              let availableQty = Number(batchMatch.UOM2_Piece_Qty);
              if (availableQty <= 0) {
                continue; // Skip batches that have no available quantity
              }
            
              // Check MKSU before quantity reduction
              if (masterRow.MKSU !== batchMatch.MKSU) {
                // Push to outOfStocks without reducing quantity
                outOfStocks.push({
                  ...orderRow,
                  MKSU: masterRow.MKSU,
                  ItemCode: batchMatch.ItemCode,
                  issue: "mksu missing"
                });
                // console.log("Pushed to outOfStocks due to mismatched MKSU");
                continue; // Skip further processing for this batch
              }
            
              // First check if batch MRP is greater than order MRP, push to valuemismatch if true
              if (Number(batchMatch.MRPPerPack) > Number(MRP)) {
                valuemismatch.push({
                  ...orderRow,
                  MKSU: masterRow.MKSU,
                  ItemCode: batchMatch.ItemCode,
                  priceProblem: "Price Problem",
                });
                // console.log(
                //   "Pushed to valuemismatch due to price mismatch: batch MRP:",
                //   batchMatch.MRPPerPack,
                //   "order MRP:",
                //   MRP
                // );
                continue; // Skip further processing for this batch due to price mismatch
              }
            
              // Check if batch MRP is less than or equal to order MRP
              if (Number(batchMatch.MRPPerPack) <= Number(MRP)) {
                if (availableQty >= remainingQty) {
                  // The batch has enough quantity to fulfill the order
                  const dmartQuotation = dmartQutationData.find(
                    (q) =>
                      q.Category === batchMatch.Category &&
                      q.LoyaltyProgram === "DMART"
                  );
                  if (dmartQuotation) {
                    const discountAmount = (MRP * dmartQuotation.MarkDown) / 100;
                    const finalPrice = MRP - discountAmount;
                    const fulfilledQty = remainingQty; // Fulfill the entire remaining quantity
                    const neededQty = remainingQty - fulfilledQty; // Calculate needed quantity, should be 0 if fulfilled
            
                    // Success order - store reduced by quantity
                    ordersToUpdate.push({
                      ...orderRow,
                      MKSU: masterRow.MKSU,
                      ItemCode: batchMatch.ItemCode,
                      DiscountPrice: finalPrice,
                      fulfilledQty: fulfilledQty, // Store the fulfilled quantity
                      neededQty: neededQty, // Store the needed quantity, in this case 0
                    });
            
                    // Update the available quantity of the batch
                    batchMatch.UOM2_Piece_Qty -= remainingQty;
            
                    // console.log(
                    //   "Batch has enough: availableQty:",
                    //   availableQty,
                    //   "reduced by:",
                    //   remainingQty
                    // );
                  }
            
                  // Update the batch immediately with the reduced quantity
                  await BatchOrder.updateOne(
                    { _id: batchMatch._id }, // Unique identifier for batchMatch
                    { $set: { UOM2_Piece_Qty: batchMatch.UOM2_Piece_Qty } }
                  );
            
                  remainingQty = 0; // Order fully fulfilled
                } else if (availableQty <= remainingQty) {
                  // The batch does not have enough quantity to fulfill the order
                  const neededQty = remainingQty - availableQty; // Calculate how much more is needed
                  const fulfilledQty = availableQty;
            
                  // Success order - store fulfilled quantity
                  ordersToUpdate.push({
                    ...orderRow,
                    MKSU: masterRow.MKSU,
                    ItemCode: batchMatch.ItemCode,
                    DiscountPrice: batchMatch.MRPPerPack,
                    fulfilledQty: fulfilledQty, // Store the fulfilled quantity
                    neededQty: neededQty, // Store the remaining needed quantity
                  });
            
                  // Use up all available quantity in this batch, but the order is not yet fully fulfilled
                  remainingQty -= availableQty; // Reduce the remaining quantity by availableQty
                  batchMatch.UOM2_Piece_Qty = 0; // Set the batch quantity to 0 since it's fully used
            
                  // console.log(
                  //   "Batch used up: availableQty:",
                  //   availableQty,
                  //   "remainingQty:",
                  //   remainingQty
                  // );
            
                  // Update the batch to reflect no available quantity
                  await BatchOrder.updateOne(
                    { _id: batchMatch._id }, // Unique identifier for batchMatch
                    { $set: { UOM2_Piece_Qty: 0 } }
                  );
                }
              }
            }
            

            if (remainingQty > 0 ) {
              // If there's still remainingQty after checking all batch matches, add it to pendingorder
              pendingorder.push({
                ...orderRow,
                MKSU: MKSU,
                ItemCode: masterRow.ItemCode,
                neededQty: remainingQty, // Store the remaining needed quantity
              });
              // console.log(
              //   "Pushed to pendingorder with neededQty:",
              //   remainingQty
              // );
            }
          }
        }
      }
    }

    // Insert matched data into CustomerOrder
    if (ordersToUpdate.length > 0) {
      await CustomerOrder.insertMany(ordersToUpdate);
      // console.log("Orders successfully updated in CustomerOrder");
    }

    if (valuemismatch.length > 0) {
      await Valuemismatch.insertMany(valuemismatch);
      // console.log("Orders successfully added to Valuemismatch");
    }

    if (pendingorder.length > 0) {
      await PendingOrder.insertMany(pendingorder);
      // console.log("Orders successfully added to PendingOrder");
    }

    if (outOfStocks.length > 0) {
      await OutOfStock.insertMany(outOfStocks);
      // console.log("Orders successfully added to OutOfStock");
    }

    res.status(200).json({
      message: "File uploaded and data processed successfully!",
    });
  } catch (error) {
    // console.error("Error uploading file:", error);
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
    // console.error("Error deleting files:", error); // Log the error for debugging
    res
      .status(500)
      .json({ message: "Error deleting files", error: error.message });
  }
};
