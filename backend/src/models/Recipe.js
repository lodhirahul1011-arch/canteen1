import mongoose from 'mongoose';

const recipeSchema = new mongoose.Schema({
  food:{type:mongoose.Schema.Types.ObjectId,ref:'Food',required:true,unique:true,index:true},
  yieldQuantity:{type:Number,min:0.000001,default:1},
  yieldUnit:{type:String,enum:['portion','pcs','kg','l'],default:'portion'},
  version:{type:Number,min:1,default:1},
  active:{type:Boolean,default:true},
  notes:{type:String,trim:true,maxlength:500}
},{timestamps:true,versionKey:false});
export const Recipe=mongoose.model('Recipe',recipeSchema);
