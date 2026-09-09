import { Payment } from '../models/Payment.js';
import { Order } from '../models/Order.js';
import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/apiError.js';

export async function list(req,res){
  const filter={};
  if(req.query.status) filter.status=req.query.status;
  if(req.query.method) filter.method=req.query.method;
  if(req.query.order) filter.order=req.query.order;
  const payments=await Payment.find(filter).populate({path:'order',populate:{path:'member',select:'name email'}}).sort({createdAt:-1}).lean();
  res.json({success:true,data:{payments}});
}

export async function getOne(req,res){
  const payment=await Payment.findById(req.params.id).populate({path:'order',populate:{path:'member',select:'name email mobile'}});
  if(!payment) throw new ApiError(404,'Payment not found');
  if(req.user.role==='MEMBER' && String(payment.order.member._id)!==String(req.user._id)) throw new ApiError(403,'Access denied');
  res.json({success:true,data:{payment}});
}

export async function create(req,res){
  const {order:orderId,amount,method,transactionId,notes}=req.body;
  const order=await Order.findById(orderId);
  if(!order) throw new ApiError(404,'Order not found');
  if(await Payment.exists({order:order._id})) throw new ApiError(409,'Payment already exists for this order');
  const value=Number(amount);
  if(value!==Number(order.total)) throw new ApiError(400,'Payment amount must equal order total');
  const status=req.body.status || 'SUCCESS';
  const paymentNo=`PAY-${Date.now()}-${Math.floor(Math.random()*1000)}`;
  const payment=await Payment.create({paymentNo,order:order._id,amount:value,method,status,transactionId,notes,paidAt:status==='SUCCESS'?new Date():undefined,createdBy:req.user._id});
  if(status==='SUCCESS') order.paymentStatus='PAID'; else if(status==='PENDING') order.paymentStatus='PENDING';
  await order.save();
  await Notification.create({recipient:order.member,title:'Payment updated',message:`Payment ${payment.paymentNo} is ${status}.`,type:'PAYMENT'});
  res.status(201).json({success:true,message:'Payment recorded',data:{payment}});
}

export async function updateStatus(req,res){
  const payment=await Payment.findById(req.params.id);
  if(!payment) throw new ApiError(404,'Payment not found');
  const status=req.body.status;
  if(!['PENDING','SUCCESS','FAILED','REFUNDED'].includes(status)) throw new ApiError(400,'Invalid payment status');
  payment.status=status; payment.paidAt=status==='SUCCESS' ? (payment.paidAt||new Date()) : payment.paidAt;
  await payment.save();
  const order=await Order.findById(payment.order);
  if(order){ order.paymentStatus=status==='SUCCESS'?'PAID':status==='REFUNDED'?'REFUNDED':status==='PENDING'?'PENDING':'UNPAID'; await order.save(); }
  res.json({success:true,message:'Payment status updated',data:{payment}});
}
