import { notFound,redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAccountHomePath } from '@/lib/account-routing';
import { prisma } from '@/lib/prisma';
import PromoterEventWorkspace from './PromoterEventWorkspace';
export default async function Page({params}:{params:Promise<{eventId:string}>}){const user=await getCurrentUser();if(!user)redirect('/login');if(user.role!=='PROMOTER')redirect(getAccountHomePath(user.role));const p=await prisma.promoter.findUnique({where:{userId:user.id},select:{id:true,status:true}});if(!p||p.status!=='ACTIVE')redirect('/login');const {eventId}=await params;const relation=await prisma.promoterEvent.findUnique({where:{promoterId_eventId:{promoterId:p.id,eventId}},select:{eventId:true}});if(!relation)notFound();return <PromoterEventWorkspace eventId={eventId}/>}
