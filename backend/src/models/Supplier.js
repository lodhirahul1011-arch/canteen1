import mongoose from 'mongoose';
const supplierSchema = new mongoose.Schema({
  name:{type:String,required:true,trim:true,minlength:2,maxlength:120,index:true},
  company:{type:String,trim:true,maxlength:120}, phone:{type:String,required:true,trim:true,maxlength:20},
  email:{type:String,trim:true,lowercase:true,maxlength:160}, address:{type:String,trim:true,maxlength:300},
  gstNumber:{type:String,trim:true,uppercase:true,maxlength:30}, status:{type:String,enum:['ACTIVE','INACTIVE'],default:'ACTIVE',index:true}
},{timestamps:true,versionKey:false});
supplierSchema.index({name:'text',company:'text',phone:'text'});
export const Supplier=mongoose.model('Supplier',supplierSchema);
