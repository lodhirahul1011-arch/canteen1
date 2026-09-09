import mongoose from 'mongoose';

const ingredientBatchSchema = new mongoose.Schema({
  ingredient:{type:mongoose.Schema.Types.ObjectId,ref:'Ingredient',required:true,index:true},
  batchNo:{type:String,required:true,trim:true},
  quantity:{type:Number,min:0,required:true},
  unit:{type:String,enum:['g','kg','ml','l','pcs'],required:true},
  unitCost:{type:Number,min:0,default:0},
  receivedAt:{type:Date,default:Date.now},
  expiryDate:{type:Date,index:true},
  supplier:{type:mongoose.Schema.Types.ObjectId,ref:'Supplier'},
  active:{type:Boolean,default:true}
},{timestamps:true,versionKey:false});
ingredientBatchSchema.index({ingredient:1,expiryDate:1});
export const IngredientBatch=mongoose.model('IngredientBatch',ingredientBatchSchema);
