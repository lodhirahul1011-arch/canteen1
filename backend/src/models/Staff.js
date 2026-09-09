import mongoose from 'mongoose';
const staffSchema = new mongoose.Schema({
  name:{type:String,required:true,trim:true,minlength:2,maxlength:100,index:true}, employeeId:{type:String,required:true,unique:true,trim:true,uppercase:true,index:true},
  phone:{type:String,trim:true,maxlength:20}, email:{type:String,trim:true,lowercase:true,maxlength:160}, department:{type:String,trim:true,maxlength:80},
  designation:{type:String,trim:true,maxlength:80}, status:{type:String,enum:['ACTIVE','INACTIVE','ON_LEAVE'],default:'ACTIVE',index:true}, joinedAt:{type:Date,default:Date.now}
},{timestamps:true,versionKey:false});
staffSchema.index({name:'text',employeeId:'text',department:'text'});
export const Staff=mongoose.model('Staff',staffSchema);
