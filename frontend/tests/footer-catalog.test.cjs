const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),ts=require('typescript');
function load(path){const ctx={exports:{},structuredClone};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,ctx);return ctx.exports;}
const helpers=load('lib/footer-catalog.ts');
test('footer category links retain parent paths and exclude inactive branches',()=>{
  const result=helpers.footerCategories([{id:1,name:'Bakım',slug:'bakim',is_active:true,children:[{id:2,name:'Güneş',slug:'gunes'}]},{id:3,name:'Saç',slug:'sac',children:[]},{id:4,slug:'hidden',is_active:false,children:[{id:5,slug:'child'}]}]);
  assert.equal(result.map(x=>x.href).join(','),'/bakim,/sac,/bakim/gunes');
});
test('footer curation preserves admin order, hides unavailable choices and bounds link counts',()=>{
  const items=[{id:1,href:'/one'},{id:2,href:'/two'}];
  assert.equal(helpers.footerSelection(items,'2,999,1,2',20).map(x=>x.id).join(','),'2,1');
  assert.equal(helpers.footerSelection(items,'999',20).length,0);
  assert.equal(helpers.footerSelection(items,'',0).length,0);
  assert.equal(helpers.footerSelection(items,'',-4).length,0);
  assert.equal(helpers.footerSelection(items,'',Infinity).length,0);
  assert.equal(helpers.footerSelection(items,'',99,1).length,1);
});
test('legacy content gains footer controls without replacing existing admin links',()=>{
  const {parseHomeContent}=load('lib/home-content.ts');
  const c=parseHomeContent(JSON.stringify({footer:{columns:[{title:'Özel',links:[{label:'Hesabım',href:'/hesabim'}]}],newsletterEnabled:false}})).footer;
  assert.equal(c.columns[0].title,'Özel');assert.equal(c.newsletterEnabled,false);
  assert.equal(c.catalogEnabled,true);assert.equal(c.blogSlugs,'');assert.equal(c.brandLimit,12);
});
