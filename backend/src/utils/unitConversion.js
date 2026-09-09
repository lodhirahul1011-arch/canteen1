const GROUPS={mass:{g:1,kg:1000},volume:{ml:1,l:1000},count:{pcs:1}};
export function convertUnit(quantity,from,to){
  if(from===to) return Number(quantity);
  for(const group of Object.values(GROUPS)){
    if(group[from] && group[to]) return Number(quantity)*group[from]/group[to];
  }
  throw new Error(`Cannot convert ${from} to ${to}`);
}
export function normalizeToBase(quantity,unit,baseUnit){ return convertUnit(quantity,unit,baseUnit); }
