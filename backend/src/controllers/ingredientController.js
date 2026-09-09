import mongoose from 'mongoose';
import { Ingredient } from '../models/Ingredient.js';
import { IngredientBatch } from '../models/IngredientBatch.js';
import { IngredientLedger } from '../models/IngredientLedger.js';
import { Wastage } from '../models/Wastage.js';
import { ApiError } from '../utils/apiError.js';
import { convertUnit } from '../utils/unitConversion.js';

export async function list(req,res){
 const ingredients=await Ingredient.find().sort({name:1}).lean();
 const ids=ingredients.map(x=>x._id);
 const agg=await IngredientBatch.aggregate([{$match:{ingredient:{$in:ids},active:true,quantity:{$gt:0}}},{$group:{_id:'$ingredient',quantity:{$sum:'$quantity'}}}]);
 const totals=new Map(agg.map(x=>[String(x._id),x.quantity]));
 res.json({success:true,data:{ingredients:ingredients.map(x=>({...x,stock:totals.get(String(x._id))||0}))}});
}
export async function create(req,res){
 const {name,sku,baseUnit,costPerBaseUnit=0,reorderLevel=0,expiryRequired=false}=req.body;
 const ingredient=await Ingredient.create({name,sku,baseUnit,costPerBaseUnit,reorderLevel,expiryRequired});
 res.status(201).json({success:true,data:{ingredient}});
}
export async function receive(req,res){
 const {ingredient,batchNo,quantity,unit,unitCost=0,expiryDate,supplier}=req.body;
 const session=await mongoose.startSession();
 try{
  let batch;
  await session.withTransaction(async()=>{
   const ing=await Ingredient.findOne({_id:ingredient,active:true}).session(session);
   if(!ing) throw new ApiError(404,'Ingredient not found');
   const qty=convertUnit(Number(quantity),unit,ing.baseUnit);
   [batch]=await IngredientBatch.create([{ingredient,batchNo,quantity:qty,unit:ing.baseUnit,unitCost:Number(unitCost),expiryDate,supplier}],{session});
   await IngredientLedger.create([{ingredient,batch:batch._id,type:'PURCHASE',quantity:qty,unit:ing.baseUnit,balanceAfter:qty,referenceType:'PURCHASE',note:`Received batch ${batchNo}`,createdBy:req.user._id}],{session});
  });
  res.status(201).json({success:true,message:'Ingredient batch received',data:{batch}});
 }finally{await session.endSession();}
}
export async function wastage(req,res){
 const {ingredient,batch,quantity,unit,reason,notes}=req.body;
 const session=await mongoose.startSession();
 try{
  let record;
  await session.withTransaction(async()=>{
   const ing=await Ingredient.findOne({_id:ingredient,active:true}).session(session);
   if(!ing) throw new ApiError(404,'Ingredient not found');
   const qty=convertUnit(Number(quantity),unit,ing.baseUnit);
   let q={ingredient,active:true,quantity:{$gt:0}};
   if(batch) q._id=batch;
   const batches=await IngredientBatch.find(q).sort({expiryDate:1,receivedAt:1}).session(session);
   let remaining=qty, consumed=0;
   for(const b of batches){
    if(remaining<=0) break;
    const take=Math.min(b.quantity,remaining);
    b.quantity-=take; if(b.quantity<=0) b.active=false;
    await b.save({session});
    await IngredientLedger.create([{ingredient,batch:b._id,type:'WASTAGE',quantity:-take,unit:ing.baseUnit,balanceAfter:b.quantity,referenceType:'WASTAGE',note:notes||reason,createdBy:req.user._id}],{session});
    consumed+=take; remaining-=take;
   }
   if(remaining>1e-9) throw new ApiError(409,'Insufficient ingredient stock');
   [record]=await Wastage.create([{ingredient,batch,quantity:qty,unit:ing.baseUnit,reason,notes,createdBy:req.user._id}],{session});
  });
  res.status(201).json({success:true,message:'Wastage recorded',data:{wastage:record}});
 }finally{await session.endSession();}
}
