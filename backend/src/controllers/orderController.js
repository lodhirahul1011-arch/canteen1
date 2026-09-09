import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { Food } from '../models/Food.js';
import { Inventory } from '../models/Inventory.js';
import { StockLedger } from '../models/StockLedger.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { Invoice } from '../models/Invoice.js';
import { Recipe } from '../models/Recipe.js';
import { ApiError } from '../utils/apiError.js';
import { consumeRecipeForOrder, reverseOrderRecipe } from '../utils/recipeConsumption.js';

const STAFF_ROLES = ['MASTER_ADMIN','ADMIN','STAFF'];

export async function list(req, res) {
  const filter = {};
  if (req.user.role === 'MEMBER') filter.member = req.user._id;
  else if (req.query.member) filter.member = req.query.member;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.from || req.query.to) { filter.createdAt = {}; if (req.query.from) filter.createdAt.$gte = new Date(req.query.from); if (req.query.to) filter.createdAt.$lte = new Date(`${req.query.to}T23:59:59.999Z`); }
  if (req.query.q) { const q = String(req.query.q).trim(); filter.orderNo = { $regex: q, $options: 'i' }; }
  const limit = Math.min(Math.max(Number(req.query.limit)||100,1),200);
  const orders = await Order.find(filter).limit(limit)
    .populate('member','name email mobile')
    .populate('items.food','name')
    .sort({createdAt:-1}).lean();
  res.json({success:true,data:{orders}});
}

export async function getOne(req,res) {
  const filter = {_id:req.params.id};
  if (req.user.role === 'MEMBER') filter.member = req.user._id;
  const order = await Order.findOne(filter).populate('member','name email mobile').populate('items.food','name').lean();
  if (!order) throw new ApiError(404,'Order not found');
  res.json({success:true,data:{order}});
}

export async function create(req,res) {
  const { member, items, tax=0, discount=0, notes='' } = req.body;
  const memberId = req.user.role === 'MEMBER' ? req.user._id : member;
  if (!memberId || !await User.exists({_id:memberId,status:'ACTIVE',role:'MEMBER'})) throw new ApiError(400,'Active member not found');
  if (!Array.isArray(items) || !items.length) throw new ApiError(400,'At least one order item is required');
  const ids = items.map(i=>i.food);
  if (new Set(ids.map(String)).size !== ids.length) throw new ApiError(400,'Duplicate food items are not allowed; merge quantities before ordering');
  const foods = await Food.find({_id:{$in:ids},status:'ACTIVE'}).select('name price').lean();
  const byId = new Map(foods.map(f=>[String(f._id),f]));
  if (foods.length !== ids.length) throw new ApiError(400,'One or more food items are invalid or inactive');
  const normalized = items.map(i => {
    const food=byId.get(String(i.food)); const quantity=Number(i.quantity);
    return {food:i.food,name:food.name,quantity,unitPrice:food.price,total:quantity*food.price};
  });
  if (normalized.some(i=>!Number.isInteger(i.quantity)||i.quantity<1)) throw new ApiError(400,'Order quantity must be a positive integer');
  const subtotal=normalized.reduce((s,i)=>s+i.total,0);
  const taxValue=Number(tax)||0, discountValue=Number(discount)||0;
  if (taxValue<0 || discountValue<0 || discountValue>subtotal+taxValue) throw new ApiError(400,'Invalid tax or discount');
  const total=subtotal+taxValue-discountValue;
  const session=await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async()=>{
      const orderNo=`ORD-${Date.now()}-${Math.floor(Math.random()*1000)}`;
      [order]=await Order.create([{orderNo,member:memberId,items:normalized,subtotal,tax:taxValue,discount:discountValue,total,notes,createdBy:req.user._id}],{session});
      for (const item of normalized) {
        try {
          const usedRecipe = await consumeRecipeForOrder({
            food:item.food, orderId:order._id, orderNo:order.orderNo,
            quantity:item.quantity, userId:req.user._id, session
          });
          if (usedRecipe) continue;
        } catch (e) {
          throw new ApiError(409,e.message);
        }
        const inv=await Inventory.findOneAndUpdate(
          {food:item.food, quantity:{$gte:item.quantity}},
          {$inc:{quantity:-item.quantity}, $set:{updatedAtStock:new Date(),lastUpdatedBy:req.user._id}},
          {new:true,session}
        );
        if (!inv) throw new ApiError(409,`Insufficient stock for ${item.name}`);
        await StockLedger.create([{food:item.food,type:'ISSUE',quantity:-item.quantity,balanceAfter:inv.quantity,referenceType:'ORDER',referenceId:order._id,note:`Order ${order.orderNo}`,createdBy:req.user._id}],{session});
      }
      const invoiceNo=`INV-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${String(Date.now()).slice(-6)}`;
      await Invoice.create([{invoiceNo,order:order._id,member:memberId,items:normalized,subtotal,tax:taxValue,discount:discountValue,total,status:'ISSUED',issuedAt:new Date(),createdBy:req.user._id}],{session});
    });
    await Notification.create({recipient:memberId,title:'Order placed',message:`${order.orderNo} has been created and stock has been reserved.`,type:'ORDER'});
    await order.populate([{path:'member',select:'name email mobile'},{path:'items.food',select:'name'}]);
    res.status(201).json({success:true,message:'Order created, stock deducted and invoice issued',data:{order}});
  } finally { await session.endSession(); }
}

export async function updateStatus(req,res) {
  if (!STAFF_ROLES.includes(req.user.role)) throw new ApiError(403,'Insufficient role permissions');
  const transitions={
    PENDING:['CONFIRMED','CANCELLED'],
    CONFIRMED:['PREPARING','CANCELLED'],
    PREPARING:['READY','CANCELLED'],
    READY:['COMPLETED','CANCELLED'],
    COMPLETED:[],
    CANCELLED:[]
  };
  const {status}=req.body;
  if (!Object.keys(transitions).includes(status)) throw new ApiError(400,'Invalid order status');
  const session=await mongoose.startSession();
  try {
    let order;
    await session.withTransaction(async()=>{
      order=await Order.findById(req.params.id).session(session);
      if(!order) throw new ApiError(404,'Order not found');
      if(!transitions[order.status].includes(status)) throw new ApiError(409,`Invalid status transition: ${order.status} → ${status}`);
      if(status==='CANCELLED'){
        await reverseOrderRecipe({orderId:order._id,orderNo:order.orderNo,userId:req.user._id,session});
        for(const item of order.items){
          const hadRecipe=await Recipe.findOne({food:item.food,active:true}).session(session).lean();
          if(hadRecipe) continue;
          const inv=await Inventory.findOneAndUpdate({food:item.food},{$inc:{quantity:item.quantity},$set:{updatedAtStock:new Date(),lastUpdatedBy:req.user._id}},{new:true,session});
          if(!inv) throw new ApiError(409,`Inventory record missing for ${item.name}`);
          await StockLedger.create([{food:item.food,type:'RETURN',quantity:item.quantity,balanceAfter:inv.quantity,referenceType:'ORDER',referenceId:order._id,note:`Cancelled ${order.orderNo}`,createdBy:req.user._id}],{session});
        }
        await Invoice.updateOne({order:order._id},{$set:{status:'VOID',voidedAt:new Date(),voidReason:'Order cancelled'}},{session});
      }
      order.status=status;
      if(status==='COMPLETED') order.completedAt=new Date();
      if(status==='CANCELLED') order.cancelledAt=new Date();
      await order.save({session});
    });
    order=await Order.findById(req.params.id).populate('member','name email mobile').populate('items.food','name');
    await Notification.create({recipient:order.member,title:'Order updated',message:`${order.orderNo} is now ${status}.`,type:'ORDER'});
    res.json({success:true,message:'Order status updated',data:{order}});
  } finally { await session.endSession(); }
}

