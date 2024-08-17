const mongoose=require('mongoose');

const DmartSchema=new mongoose.Schema({},{strict:false});
const Dmart= mongoose.model('Dmart',DmartSchema);
module.exports=Dmart;

