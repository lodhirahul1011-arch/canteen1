import mongoose from 'mongoose';
import { Purchase } from '../models/Purchase.js';
import { Supplier } from '../models/Supplier.js';
import { Food } from '../models/Food.js';
import { Inventory } from '../models/Inventory.js';
import { StockLedger } from '../models/StockLedger.js';
import { ApiError } from '../utils/apiError.js';

export async function list(req,res){
  const filter={};
  if(req.query.supplier)filter.supplier=req.query.supplier;
  if(req.query.status)filter.status=req.query.status;
  if(req.query.from||req.query.to){filter.purchaseDate={};if(req.query.from)filter.purchaseDate.$gte=new Date(req.query.from);if(req.query.to)filter.purchaseDate.$lte=new Date(`${req.query.to}T23:59:59.999Z`)}
  const purchases=await Purchase.find(filter).populate('supplier','name company phone').populate('items.food','name').sort({purchaseDate:-1}).lean();
  res.json({success:true,data:{purchases}})
}

export async function getOne(req,res){const x=await Purchase.findById(req.params.id).populate('supplier','name company phone').populate('items.food','name');if(!x)throw new ApiError(404,'Purchase not found');res.json({success:true,data:{purchase:x}})}

export async function create(req,res){
  const {supplier,items,tax=0,invoiceNo='',purchaseDate,notes=''}=req.body;
  if(!await Supplier.exists({_id:supplier,status:'ACTIVE'}))throw new ApiError(400,'Active supplier not found');
  if(!Array.isArray(items)||!items.length)throw new ApiError(400,'At least one purchase item is required');
  const foods=await Food.find({_id:{$in:items.map(i=>i.food)}}).select('_id').lean();
  if(foods.length!==new Set(items.map(i=>String(i.food))).size)throw new ApiError(400,'One or more food items are invalid');

  const merged=new Map();
  for(const i of items){
    const key=String(i.food);const quantity=Number(i.quantity);const unitPrice=Number(i.unitPrice);
    if(!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(unitPrice)||unitPrice<0)throw new ApiError(400,'Invalid purchase quantity or price');
    if(merged.has(key)){const old=merged.get(key);old.quantity+=quantity;old.total+=quantity*unitPrice;old.unitPrice=old.total/old.quantity}else merged.set(key,{food:i.food,quantity,unitPrice,total:quantity*unitPrice});
  }
  const normalized=[...merged.values()];
  const taxValue=Number(tax||0);if(!Number.isFinite(taxValue)||taxValue<0)throw new ApiError(400,'Invalid tax');
  const subtotal=normalized.reduce((s,i)=>s+i.total,0);const total=subtotal+taxValue;
  const session=await mongoose.startSession();
  try{let purchase;
    await session.withTransaction(async()=>{
      const purchaseNo=`PUR-${Date.now()}-${Math.floor(Math.random()*1000)}`;
      [purchase]=await Purchase.create([{purchaseNo,supplier,items:normalized,subtotal,tax:taxValue,total,invoiceNo,purchaseDate,notes,createdBy:req.user._id}],{session});
      for(const item of normalized){
        let inv=await Inventory.findOne({food:item.food}).session(session);const next=(inv?.quantity||0)+item.quantity;
        if(!inv)[inv]=await Inventory.create([{food:item.food,quantity:next,lastUpdatedBy:req.user._id,updatedAtStock:new Date()}],{session});
        else{inv.quantity=next;inv.lastUpdatedBy=req.user._id;inv.updatedAtStock=new Date();await inv.save({session})}
        await StockLedger.create([{food:item.food,type:'PURCHASE',quantity:item.quantity,balanceAfter:next,referenceType:'PURCHASE',referenceId:purchase._id,note:`Purchase ${purchaseNo}`,createdBy:req.user._id}],{session})
      }
    });
    await purchase.populate([{path:'supplier',select:'name company phone'},{path:'items.food',select:'name'}]);res.status(201).json({success:true,message:'Purchase received and stock updated',data:{purchase}})
  }finally{await session.endSession()}
}

export async function cancel(req,res){
  const session=await mongoose.startSession();
  try{let purchase;
    await session.withTransaction(async()=>{
      purchase=await Purchase.findById(req.params.id).session(session);
      if(!purchase)throw new ApiError(404,'Purchase not found');
      if(purchase.status==='CANCELLED')throw new ApiError(409,'Purchase is already cancelled');
      for(const item of purchase.items){
        const inv=await Inventory.findOneAndUpdate({food:item.food,quantity:{$gte:item.quantity}},{$inc:{quantity:-item.quantity},$set:{updatedAtStock:new Date(),lastUpdatedBy:req.user._id}},{new:true,session});
        if(!inv)throw new ApiError(409,`Cannot cancel purchase; stock for ${item.food} has already been consumed`);
        await StockLedger.create([{food:item.food,type:'RETURN',quantity:-item.quantity,balanceAfter:inv.quantity,referenceType:'PURCHASE',referenceId:purchase._id,note:`Reversal ${purchase.purchaseNo}`,createdBy:req.user._id}],{session});
      }
      purchase.status='CANCELLED';purchase.cancelledAt=new Date();purchase.cancelledBy=req.user._id;await purchase.save({session});
    });
    await purchase.populate([{path:'supplier',select:'name company phone'},{path:'items.food',select:'name'}]);
    res.json({success:true,message:'Purchase cancelled and inventory rolled back',data:{purchase}})
  }finally{await session.endSession()}
}
