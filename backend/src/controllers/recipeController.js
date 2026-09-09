import { Recipe } from '../models/Recipe.js';
import { RecipeIngredient } from '../models/RecipeIngredient.js';
import { Food } from '../models/Food.js';
import { Ingredient } from '../models/Ingredient.js';
import { ApiError } from '../utils/apiError.js';

export async function list(req,res){
  const recipes=await Recipe.find().populate('food','name price').lean();
  const ids=recipes.map(r=>r._id);
  const lines=await RecipeIngredient.find({recipe:{$in:ids}}).populate('ingredient','name baseUnit costPerBaseUnit').lean();
  const map=new Map(ids.map(id=>[String(id),[]]));
  for(const l of lines) map.get(String(l.recipe))?.push(l);
  res.json({success:true,data:{recipes:recipes.map(r=>({...r,ingredients:map.get(String(r._id))||[]}))}});
}
export async function getOne(req,res){
  const recipe=await Recipe.findById(req.params.id).populate('food','name price').lean();
  if(!recipe) throw new ApiError(404,'Recipe not found');
  const ingredients=await RecipeIngredient.find({recipe:recipe._id}).populate('ingredient','name baseUnit costPerBaseUnit').lean();
  res.json({success:true,data:{recipe:{...recipe,ingredients}}});
}
export async function create(req,res){
  const {food,yieldQuantity=1,yieldUnit='portion',notes='',active=true,ingredients=[]}=req.body;
  if(!await Food.exists({_id:food,status:'ACTIVE'})) throw new ApiError(400,'Active food not found');
  if(!Array.isArray(ingredients)||!ingredients.length) throw new ApiError(400,'At least one ingredient is required');
  const session=await Recipe.startSession();
  try{
    let recipe;
    await session.withTransaction(async()=>{
      recipe=await Recipe.findOne({food}).session(session);
      if(recipe){ recipe.version+=1; recipe.yieldQuantity=yieldQuantity; recipe.yieldUnit=yieldUnit; recipe.notes=notes; recipe.active=active; await recipe.save({session}); }
      else [recipe]=await Recipe.create([{food,yieldQuantity,yieldUnit,notes,active}],{session});
      await RecipeIngredient.deleteMany({recipe:recipe._id},{session});
      const docs=ingredients.map(x=>({recipe:recipe._id,ingredient:x.ingredient,quantity:Number(x.quantity),unit:x.unit,wastePercent:Number(x.wastePercent)||0}));
      const valid=await Ingredient.countDocuments({_id:{$in:docs.map(x=>x.ingredient)},active:true}).session(session);
      if(valid!==docs.length) throw new ApiError(400,'One or more ingredients are invalid or inactive');
      await RecipeIngredient.insertMany(docs,{session});
    });
    res.status(201).json({success:true,message:'Recipe saved',data:{recipe}});
  }finally{await session.endSession();}
}
export async function remove(req,res){
  const recipe=await Recipe.findById(req.params.id);
  if(!recipe) throw new ApiError(404,'Recipe not found');
  recipe.active=false; await recipe.save();
  res.json({success:true,message:'Recipe deactivated'});
}
