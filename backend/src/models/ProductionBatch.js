import mongoose from 'mongoose';

const productionBatchSchema = new mongoose.Schema({
  food:{type:mongoose.Schema.Types.ObjectId,ref:'Food',required:true,index:true},
  batchNo:{type:String,required:true,unique:true,index:true},
  plannedQuantity:{type:Number,min:0.000001,required:true},
  producedQuantity:{type:Number,min:0.000001,required:true},
  unit:{type:String,enum:['portion','pcs','kg','l'],default:'portion'},
  producedAt:{type:Date,default:Date.now},
  expiryDate:{type:Date,index:true},
  status:{type:String,enum:['PLANNED','COMPLETED','CANCELLED'],default:'COMPLETED'},
  ingredientConsumption:[{
    ingredient:{type:mongoose.Schema.Types.ObjectId,ref:'Ingredient'},
    quantity:{type:Number,min:0},
    unit:{type:String},
  }],
  createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}
},{timestamps:true,versionKey:false});
export const ProductionBatch=mongoose.model('ProductionBatch',productionBatchSchema);
