import mongoose from 'mongoose';

const schema=new mongoose.Schema({
  ingredient:{type:mongoose.Schema.Types.ObjectId,ref:'Ingredient',required:true,index:true},
  batch:{type:mongoose.Schema.Types.ObjectId,ref:'IngredientBatch',index:true},
  type:{type:String,enum:['PURCHASE','SALE_CONSUMPTION','PRODUCTION_CONSUMPTION','WASTAGE','RETURN','ADJUSTMENT'],required:true},
  quantity:{type:Number,required:true},
  unit:{type:String,enum:['g','kg','ml','l','pcs'],required:true},
  balanceAfter:{type:Number,min:0,required:true},
  referenceType:{type:String,enum:['ORDER','PURCHASE','PRODUCTION','WASTAGE','ADJUSTMENT']},
  referenceId:{type:mongoose.Schema.Types.ObjectId},
  note:{type:String,trim:true,maxlength:500},
  createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}
},{timestamps:true,versionKey:false});
schema.index({ingredient:1,createdAt:-1});
export const IngredientLedger=mongoose.model('IngredientLedger',schema);
