import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import MailClient from './MailClient';
export default async function MailPage(){const user=await getCurrentUser();if(!user)redirect('/login');if(!['ADMIN','SUPER_ADMIN'].includes(user.role))redirect('/account');return <MailClient/>;}
