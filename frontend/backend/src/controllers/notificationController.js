import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/apiError.js';

export async function list(req,res){
  const notifications=await Notification.find({recipient:req.user._id}).sort({createdAt:-1}).limit(100).lean();
  const unread=await Notification.countDocuments({recipient:req.user._id,readAt:null});
  res.json({success:true,data:{notifications,unread}});
}
export async function markRead(req,res){
  const n=await Notification.findOneAndUpdate({_id:req.params.id,recipient:req.user._id},{$set:{readAt:new Date()}},{new:true});
  if(!n) throw new ApiError(404,'Notification not found');
  res.json({success:true,message:'Notification marked as read',data:{notification:n}});
}
export async function markAllRead(req,res){
  await Notification.updateMany({recipient:req.user._id,readAt:null},{$set:{readAt:new Date()}});
  res.json({success:true,message:'Notifications marked as read'});
}
