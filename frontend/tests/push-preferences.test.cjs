const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function moduleAt(file,extra={}) {const c={exports:{},...extra};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,c);return c.exports;}
const policy=moduleAt('lib/push-preferences.ts');
const ready={standalone:true,configured:true,supported:true,permission:'default',enabled:false,dismissed:false,path:'/hesabim'};
test('installed app offers notifications once on safe screens',()=>{
 assert.equal(policy.shouldOfferPush(ready),true);
 assert.equal(policy.shouldOfferPush({...ready,path:'/hesabim/bildirimler'}),true);
 for(const change of [{standalone:false},{configured:false},{supported:false},{permission:'denied'},{enabled:true},{dismissed:true},...['/odeme','/odeme/basarili','/sepet','/yonetim','/giris-yap','/kayit-ol'].map(path=>({path}))]) assert.equal(policy.shouldOfferPush({...ready,...change}),false,JSON.stringify(change));
});
function pushHarness(initial,fetch){
 const store=new Map(Object.entries(initial));let events=0;
 const push=moduleAt('lib/push.ts',{require:n=>n==='./api'?{api:{}}:policy,process:{env:{}},localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},window:{dispatchEvent:()=>events++},Event:class {},fetch});
 return {push,store,events:()=>events};
}
test('marketing opt-in persists without enabling notifications or prompting permission',async()=>{
 const h=pushHarness({},()=>{throw Error('unexpected network')});await h.push.setPushMarketing(true,null);
 assert.equal(h.store.get('iv-push-marketing'),'1');assert.equal(h.store.has('iv-push-enabled'),false);assert.equal(h.events(),1);
});
test('failed active-device preference update restores previous consent',async()=>{
 const h=pushHarness({'iv-push-enabled':'1','iv-push-marketing':'1'});
 await assert.rejects(()=>h.push.setPushMarketing(false,null));assert.equal(h.store.get('iv-push-marketing'),'1');
});
test('unsubscribe remains available while provider configuration is disabled',async()=>{
 let calls=0;const h=pushHarness({'iv-push-enabled':'1','iv-push-device':'device'},async()=>{calls++;return {ok:true}});
 await h.push.disablePush(null);assert.equal(calls,1);assert.equal(h.store.has('iv-push-enabled'),false);
});
test('failed unsubscribe does not falsely display disabled state',async()=>{
 const h=pushHarness({'iv-push-enabled':'1','iv-push-device':'device'},async()=>({ok:false}));
 await assert.rejects(()=>h.push.disablePush(null));assert.equal(h.store.get('iv-push-enabled'),'1');
});
