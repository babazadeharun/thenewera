import { NextRequest, NextResponse } from 'next/server';
import { getClientCommunications, getClientsWithEmail } from '@/lib/mail/db';
import { requireMailAdmin } from '@/lib/mail/auth';
export async function GET(req:NextRequest){const {response}=await requireMailAdmin();if(response)return response!;try{const id=req.nextUrl.searchParams.get('id');if(id)return NextResponse.json({client:{id,communications:await getClientCommunications(id)}});return NextResponse.json({clients:await getClientsWithEmail()});}catch{return NextResponse.json({error:'Müştəri məlumatları yüklənmədi.'},{status:500});}}
