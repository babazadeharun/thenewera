import { NextRequest, NextResponse } from 'next/server';
import { findClientByEmail, getDraftAttachments, deleteDraft, recordEmailCommunication } from '@/lib/mail/db';
import { sendMail } from '@/lib/mail/smtp';
import { getMessage, mailboxFromKey } from '@/lib/mail/imap';
import { friendlyMailError, rejectCsrf, requireMailAdmin } from '@/lib/mail/auth';
import { looksLikeEmail } from '@/lib/verification';

const sendWindow = new Map<string,number>();
const maxAttachmentBytes = () => Math.min(Math.max(Number(process.env.MAIL_MAX_ATTACHMENT_MB || 25),1),25) * 1024 * 1024;
const splitAddresses=(v:string)=>v.split(/[;,\n]+/).map(x=>x.trim()).filter(Boolean);
const validAddresses=(items:string[])=>items.length>0&&items.every(looksLikeEmail);
const safeName=(name:string)=>name.replace(/[\\/:*?"<>|\x00-\x1F]/g,'_').slice(0,180)||'attachment';

export async function POST(req:NextRequest){
  const {response,user}=await requireMailAdmin();if(response||!user)return response!;
  const csrf=rejectCsrf(req);if(csrf)return csrf;
  const now=Date.now(); const last=sendWindow.get(user.id)||0; if(now-last<5000)return NextResponse.json({error:'Email göndərmə limitinə çatdınız. Bir neçə saniyə sonra yenidən cəhd edin.'},{status:429}); sendWindow.set(user.id,now);
  try{
    const form=await req.formData();
    const to=splitAddresses(String(form.get('to')||'')); const cc=splitAddresses(String(form.get('cc')||'')); const bcc=splitAddresses(String(form.get('bcc')||''));
    const subject=String(form.get('subject')||'').trim(); const text=String(form.get('text')||''); const html=String(form.get('html')||''); const clientId=String(form.get('clientId')||'').trim()||null; const draftId=String(form.get('draftId')||'').trim()||null;
    if(!validAddresses(to))return NextResponse.json({error:'Kimə sahəsində düzgün e-poçt ünvanı daxil edin.'},{status:400});
    if(cc.length&&!validAddresses(cc))return NextResponse.json({error:'Surət sahəsində düzgün e-poçt ünvanı daxil edin.'},{status:400});
    if(bcc.length&&!validAddresses(bcc))return NextResponse.json({error:'Gizli surət sahəsində düzgün e-poçt ünvanı daxil edin.'},{status:400});
    if(!text.trim()&&!html.replace(/<[^>]+>/g,'').trim()&&!Array.from(form.keys()).some(k=>k==='attachment'))return NextResponse.json({error:'Məktub mətni və ya fayl əlavə edin.'},{status:400});
    if(clientId&&!(await findClientByEmail(to[0])))return NextResponse.json({error:'Müştəri emaili uyğun gəlmir.'},{status:400});
    const attachments:any[]=[]; let total=0;
    for(const value of form.getAll('attachment')){if(!(value instanceof File)||!value.size)continue; total+=value.size;if(total>maxAttachmentBytes())return NextResponse.json({error:`Faylların ümumi ölçüsü ${Math.round(maxAttachmentBytes()/1024/1024)} MB-dan çox ola bilməz.`},{status:400}); const buf=Buffer.from(await value.arrayBuffer()); attachments.push({filename:safeName(value.name),content:buf,contentType:value.type||'application/octet-stream'});}
    if(draftId && attachments.length===0){const draftAttachments=await getDraftAttachments(user.id,draftId);for(const a of draftAttachments){total+=a.sizeBytes;if(total>maxAttachmentBytes())break;attachments.push({filename:safeName(a.filename),content:Buffer.from(a.data),contentType:a.mimeType});}}
    const forwardUid=Number(form.get('forwardUid')||0); const forwardFolder=String(form.get('forwardFolder')||''); if(forwardUid>0&&forwardFolder){const original=await getMessage(mailboxFromKey(forwardFolder),forwardUid,false);for(const a of original.attachments){total+=a.size;if(total>maxAttachmentBytes())return NextResponse.json({error:`Faylların ümumi ölçüsü ${Math.round(maxAttachmentBytes()/1024/1024)} MB-dan çox ola bilməz.`},{status:400});attachments.push({filename:safeName(a.filename),content:a.content,contentType:a.mimeType});}}
    const result=await sendMail({to,cc,bcc,subject,text,html,attachments,inReplyTo:String(form.get('inReplyTo')||'').trim()||undefined,references:String(form.get('references')||'').trim()||undefined});
    if(draftId)await deleteDraft(user.id,draftId).catch(()=>undefined);
    if(clientId){await recordEmailCommunication({messageId:result.messageId||`local:${result.response||Date.now()}`,clientId,direction:'OUTBOUND',subject:subject||null,fromAddress:process.env.MAIL_FROM_ADDRESS||process.env.MAIL_SMTP_USER||'',toAddress:to.join(', '),sentAt:new Date()}).catch(()=>undefined);}
    return NextResponse.json({ok:true,messageId:result.messageId||null});
  }catch(e){console.error('mail send',e instanceof Error?e.message:'unknown');return NextResponse.json({error:friendlyMailError(e,'Email göndərilmədi. Mail server bağlantısını yoxlayın.')},{status:502});}
}
