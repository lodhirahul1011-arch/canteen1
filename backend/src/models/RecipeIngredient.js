import mongoose from 'mongoose';

const recipeIngredientSchema = new mongoose.Schema({
  recipe:{type:mongoose.Schema.Types.ObjectId,ref:'Recipe',required:true,index:true},
  ingredient:{type:mongoose.Schema.Types.ObjectId,ref:'Ingredient',required:true,index:true},
  quantity:{type:Number,min:0.000001,required:true},
  unit:{type:String,enum:['g','kg','ml','l','pcs'],required:true},
  wastePercent:{type:Number,min:0,max:100,default:0}
},{timestamps:true,versionKey:false});
recipeIngredientSchema.index({recipe:1,ingredient:1},{unique:true});
export const RecipeIngredient=mongoose.model('RecipeIngredient',recipeIngredientSchema);
