const XLSX = require('xlsx');
const ExcelData = require('../../Models/MasterExcelData');
exports.uploadExcel = async (req, res) => {
  try {
    const file = req.file;

    // Check if a file was uploaded
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check if there's already a file in the database
    const existingFile = await ExcelData.findOne({});
    if (existingFile) {
      return res.status(400).json({
        message: 'A file has already been uploaded. Please delete the existing file before uploading a new one.',
      });
    }

    // Read and process the Excel file
    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Insert data into MongoDB
    const insertedData = await ExcelData.insertMany(worksheet);

    // Respond with a success message and inserted data
    res.status(200).json({
      message: 'File uploaded and data successfully saved!',
      data: insertedData,
    });
  } catch (error) {
    console.error('Error uploading file:', error); // Log the error for debugging
    res.status(500).json({ message: 'Error uploading file', error: error.message });
  }
};
exports.updateExcel = async (req, res) => {
  try {
    const { data } = req.body; // Receive the data array with headers

    // Extract headers and data rows
    const [headers, ...rows] = data;

    // Map headers to MongoDB fields (optional if you have specific mapping)
    const headerMap = headers.reduce((acc, header, index) => {
      acc[header] = index;
      return acc;
    }, {});

    // Iterate through each row to update MongoDB
    const updatePromises = rows.map(async (row) => {
      const id = row[headerMap['id']]; // Assuming 'id' is in headers
      const updateFields = {};

      // Create updateFields based on the headers and row values
      headers.forEach((header, index) => {
        if (header !== 'id') {
          updateFields[header] = row[index];
        }
      });

      if (id) {
        await ExcelData.updateOne(
          { id: id },
          { $set: updateFields },
          { upsert: true }
        );
      }
    });

    await Promise.all(updatePromises);

    res.status(200).json({ message: 'Data updated successfully' });
  } catch (error) {
    console.error('Error updating data', error);
    res.status(500).json({ message: 'Error updating data', error });
  }
};
exports.getExcelData = async (req, res) => {
  try {
    const data = await ExcelData.find();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching data', error });
  }
};
exports.deleteMasterExistingFile = async (req, res) => {
  try {
    // Find and delete the existing file
    const deletedData = await ExcelData.deleteMany({});

    if (deletedData.deletedCount === 0) {
      return res.status(404).json({ message: 'No existing file to delete' });
    }

    // Respond with a success message
    res.status(200).json({
      message: 'Existing file deleted successfully!',
    });
  } catch (error) {
    console.error('Error deleting file:', error); // Log the error for debugging
    res.status(500).json({ message: 'Error deleting file', error: error.message });
  }
};