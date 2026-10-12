import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAccountHomePath } from '@/lib/account-routing';
import MailClient from './MailClient';
export default async function MailPage(){const user=await getCurrentUser();if(!user)redirect('/login');if(!['ADMIN','SUPER_ADMIN'].includes(user.role))redirect(getAccountHomePath(user.role));return <MailClient/>;}
