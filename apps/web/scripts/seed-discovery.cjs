const fs=require('fs'),vm=require('vm'),ts=require('typescript');const {DatabaseSync}=require('node:sqlite');const path=require('path');
const file=process.argv[2];if(!file)throw new Error('Pass database path');const db=new DatabaseSync(path.resolve(file));db.exec('PRAGMA foreign_keys=ON');
const values={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/profile-data.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:values});
const slug=v=>v.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const aliases={'Food & Cooking':['food','food bloggers','food influencers'],'Beauty & Makeup':['beauty','beauty bloggers'],'Tech & Gadgets':['tech','technology'],'Health & Wellness':['health'],'Personal Finance':['finance']};
const insert=db.prepare('INSERT OR IGNORE INTO DiscoveryTaxon(id,kind,slug,label,value,parentId,aliases) VALUES (?,?,?,?,?,?,?)');
for(const name of values.NICHE_OPTIONS)insert.run('niche:'+slug(name),'niche',slug(name),name,name,null,JSON.stringify(aliases[name]||[]));
for(const name of new Set(values.CITY_OPTIONS))insert.run('city:'+slug(name),'city',slug(name),name,name,null,'[]');
for(const item of values.LANGUAGE_OPTIONS)insert.run('language:'+item.code.toLowerCase(),'language',item.code.toLowerCase(),item.label,item.code,null,JSON.stringify([item.label.toLowerCase()+' speaking']));
for(const [name,parent] of [['Restaurant reviews','Food & Cooking'],['Skincare','Beauty & Makeup'],[' modest fashion','Fashion']]){const n=name.trim();insert.run('niche:'+slug(n),'niche',slug(n),n,n,'niche:'+slug(parent),'[]');}
for(const [name,id,terms] of [['Reels','reel',['reels','short form']],['Sponsored posts','post',['sponsored post']],['Stories','story',['stories']],['YouTube videos','youtube_long',['youtube video']],['YouTube Shorts','youtube_short',['youtube shorts']]])insert.run('format:'+id,'format',id,name,id,null,JSON.stringify(terms));
const page=db.prepare('INSERT OR IGNORE INTO DiscoveryPage(path,title,description,intro,filters,published,indexable,updatedAt) VALUES (?,?,?,?,?,1,0,?)');
for(const t of db.prepare("SELECT * FROM DiscoveryTaxon WHERE kind IN ('niche','city') AND value!='Other'").all()){
 let route=t.slug;let cursor=t;const seen=new Set([t.id]);
 while(t.kind==='niche'&&cursor.parentId){const parent=db.prepare('SELECT * FROM DiscoveryTaxon WHERE id=?').get(cursor.parentId);if(!parent||seen.has(parent.id))break;seen.add(parent.id);route=parent.slug+'/'+route;cursor=parent;}
 if(route.split('/').length>3)continue;
 if(db.prepare('SELECT path FROM DiscoveryPage WHERE filters=?').get(JSON.stringify({[t.kind]:t.value})))continue;
 const p=t.kind==='niche'?route:'cities/'+t.slug;const phrase=t.kind==='niche'?t.label+' creators in Pakistan':'Creators based in '+t.label;
 page.run(p,phrase,'Explore '+phrase.toLowerCase()+', their work, platforms, and starting rates.','Browse the available profiles below. Compare work samples and rates for the deliverable you need, then share a clear campaign brief.',JSON.stringify({[t.kind]:t.value}),new Date().toISOString());
}
for(const platform of ['instagram','youtube','tiktok','facebook'])page.run('platforms/'+platform,platform.charAt(0).toUpperCase()+platform.slice(1)+' creators in Pakistan','Discover Pakistani '+platform+' creators and compare their public profiles.','Explore work and audience measurements for this platform. Counts represent each account and are not a deduplicated cross-platform audience.',JSON.stringify({platform}),new Date().toISOString());
db.close();console.log('Discovery taxonomy and draft-indexing landing pages seeded.');
