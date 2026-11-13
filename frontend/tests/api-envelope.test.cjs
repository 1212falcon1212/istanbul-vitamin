const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function setup(payload) {
 const context={exports:{},process:{env:{}},fetch:async()=>({ok:true,json:async()=>payload})};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/api.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
 return context.exports.api;
}
test('review statistics survive API normalization',async()=>{
 const payload={data:{reviews:[],stats:{average_rating:4.5,total_count:2}}};
 const res=await setup(payload).get('/products/1/reviews');
 assert.equal(res.data.stats.total_count,2);
 assert.deepEqual(res.data.reviews,[]);
});
test('paginated favorites still unwrap without losing pagination',async()=>{
 const res=await setup({data:{favorites:[{product_id:42}]},pagination:{page:2,total_pages:3}}).getList('/favorites');
 assert.equal(res.data[0].product_id,42);
 assert.equal(res.pagination.total_pages,3);
});
test('login redirect permits local paths and rejects script and external targets',()=>{
 const context={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/auth-redirect.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
 const safe=context.exports.safeAuthRedirect;
 for(const path of ['javascript:alert(1)','https://evil.test','//evil.test','/\\evil.test','/\nevil.test',null]) assert.equal(safe(path),'/hesabim');
 assert.equal(safe('/urun/test?tab=reviews'),'/urun/test?tab=reviews');
});
