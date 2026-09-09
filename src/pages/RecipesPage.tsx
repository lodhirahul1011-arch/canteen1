import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, ChefHat, Trash2, PackagePlus, Scale } from 'lucide-react';
import Modal from '@/components/Modal';
import Loading from '@/components/Loading';
import { EmptyState, ErrorState } from '@/components/EmptyState';

type Ingredient={id:string;name:string;base_unit:string;cost_per_base_unit:number;reorder_level:number;active:boolean};
type Food={id:string;name:string;price:number};
type Recipe={id:string;food_id:string;yield_quantity:number;yield_unit:string;version:number;active:boolean;food?:Food|null};
type Line={ingredient_id:string;quantity:string;unit:string;waste_percent:string};

const units=['g','kg','ml','l','pcs'];
export default function RecipesPage(){
 const [ingredients,setIngredients]=useState<Ingredient[]>([]);
 const [foods,setFoods]=useState<Food[]>([]);
 const [recipes,setRecipes]=useState<Recipe[]>([]);
 const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);
 const [tab,setTab]=useState<'recipes'|'ingredients'>('recipes');
 const [recipeOpen,setRecipeOpen]=useState(false); const [ingredientOpen,setIngredientOpen]=useState(false);
 const [foodId,setFoodId]=useState(''); const [yieldQty,setYieldQty]=useState('1'); const [yieldUnit,setYieldUnit]=useState('portion');
 const [lines,setLines]=useState<Line[]>([{ingredient_id:'',quantity:'',unit:'g',waste_percent:'0'}]);
 const [name,setName]=useState(''); const [baseUnit,setBaseUnit]=useState('g'); const [cost,setCost]=useState('0'); const [saving,setSaving]=useState(false); const [msg,setMsg]=useState<string|null>(null);

 async function load(){
  setLoading(true); setError(null);
  const [i,f,r]=await Promise.all([
   supabase.from('ingredients').select('*').eq('active',true).order('name'),
   supabase.from('food_items').select('id,name,price').order('name'),
   supabase.from('recipes').select('*,food:food_items(id,name,price)').eq('active',true).order('created_at',{ascending:false})
  ]);
  if(i.error||f.error||r.error){setError((i.error||f.error||r.error)?.message||'Failed to load recipes');}
  else {setIngredients(i.data||[]);setFoods(f.data||[]);setRecipes(r.data||[]);}
  setLoading(false);
 }
 useEffect(()=>{load()},[]);
 function addLine(){setLines(x=>[...x,{ingredient_id:'',quantity:'',unit:'g',waste_percent:'0'}]);}
 function updateLine(idx:number,key:keyof Line,value:string){setLines(x=>x.map((l,i)=>i===idx?{...l,[key]:value}:l));}
 async function saveIngredient(){
  if(!name.trim()){setMsg('Ingredient name is required');return}
  setSaving(true); setMsg(null);
  const {error:e}=await supabase.from('ingredients').insert({name:name.trim(),base_unit:baseUnit,cost_per_base_unit:Number(cost)||0});
  if(e)setMsg(e.message); else {setIngredientOpen(false);setName('');setCost('0');load();}
  setSaving(false);
 }
 async function saveRecipe(){
  if(!foodId||!lines.length||lines.some(l=>!l.ingredient_id||Number(l.quantity)<=0)){setMsg('Select food and add valid ingredients');return}
  setSaving(true);setMsg(null);
  const existing=recipes.find(r=>r.food_id===foodId);
  const payload={food_id:foodId,yield_quantity:Number(yieldQty)||1,yield_unit:yieldUnit,version:(existing?.version||0)+1,active:true};
  const {data:r,error:e}=existing
   ? await supabase.from('recipes').update(payload).eq('id',existing.id).select().single()
   : await supabase.from('recipes').insert(payload).select().single();
  if(e||!r){setMsg(e?.message||'Failed to save recipe');setSaving(false);return}
  await supabase.from('recipe_ingredients').delete().eq('recipe_id',r.id);
  const {error:le}=await supabase.from('recipe_ingredients').insert(lines.map(l=>({recipe_id:r.id,ingredient_id:l.ingredient_id,quantity:Number(l.quantity),unit:l.unit,waste_percent:Number(l.waste_percent)||0})));
  if(le)setMsg(le.message);else{setRecipeOpen(false);setLines([{ingredient_id:'',quantity:'',unit:'g',waste_percent:'0'}]);load();}
  setSaving(false);
 }
 if(loading)return <Loading label="Loading recipe & ingredient management..." />;
 if(error)return <ErrorState message={error}/>;
 return <div className="space-y-6 animate-fade-in">
  <div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-800">Recipes & Ingredients</h1><p className="text-sm text-slate-400 mt-1">BOM-based kitchen consumption, unit control and food costing</p></div>
   <div className="flex gap-2"><button onClick={()=>setIngredientOpen(true)} className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium"><PackagePlus size={16} className="inline mr-2"/>Ingredient</button><button onClick={()=>{setMsg(null);setRecipeOpen(true)}} className="px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium"><Plus size={16} className="inline mr-2"/>Recipe</button></div></div>
  <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1 w-fit"><button onClick={()=>setTab('recipes')} className={`px-4 py-2 rounded-lg text-sm ${tab==='recipes'?'bg-primary-50 text-primary-700':'text-slate-500'}`}>Recipes / BOM</button><button onClick={()=>setTab('ingredients')} className={`px-4 py-2 rounded-lg text-sm ${tab==='ingredients'?'bg-primary-50 text-primary-700':'text-slate-500'}`}>Ingredient Master</button></div>
  {tab==='recipes'?<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{recipes.length?recipes.map(r=><RecipeCard key={r.id} recipe={r} ingredients={ingredients}/>):<EmptyState icon={ChefHat} title="No recipes configured" message="Create a recipe to enable automatic ingredient deduction on orders."/>}</div>
  :<div className="bg-white rounded-2xl border border-slate-100 overflow-hidden"><table className="w-full"><thead className="bg-slate-50"><tr><th className="text-left p-4 text-xs">Ingredient</th><th className="text-left p-4 text-xs">Base unit</th><th className="text-right p-4 text-xs">Cost/base unit</th><th className="text-right p-4 text-xs">Reorder</th></tr></thead><tbody>{ingredients.map(i=><tr key={i.id} className="border-t border-slate-50"><td className="p-4 text-sm font-medium">{i.name}</td><td className="p-4 text-sm">{i.base_unit}</td><td className="p-4 text-sm text-right">₹{Number(i.cost_per_base_unit).toFixed(4)}</td><td className="p-4 text-sm text-right">{i.reorder_level}</td></tr>)}</tbody></table></div>}
  <Modal open={ingredientOpen} onClose={()=>setIngredientOpen(false)} title="Add Ingredient"><div className="space-y-4"><input className="w-full p-3 border rounded-xl" placeholder="Ingredient name" value={name} onChange={e=>setName(e.target.value)}/><div className="grid grid-cols-2 gap-3"><select className="p-3 border rounded-xl" value={baseUnit} onChange={e=>setBaseUnit(e.target.value)}>{units.map(u=><option key={u}>{u}</option>)}</select><input className="p-3 border rounded-xl" type="number" step="0.0001" placeholder="Cost / base unit" value={cost} onChange={e=>setCost(e.target.value)}/></div>{msg&&<p className="text-sm text-red-600">{msg}</p>}<button disabled={saving} onClick={saveIngredient} className="w-full py-3 rounded-xl bg-primary-600 text-white">{saving?'Saving...':'Save Ingredient'}</button></div></Modal>
  <Modal open={recipeOpen} onClose={()=>setRecipeOpen(false)} title="Create / Update Recipe"><div className="space-y-4 max-h-[70vh] overflow-y-auto"><select className="w-full p-3 border rounded-xl" value={foodId} onChange={e=>setFoodId(e.target.value)}><option value="">Select menu item</option>{foods.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select><div className="grid grid-cols-2 gap-3"><input className="p-3 border rounded-xl" type="number" step="0.001" value={yieldQty} onChange={e=>setYieldQty(e.target.value)} placeholder="Yield"/><select className="p-3 border rounded-xl" value={yieldUnit} onChange={e=>setYieldUnit(e.target.value)}><option>portion</option><option>pcs</option><option>kg</option><option>l</option></select></div>{lines.map((l,i)=><div key={i} className="grid grid-cols-12 gap-2"><select className="col-span-5 p-2 border rounded-lg" value={l.ingredient_id} onChange={e=>updateLine(i,'ingredient_id',e.target.value)}><option value="">Ingredient</option>{ingredients.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><input className="col-span-2 p-2 border rounded-lg" type="number" step="0.001" placeholder="Qty" value={l.quantity} onChange={e=>updateLine(i,'quantity',e.target.value)}/><select className="col-span-2 p-2 border rounded-lg" value={l.unit} onChange={e=>updateLine(i,'unit',e.target.value)}>{units.map(u=><option key={u}>{u}</option>)}</select><input className="col-span-2 p-2 border rounded-lg" type="number" placeholder="Waste %" value={l.waste_percent} onChange={e=>updateLine(i,'waste_percent',e.target.value)}/><button className="col-span-1 text-red-500" onClick={()=>setLines(x=>x.filter((_,n)=>n!==i))}><Trash2 size={16}/></button></div>)}<button onClick={addLine} className="w-full py-2 border rounded-xl text-sm"><Plus size={15} className="inline mr-1"/>Add ingredient</button>{msg&&<p className="text-sm text-red-600">{msg}</p>}<button disabled={saving} onClick={saveRecipe} className="w-full py-3 rounded-xl bg-primary-600 text-white">{saving?'Saving...':'Save Recipe'}</button></div></Modal>
 </div>
}
function RecipeCard({recipe,ingredients}:{recipe:Recipe;ingredients:Ingredient[]}){
 const [lines,setLines]=useState<any[]>([]);
 useEffect(()=>{supabase.from('recipe_ingredients').select('*,ingredient:ingredients(name,base_unit,cost_per_base_unit)').eq('recipe_id',recipe.id).then(({data})=>setLines(data||[]))},[recipe.id]);
 const cost=lines.reduce((s,l)=>s+(Number(l.quantity)/Number(recipe.yield_quantity||1))*Number(l.ingredient?.cost_per_base_unit||0),0);
 return <div className="bg-white rounded-2xl border border-slate-100 p-5"><div className="flex justify-between"><div><h3 className="font-semibold text-slate-800">{recipe.food?.name}</h3><p className="text-xs text-slate-400 mt-1">Version {recipe.version} · Yield {recipe.yield_quantity} {recipe.yield_unit}</p></div><Scale size={20} className="text-primary-500"/></div><div className="mt-4 space-y-2">{lines.map(l=><div key={l.id} className="flex justify-between text-sm"><span>{l.ingredient?.name}</span><span>{l.quantity} {l.unit}</span></div>)}</div><div className="mt-4 pt-3 border-t text-sm font-semibold">Estimated ingredient cost: ₹{cost.toFixed(2)}</div></div>
}
