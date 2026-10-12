import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAccountHomePath } from '@/lib/account-routing';
export default async function LegacyAdminRoute(){
 const user=await getCurrentUser();
 if(!user) redirect('/login');
 if(!['ADMIN','SUPER_ADMIN'].includes(user.role)) redirect(getAccountHomePath(user.role));
 redirect('/admin');
}
