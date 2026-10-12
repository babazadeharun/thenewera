import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAccountHomePath } from '@/lib/account-routing';
import ProjectsClient from './ProjectsClient';
export default async function ProjectsPage(){
 const user=await getCurrentUser();
 if(!user) redirect('/login');
 if(user.role!=='CLIENT') redirect(getAccountHomePath(user.role));
 return <ProjectsClient/>;
}
