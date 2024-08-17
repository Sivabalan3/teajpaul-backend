const mongoose=require('mongoose');

const SpaarSchema=new mongoose.Schema({},{strict:false});
const Spaar= mongoose.model("Spaar",SpaarSchema);
module.exports=Spaar;