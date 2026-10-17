import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Home from './Home';
export const dynamic='force-dynamic';
export default async function Page(){if(!await getCurrentUser())redirect('/login?next=%2Fworkspace');return <Home/>;}
