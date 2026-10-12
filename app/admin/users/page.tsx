import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAccountHomePath } from '@/lib/account-routing';
import UsersClient from './UsersClient';
export default async function UsersPage(){
 const user=await getCurrentUser();
 if(!user) redirect('/login');
 if(!['ADMIN','SUPER_ADMIN'].includes(user.role)) redirect(getAccountHomePath(user.role));
 return <UsersClient/>;
}
