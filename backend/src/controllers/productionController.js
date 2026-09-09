import mongoose from 'mongoose';
import { ProductionBatch } from '../models/ProductionBatch.js';
import { Recipe } from '../models/Recipe.js';
import { RecipeIngredient } from '../models/RecipeIngredient.js';
import { Ingredient } from '../models/Ingredient.js';
import { IngredientBatch } from '../models/IngredientBatch.js';
import { IngredientLedger } from '../models/IngredientLedger.js';
import { ApiError } from '../utils/apiError.js';
import { convertUnit } from '../utils/unitConversion.js';

export async function list(req,res){
 const batches=await ProductionBatch.find().populate('food','name').sort({createdAt:-1}).limit(200).lean();
 res.json({success:true,data:{batches}});
}
export async function create(req,res){
 const {food,producedQuantity,unit='portion',batchNo,expiryDate}=req.body;
 const qty=Number(producedQuantity);
 if(!qty || qty<=0) throw new ApiError(400,'Produced quantity must be positive');
 const session=await mongoose.startSession();
 try{
  let production;
  await session.withTransaction(async()=>{
   const recipe=await Recipe.findOne({food,active:true}).session(session);
   if(!recipe) throw new ApiError(400,'Active recipe is required for production');
   const lines=await RecipeIngredient.find({recipe:recipe._id}).lean();
   const consumption=[];
   for(const line of lines){
    const ing=await Ingredient.findOne({_id:line.ingredient,active:true}).session(session);
    if(!ing) throw new ApiError(400,'Recipe contains inactive ingredient');
    const required=convertUnit((line.quantity/recipe.yieldQuantity)*qty*(1+(line.wastePercent||0)/100),line.unit,ing.baseUnit);
    let remaining=required;
    const batches=await IngredientBatch.find({ingredient:ing._id,active:true,quantity:{$gt:0}}).sort({expiryDate:1,receivedAt:1}).session(session);
    for(const b of batches){
      if(remaining<=0) break;
      const take=Math.min(b.quantity,remaining);
      b.quantity-=take; if(b.quantity<=0) b.active=false;
      await b.save({session});
      await IngredientLedger.create([{ingredient:ing._id,batch:b._id,type:'PRODUCTION_CONSUMPTION',quantity:-take,unit:ing.baseUnit,balanceAfter:b.quantity,referenceType:'PRODUCTION',note:`Production ${batchNo}`,createdBy:req.user._id}],{session});
      remaining-=take;
    }
    if(remaining>1e-9) throw new ApiError(409,`Insufficient stock for ${ing.name}`);
    consumption.push({ingredient:ing._id,quantity:required,unit:ing.baseUnit});
   }
   [production]=await ProductionBatch.create([{food,batchNo,plannedQuantity:qty,producedQuantity:qty,unit,expiryDate,ingredientConsumption:consumption,createdBy:req.user._id}],{session});
  });
  res.status(201).json({success:true,message:'Production batch created and ingredients deducted',data:{production}});
 }finally{await session.endSession();}
}
