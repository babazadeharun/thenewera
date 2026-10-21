// In-process pg driver bridge for tests only; no TCP or production configuration.
const fs=require('node:fs'),path=require('node:path');
module.exports = async function(pg, root) {
  const runtime=path.join(root,'.crm-test-runtime'), output=path.join(runtime,'prospecting-client');
  const schema=fs.readFileSync(path.join(root,'prisma/schema.prisma'),'utf8').replace('provider = "prisma-client-js"', 'provider = "prisma-client-js"\n  previewFeatures = ["driverAdapters"]\n  output = "'+output.replaceAll('\\','/')+'"');
  const schemaPath=path.join(runtime,'prospecting-test.prisma');fs.writeFileSync(schemaPath,schema);
  require('node:child_process').execFileSync(process.execPath,[require.resolve('prisma/build/index.js'),'generate','--schema',schemaPath],{stdio:'pipe'});
  const {Pool,types}=require(path.join(runtime,'node_modules/pg'));
  const {PrismaPg}=require(path.join(runtime,'node_modules/@prisma/adapter-pg'));
  let tail=Promise.resolve();
  const lock=async()=>{let release;const old=tail;tail=new Promise(r=>release=r);await old;return release;};
  const query=async(config, values)=>{
    const text=typeof config==='string'?config:config.text;
    const parsers={};
    for(const oid of Object.values(types.builtins))if(typeof oid==='number')parsers[oid]=config.types?.getTypeParser(oid,'text')||types.getTypeParser(oid,'text');
    const result=await pg.query(text,values||config.values||[],{rowMode:'array',parsers});
    return {rows:result.rows,fields:result.fields.map(f=>({name:f.name,dataTypeID:f.dataTypeID})),rowCount:result.affectedRows||result.rows.length};
  };
  const pool=new Pool();
  pool.query=async(...args)=>{const release=await lock();try{return await query(...args);}finally{release();}};
  pool.connect=async()=>{const release=await lock();return {query,release};};
  const {PrismaClient}=require(output);
  return new PrismaClient({adapter:new PrismaPg(pool)});
};
