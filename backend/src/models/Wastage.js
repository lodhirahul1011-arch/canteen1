import mongoose from 'mongoose';

const wastageSchema = new mongoose.Schema({
  ingredient:{type:mongoose.Schema.Types.ObjectId,ref:'Ingredient',required:true,index:true},
  batch:{type:mongoose.Schema.Types.ObjectId,ref:'IngredientBatch'},
  quantity:{type:Number,min:0.000001,required:true},
  unit:{type:String,enum:['g','kg','ml','l','pcs'],required:true},
  reason:{type:String,enum:['SPOILED','EXPIRED','SPILLAGE','OVERCOOKED','STAFF_MEAL','SAMPLE','DAMAGE','OTHER'],required:true},
  notes:{type:String,trim:true,maxlength:500},
  createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}
},{timestamps:true,versionKey:false});
export const Wastage=mongoose.model('Wastage',wastageSchema);
