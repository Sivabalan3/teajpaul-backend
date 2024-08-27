const mongoose=require("mongoose");

const QuotationSchema=mongoose.Schema({},{strict:false});
const Quotation=mongoose.model('D-MART-Qutation',QuotationSchema);
module.exports=Quotation