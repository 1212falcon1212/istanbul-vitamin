const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
test('obsolete session requests cannot finish loading before the current request',async()=>{
 let slots=[],cursor=0,effect,listener;const requests=[];
 const react={createContext:()=>({Provider:'provider'}),createElement:(_,props)=>props.value,
 useState(v){const i=cursor++;if(!(i in slots))slots[i]=v;return [slots[i],v=>slots[i]=v]},
 useRef(v){const i=cursor++;return slots[i]??(slots[i]={current:v})},
 useCallback(fn){cursor++;return fn},useEffect(fn){effect=fn;},};react.default=react;
 const api={get:()=>new Promise(resolve=>requests.push(resolve))};
 const context={exports:{},localStorage:{getItem:()=>null,removeItem:()=>{}},window:{location:{pathname:"/"},addEventListener:(_,fn)=>listener=fn,removeEventListener:()=>{}},require:n=>n==='react'?react:n==='./api'?{api,APIError:class extends Error{}}:n==='./push'?{}:null};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/auth.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText,context);
 const render=()=>{cursor=0;return context.exports.AuthProvider({children:null})};
 assert.equal(render().isLoading,true);effect();listener({key:'auth_role'});
 requests[0]({data:{user:{id:1}}});await new Promise(setImmediate);
 assert.equal(render().isLoading,true);assert.equal(render().user,null);
 requests[1]({data:{user:{id:38}}});await new Promise(setImmediate);
 assert.equal(render().isLoading,false);assert.equal(render().user.id,38);
});
