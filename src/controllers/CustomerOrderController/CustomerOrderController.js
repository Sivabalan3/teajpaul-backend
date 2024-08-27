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
          console.log(
            "No match found for EAN:",
            orderEan,
            "in D-mart articles."
          );
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

            for (const batchMatch of batchMatches) {
              if (remainingQty <= 0) break; // No need to process further if quantity is fulfilled

              const availableQty = Number(batchMatch.UOM2_Piece_Qty);

              if (
                availableQty >= remainingQty ||
                availableQty <= remainingQty
              ) {
                // The batch has enough quantity to fulfill the order
                if (Number(batchMatch.MRPPerPack) <= Number(MRP)) {
                  const dmartQuotation = dmartQutationData.find(
                    (q) =>
                      q.Category === batchMatch.Category &&
                      q.LoyaltyProgram === "DMART"
                  );
                  if (dmartQuotation) {
                    const discountAmount =
                      (MRP * dmartQuotation.MarkDown) / 100;
                    const finalPrice = MRP - discountAmount;
                    ordersToUpdate.push({
                      ...orderRow,
                      MKSU: masterRow.MKSU,
                      ItemCode: batchMatch.ItemCode,
                      DiscountPrice: finalPrice,
                    });
                  }
                } else {
                  valuemismatch.push({
                    ...orderRow,
                    priceProblem: "Price Problem",
                  });
                }

                // Update batch quantity and fulfill the order
                const reduceUom2andQTY = availableQty - remainingQty;
                console.log("before availableqty", availableQty);
                batchMatch.UOM2_Piece_Qty = reduceUom2andQTY;

                // Update the batch immediately
                await BatchOrder.updateOne(
                  { ItemCode: batchMatch.ItemCode, MKSU: batchMatch.MKSU },
                  { $set: { UOM2_Piece_Qty: reduceUom2andQTY } }
                );

                remainingQty = 0; // Order fulfilled
              } else {
                // The batch does not have enough quantity to fulfill the order
                if (Number(batchMatch.MRPPerPack) <= Number(MRP)) {
                  pendingorder.push({
                    ...orderRow,
                    MKSU: masterRow.MKSU,
                    ItemCode: batchMatch.ItemCode,
                    qtyProblem: "Quantity Problem",
                  });
                } else {
                  valuemismatch.push({
                    ...orderRow,
                    MKSU: masterRow.MKSU,
                    ItemCode: batchMatch.ItemCode,
                    priceProblem: "Price Problem",
                  });
                }

                // Use up all the available quantity in this batch
                remainingQty -= availableQty;
                batchMatch.UOM2_Piece_Qty = 0;

                // Update the batch immediately
                await BatchOrder.updateOne(
                  { ItemCode: batchMatch.ItemCode, MKSU: batchMatch.MKSU },
                  { $set: { UOM2_Piece_Qty: 0 } }
                );
              }
            }

            if (remainingQty > 0) {
              // If there's still remainingQty after checking all batch matches, add it to outOfStocks
              outOfStocks.push({
                ...orderRow,
                MKSU: MKSU,
                ItemCode: masterRow.ItemCode,
              });
            }
          }
        }
      }
    }

    // Insert matched data into CustomerOrder
    if (ordersToUpdate.length > 0) {
      await CustomerOrder.insertMany(ordersToUpdate);
      console.log("Orders successfully updated in CustomerOrder");
    }

    if (valuemismatch.length > 0) {
      await Valuemismatch.insertMany(valuemismatch);
      console.log("Orders successfully added to Valuemismatch");
    }

    if (pendingorder.length > 0) {
      await PendingOrder.insertMany(pendingorder);
      console.log("Orders successfully added to PendingOrder");
    }

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
