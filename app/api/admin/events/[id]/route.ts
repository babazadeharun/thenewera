import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireEventsAdmin } from '@/lib/events/authorization';
import { calculatePromoterPrice } from '@/lib/events/pricing';
function fail(e: unknown){const m=e instanceof Error?e.message:'Request failed';return NextResponse.json({error:m},{status:m==='UNAUTHORIZED'?401:m==='FORBIDDEN'?403:400})}
function slug(v:string){return v.trim().toLowerCase().replace(/[^a-z0-9\u00C0-\u024F]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,120)}
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){try{await requireEventsAdmin();const {id}=await params;const event=await prisma.event.findUnique({where:{id},include:{organizer:true,coverMedia:true,gallery:{include:{media:true},orderBy:{sortOrder:'asc'}}}});if(!event)return NextResponse.json({error:'NOT_FOUND'},{status:404});return NextResponse.json({event,promoterPrice:calculatePromoterPrice(event.publicTicketPrice,event.promoterDiscountPercent).toString()})}catch(e){return fail(e)}}
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){try{await requireEventsAdmin();const {id}=await params;const b=await req.json();const current=await prisma.event.findUnique({where:{id}});if(!current)return NextResponse.json({error:'NOT_FOUND'},{status:404});const publicPrice=b.publicTicketPrice!==undefined?new Prisma.Decimal(String(b.publicTicketPrice)):current.publicTicketPrice;const discount=b.promoterDiscountPercent!==undefined?new Prisma.Decimal(String(b.promoterDiscountPercent)):current.promoterDiscountPercent;if(publicPrice.lessThan(0)||discount.lessThan(0)||discount.greaterThan(100))throw new Error('INVALID_PRICING');const data:any={};for(const k of ['name','artist','venue','city','description','status','internalNotes','organizerId','coverMediaId'])if(b[k]!==undefined)data[k]=String(b[k]||'').trim()||null;if(b.name!==undefined)data.name=String(b.name).trim();if(b.slug!==undefined)data.slug=slug(String(b.slug));if(b.startsAt!==undefined)data.startsAt=new Date(String(b.startsAt));if(b.isPublic!==undefined)data.isPublic=Boolean(b.isPublic);
  if(b.totalInventory!==undefined){
    const nextInventory=Math.max(0,Number(b.totalInventory));
    if(!Number.isInteger(nextInventory)) throw new Error('INVALID_INVENTORY');
    const ticketCount=await prisma.ticket.count({where:{eventId:id}});
    if(nextInventory<ticketCount) throw new Error('INVENTORY_BELOW_ISSUED_TICKETS');
    data.totalInventory=nextInventory;
  }
  data.publicTicketPrice=publicPrice;data.promoterDiscountPercent=discount;const event=await prisma.$transaction(async tx=>{const updated=await tx.event.update({where:{id},data});if(Array.isArray(b.galleryMediaIds)){await tx.eventGalleryMedia.deleteMany({where:{eventId:id}});if(b.galleryMediaIds.length)await tx.eventGalleryMedia.createMany({data:b.galleryMediaIds.filter(Boolean).map((mediaId:string,i:number)=>({eventId:id,mediaId,sortOrder:i})),skipDuplicates:true});}return tx.event.findUnique({where:{id},include:{organizer:true,coverMedia:true,gallery:{include:{media:true},orderBy:{sortOrder:'asc'}}}})});return NextResponse.json({event,promoterPrice:calculatePromoterPrice(publicPrice,discount).toString()})}catch(e){return fail(e)}}
