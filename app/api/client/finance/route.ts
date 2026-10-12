import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getWorkspaceContext, hasPermission, PERMISSIONS } from '@/lib/workspace';
import { prisma } from '@/lib/prisma';
export async function GET(){
 const user=await getCurrentUser(); if(!user)return NextResponse.json({error:'Authentication required'},{status:401});
 const context=await getWorkspaceContext(user.id); if(!hasPermission(context,PERMISSIONS.VIEW_FINANCE) || !user.clientId)return NextResponse.json({error:'Forbidden'},{status:403});
 const [invoices,payments]=await Promise.all([
   prisma.invoice.findMany({where:{clientId:user.clientId},orderBy:{issueDate:'desc'},select:{id:true,number:true,issueDate:true,dueDate:true,subtotal:true,tax:true,discount:true,total:true,paidAmount:true,currency:true,status:true,notes:true,projectId:true,items:{select:{serviceName:true,description:true,quantity:true,unitPrice:true,total:true}}}}),
   prisma.financePayment.findMany({where:{clientId:user.clientId},orderBy:{date:'desc'},take:100,select:{id:true,invoiceId:true,amount:true,date:true,method:true,reference:true,notes:true}}),
 ]);
 return NextResponse.json({invoices,payments});
}
