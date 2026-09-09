import { Recipe } from '../models/Recipe.js';
import { RecipeIngredient } from '../models/RecipeIngredient.js';
import { Ingredient } from '../models/Ingredient.js';
import { IngredientBatch } from '../models/IngredientBatch.js';
import { IngredientLedger } from '../models/IngredientLedger.js';
import { convertUnit } from './unitConversion.js';

export async function consumeRecipeForOrder({food,orderId,orderNo,quantity,userId,session}){
  const recipe=await Recipe.findOne({food,active:true}).session(session).lean();
  if(!recipe) return false;
  const lines=await RecipeIngredient.find({recipe:recipe._id}).session(session).lean();
  if(!lines.length) return false;
  const planned=[];
  for(const line of lines){
    const ing=await Ingredient.findOne({_id:line.ingredient,active:true}).session(session).lean();
    if(!ing) throw new Error('Recipe contains inactive ingredient');
    const required=convertUnit((line.quantity/recipe.yieldQuantity)*quantity*(1+(line.wastePercent||0)/100),line.unit,ing.baseUnit);
    let remaining=required;
    const batches=await IngredientBatch.find({ingredient:ing._id,active:true,quantity:{$gt:0}})
      .sort({expiryDate:1,receivedAt:1}).session(session);
    for(const b of batches){
      if(remaining<=0) break;
      const take=Math.min(b.quantity,remaining);
      b.quantity-=take; if(b.quantity<=0) b.active=false;
      await b.save({session});
      await IngredientLedger.create([{ingredient:ing._id,batch:b._id,type:'SALE_CONSUMPTION',quantity:-take,unit:ing.baseUnit,balanceAfter:b.quantity,referenceType:'ORDER',referenceId:orderId,note:`Order ${orderNo}`,createdBy:userId}],{session});
      planned.push({ingredient:ing._id,batch:b._id,quantity:take,unit:ing.baseUnit});
      remaining-=take;
    }
    if(remaining>1e-9) throw new Error(`Insufficient ingredient stock for ${ing.name}`);
  }
  return planned;
}

export async function reverseOrderRecipe({orderId,orderNo,userId,session}){
  const entries=await IngredientLedger.find({referenceType:'ORDER',referenceId:orderId,type:'SALE_CONSUMPTION'}).session(session).lean();
  for(const e of entries){
    const batch=await IngredientBatch.findById(e.batch).session(session);
    if(!batch) continue;
    batch.quantity+=Math.abs(e.quantity); batch.active=true; await batch.save({session});
    await IngredientLedger.create([{ingredient:e.ingredient,batch:e.batch,type:'RETURN',quantity:Math.abs(e.quantity),unit:e.unit,balanceAfter:batch.quantity,referenceType:'ORDER',referenceId:orderId,note:`Cancelled ${orderNo}`,createdBy:userId}],{session});
  }
  return entries.length;
}
