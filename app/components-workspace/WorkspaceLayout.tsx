import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAccountHomePath } from '@/lib/account-routing';
import WorkspaceShell from './WorkspaceShell';
import './workspace-glass.css';
export default async function WorkspaceLayout({children,allowed}:{children:React.ReactNode;allowed:string[]}){
 const user=await getCurrentUser();if(!user)redirect('/login');if(!allowed.includes(user.role))redirect(getAccountHomePath(user.role));
 return <Suspense fallback={<div className="workspaceLoading">İş məkanı yüklənir…</div>}><WorkspaceShell role={user.role} email={user.email||''}>{children}</WorkspaceShell></Suspense>;
}
