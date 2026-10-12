import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAccountHomePath } from '@/lib/account-routing';
import AccountClient from './AccountClient';
export default async function AccountPage(){
 const user=await getCurrentUser();
 if(!user) redirect('/login');
 if(user.role!=='CLIENT') redirect(getAccountHomePath(user.role));
 return <AccountClient/>;
}
