import mongoose from 'mongoose';
const itemSchema=new mongoose.Schema({food:{type:mongoose.Schema.Types.ObjectId,ref:'Food',required:true},quantity:{type:Number,required:true,min:0.001},unitPrice:{type:Number,required:true,min:0},total:{type:Number,required:true,min:0}},{_id:false});
const purchaseSchema=new mongoose.Schema({
  purchaseNo:{type:String,required:true,unique:true,index:true}, supplier:{type:mongoose.Schema.Types.ObjectId,ref:'Supplier',required:true,index:true}, items:{type:[itemSchema],required:true,validate:v=>v.length>0}, subtotal:{type:Number,min:0,required:true}, tax:{type:Number,min:0,default:0}, total:{type:Number,min:0,required:true}, status:{type:String,enum:['RECEIVED','CANCELLED'],default:'RECEIVED',index:true}, invoiceNo:{type:String,trim:true,maxlength:80}, purchaseDate:{type:Date,default:Date.now}, notes:{type:String,trim:true,maxlength:500}, createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}, cancelledAt:Date, cancelledBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}
},{timestamps:true,versionKey:false});
export const Purchase=mongoose.model('Purchase',purchaseSchema);
