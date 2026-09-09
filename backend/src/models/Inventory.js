import mongoose from 'mongoose';
const inventorySchema = new mongoose.Schema({
  food:{type:mongoose.Schema.Types.ObjectId,ref:'Food',required:true,index:true},
  quantity:{type:Number,required:true,min:0,default:0},
  unit:{type:String,trim:true,maxlength:20,default:'unit'},
  reorderLevel:{type:Number,min:0,default:10},
  lastUpdatedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'},
  updatedAtStock:{type:Date,default:Date.now}
},{timestamps:true,versionKey:false});
export const Inventory=mongoose.model('Inventory',inventorySchema);
