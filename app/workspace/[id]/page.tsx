import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Workspace from '../Workspace';
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{support?:string}>}){const {id}=await params,q=await searchParams;if(!await getCurrentUser())redirect('/login?next='+encodeURIComponent('/workspace/'+id));return <Workspace id={id} support={q.support||''}/>;}
