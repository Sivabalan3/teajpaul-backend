const mongoose=require('mongoose')

const BatchExcelSchema=new mongoose.Schema({},{strict:false})
const Customerexcel=mongoose.model('BatchExcelFile',BatchExcelSchema)
module.exports=Customerexcel;
