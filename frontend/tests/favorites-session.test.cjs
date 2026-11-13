const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function harness(api) {
 let user={id:1},slots=[],cursor=0,effects=[],output;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const react={
  createContext:()=>({Provider:'provider'}),
  createElement:(_type,props)=>props.value,
  useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value}];},
  useRef(initial){const i=cursor++;return slots[i]??(slots[i]={current:initial});},
  useCallback(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={deps,fn};return slots[i].fn;},
  useEffect(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps)){slots[i]?.cleanup?.();slots[i]={deps};effects.push(()=>{slots[i].cleanup=fn()});}},
 };
 react.default=react;
 const ctx={exports:{},require:name=>name==='react'?react:name==='./auth'?{useAuth:()=>({user})}:name==='./api'?{api}:null};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/favorites.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,ctx);
 function render(){cursor=0;output=ctx.exports.FavoritesProvider({children:null});const pending=effects;effects=[];pending.forEach(f=>f());return output;}
 return {render,setUser:u=>{user=u;render();},flush:async()=>{await new Promise(setImmediate);return render();}};
}
test('favorites load every API page and remove an item beyond the first page',async()=>{
 const calls=[];
 const h=harness({getList:async path=>{calls.push(path);return {data:[{product_id:path.includes('page=1&')?1:501}],pagination:{total_pages:2}}},delete:async path=>calls.push(path)});
 h.render();const state=await h.flush();
 assert.equal(state.ids.size,2);assert(state.isFavorite(501));
 await state.toggle(501);assert(calls.includes('/favorites/501'));
 assert(!h.render().isFavorite(501));
});
test('late favorite response cannot repopulate a signed-out session',async()=>{
 let resolve;
 const h=harness({getList:()=>new Promise(r=>resolve=r)});
 h.render();h.setUser(null);
 resolve({data:[{product_id:42}],pagination:{total_pages:1}});
 const state=await h.flush();assert.equal(state.ids.size,0);
});
test('concurrent duplicate toggles send one mutation',async()=>{
 let resolve;let writes=0;
 const h=harness({getList:async()=>({data:[],pagination:{total_pages:0}}),post:()=>{writes++;return new Promise(r=>resolve=r)}});
 h.render();const state=await h.flush();const first=state.toggle(42);await state.toggle(42);
 assert.equal(writes,1);resolve();await first;
});
