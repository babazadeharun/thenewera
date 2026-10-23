import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Home from './Home';
import Landing from './Landing';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{start?:string;intro?:string}>}) {
 const q=await searchParams;
 const user=await getCurrentUser();
 if(q.intro==='1')return <Landing/>;
 if(!user){if(q.start==='1')redirect('/login?next=%2Fworkspace');return <Landing/>;}
 return <Home/>;
}
