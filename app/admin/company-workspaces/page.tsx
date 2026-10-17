import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Admin from './Admin';
import '../../workspace/workspace.css';
export const dynamic='force-dynamic';
export default async function Page(){const u=await getCurrentUser();if(!u)redirect('/login');if(u.role!=='SUPER_ADMIN')redirect('/admin');return <Admin/>;}
