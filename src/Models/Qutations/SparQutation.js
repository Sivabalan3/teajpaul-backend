const mongoose=require("mongoose");

const QuotationSchema=mongoose.Schema({},{strict:false});
const SparQuotation=mongoose.model('Spar-Qutation',QuotationSchema);
module.exports=SparQuotation