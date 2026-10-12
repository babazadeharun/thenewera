import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAccountHomePath } from '@/lib/account-routing';

export default async function CreatorWorkspacePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'CREATOR') redirect(getAccountHomePath(user.role));
  return <main className="innerPage"><div className="container innerHero"><a className="back" href="/">← New Era</a><div className="eyebrow">CREATOR WORKSPACE</div><h1>Creator <span>paneli.</span></h1><p>{user.email} hesabı ilə daxil olmusunuz. Creator üçün ayrıca layihə idarəetmə funksiyaları bu versiyada mövcud deyil; mövcud admin/portfolio idarəetmə səhifəsi creator hesabına açılmır.</p><div className="heroCtas"><a className="primary" href="/portfolio">Portfolioya bax</a><a className="secondary" href="/">Əsas səhifə</a></div></div></main>;
}
