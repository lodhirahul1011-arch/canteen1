import mongoose from 'mongoose';

const ingredientSchema = new mongoose.Schema({
  name:{type:String,required:true,trim:true,maxlength:120},
  sku:{type:String,trim:true,uppercase:true,index:true},
  baseUnit:{type:String,enum:['g','kg','ml','l','pcs'],required:true,default:'g'},
  costPerBaseUnit:{type:Number,min:0,default:0},
  reorderLevel:{type:Number,min:0,default:0},
  active:{type:Boolean,default:true,index:true},
  expiryRequired:{type:Boolean,default:false}
},{timestamps:true,versionKey:false});
ingredientSchema.index({name:1},{unique:true});
export const Ingredient=mongoose.model('Ingredient',ingredientSchema);
