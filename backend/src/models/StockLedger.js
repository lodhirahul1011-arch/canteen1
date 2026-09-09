import mongoose from 'mongoose';
const ledgerSchema=new mongoose.Schema({
  food:{type:mongoose.Schema.Types.ObjectId,ref:'Food',required:true,index:true}, type:{type:String,enum:['PURCHASE','ADJUSTMENT','ISSUE','RETURN'],required:true,index:true},
  quantity:{type:Number,required:true}, balanceAfter:{type:Number,required:true,min:0}, referenceType:{type:String,enum:['PURCHASE','ORDER','MANUAL','OTHER'],default:'OTHER'}, referenceId:{type:mongoose.Schema.Types.ObjectId}, note:{type:String,trim:true,maxlength:300}, createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}
},{timestamps:true,versionKey:false});
export const StockLedger=mongoose.model('StockLedger',ledgerSchema);
