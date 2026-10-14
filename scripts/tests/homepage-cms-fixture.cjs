// Local browser fixture only: intercept Prisma reads and reject every write.
if(process.env.NEWERA_CMS_FIXTURE!=='1')throw new Error('Explicit local CMS fixture opt-in required');
const {PrismaClient}=require('@prisma/client');
const asset='http://127.0.0.1:3199';
const methods=new Set(['findUnique','findFirst','findMany','count','aggregate','groupBy']);
global.prisma=new PrismaClient().$extends({query:{$allModels:{$allOperations({model,operation}){
 if(!methods.has(operation))throw new Error('Database writes forbidden in homepage fixture');
 if(model==='SiteSetting'&&operation==='findUnique')return {id:'main',siteName:'New Era',logoMedia:{url:asset+'/dark-logo.svg'},heroImage:asset+'/bright-desktop.svg'};
 if(model==='Hero'&&operation==='findMany')return [{id:'fixture',title:'Növbəti Era Buradan Başlayır.',active:true,description:null,ctaText:'Layihəyə başla',ctaUrl:'/start-project',desktopMedia:{url:asset+'/bright-desktop.svg'},mobileMedia:{url:asset+'/bright-mobile.svg'},videoMedia:null}];
 return operation==='findMany'?[]:operation==='count'?0:null;
}}}});
