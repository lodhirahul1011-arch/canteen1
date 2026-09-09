import { Recipe } from '../models/Recipe.js';
import { RecipeIngredient } from '../models/RecipeIngredient.js';
import { Food } from '../models/Food.js';

export async function list(req,res){
 const foods=await Food.find({status:'ACTIVE'}).select('name price').lean();
 const recipes=await Recipe.find({active:true}).lean();
 const rmap=new Map(recipes.map(r=>[String(r.food),r]));
 const lines=await RecipeIngredient.find({recipe:{$in:recipes.map(r=>r._id)}}).populate('ingredient','name baseUnit costPerBaseUnit').lean();
 const lmap=new Map();
 for(const l of lines){ const k=String(l.recipe); if(!lmap.has(k)) lmap.set(k,[]); lmap.get(k).push(l); }
 const report=foods.map(food=>{
   const r=rmap.get(String(food._id)); const lines=lmap.get(String(r?._id))||[];
   const cost=r?lines.reduce((sum,l)=>sum + (Number(l.quantity)/Number(r.yieldQuantity||1))*Number(l.ingredient?.costPerBaseUnit||0),0):0;
   const price=Number(food.price||0);
   return {foodId:food._id,name:food.name,sellingPrice:price,ingredientCost:cost,grossMargin:price-cost,foodCostPercent:price?cost/price*100:0,recipeConfigured:Boolean(r)};
 });
 res.json({success:true,data:{report}});
}
