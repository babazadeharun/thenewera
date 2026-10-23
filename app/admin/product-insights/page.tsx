import Link from 'next/link';
import {redirect} from 'next/navigation';
import {prisma} from '@/lib/prisma';
import {getCurrentUser} from '@/lib/auth';
import '../../product-experience.css';
export const dynamic='force-dynamic';
export default async function Page(){
 const user=await getCurrentUser();if(!user)redirect('/login');if(user.role!=='SUPER_ADMIN')redirect('/account');
 const since=new Date(Date.now()-30*86400000);
 const [leads,companies,customers,sales,nextSteps,usage]=await Promise.all([
  prisma.salesDeal.groupBy({by:['stage'],where:{source:'WEBSITE_QUICK_REQUEST',createdAt:{gte:since}},_count:{_all:true}}),
  prisma.crmCompany.findMany({where:{createdAt:{gte:since}},select:{id:true,name:true,createdAt:true}}),
  prisma.crmEntry.groupBy({by:['companyId'],where:{kind:'customers',deletedAt:null},_count:{_all:true}}),
  prisma.crmEntry.groupBy({by:['companyId'],where:{kind:'sales',deletedAt:null},_count:{_all:true}}),
  prisma.crmEntry.groupBy({by:['companyId'],where:{kind:'sales',deletedAt:null,AND:[{data:{path:['nextStep'],gt:''}},{data:{path:['nextContactAt'],gt:''}}]},_count:{_all:true}}),
  prisma.crmEvent.findMany({where:{type:'PRODUCT_USAGE',createdAt:{gte:since}},select:{companyId:true,userId:true,data:true}})
 ]);
 const opened=new Set(usage.map(u=>u.companyId));const returners=new Map<string,Set<string>>();for(const row of usage){if(!row.userId)continue;const key=row.companyId+'|'+row.userId;const days=returners.get(key)||new Set<string>();days.add(String((row.data as Record<string,unknown>)?.day));returners.set(key,days);}
 return <main className="productPage"><div className="productWrap"><Link href="/admin">← İdarəetmə</Link><header className="productIntro"><span className="productKicker">SUPER ADMIN · SON 30 GÜN</span><h1>İstifadəçi ilk faydanı <em>görürmü?</em></h1><p>Həqiqi müraciətlər və saxlanmış CRM qeydləri. Demo məlumatları bu hesablamalara daxil deyil.</p></header><div className="productGrid">{[['Qısa veb müraciətləri',leads.reduce((s,l)=>s+l._count._all,0)],['Yeni Workspace',companies.length],['Gündəlik ekranı açmış şirkətlər',opened.size],['Ən azı 2 fərqli gündə qayıdan istifadəçi',Array.from(returners.values()).filter(d=>d.size>=2).length]].map(([label,count])=><article className="productPanel" key={label}><h3>{label}</h3><strong style={{fontSize:36}}>{count}</strong></article>)}</div><section className="productSection"><h2>Yeni şirkətlər ilk addımları tamamlayıbmı?</h2><p>Müştəri və satış sayları cari, silinməmiş qeydlərə əsaslanır. Bu göstəricilər artım zəmanəti deyil.</p>{companies.length?companies.map(c=><article className="productPanel" key={c.id}><h3>{c.name}</h3><p>İlk müştəri: {customers.some(x=>x.companyId===c.id)?'✓':'Gözləyir'} · Satış: {sales.some(x=>x.companyId===c.id)?'✓':'Gözləyir'} · Əlaqə planı: {nextSteps.some(x=>x.companyId===c.id)?'✓':'Gözləyir'}</p><Link href="/admin/company-workspaces">Workspace idarəetməsində aç →</Link></article>):<p>Son 30 gündə yeni şirkət yoxdur.</p>}</section><section className="productPanel"><h2>Müraciətlər hansı mərhələdədir?</h2>{leads.map(l=><p key={l.stage}>{l.stage}: {l._count._all}</p>)}<Link href="/admin?section=sales">Satış CRM-ə keç →</Link><p>Sayt ziyarəti və demo istifadəsi ölçülmədiyinə görə ziyarətçidən müraciətə çevrilmə faizi hesablanmır. Gündəlik istifadə ölçümü bu yenilənmədən sonra başlayır; dəstək baxışları sayılmır.</p></section></div></main>;
}
