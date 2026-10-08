import { fetchMessages, getMessage, getUnreadCount, mailboxFromKey, moveToTrash, setMessageFlag, type ImapMessage } from './imap';
import { sanitizeEmailHtml } from './sanitize';
import { findClientByEmail, getMailMetadata, moveMailMetadata, recordEmailCommunication, upsertMailMetadata } from './db';

const pageSize = () => Math.min(Math.max(Number(process.env.MAIL_SYNC_PAGE_SIZE || 20), 10), 50);
function serializeAddress(a:any){return {name:a?.name||null,address:a?.address||''};}
export function serializeOverview(m:any){return {uid:m.uid,folder:m.folder||null,flags:m.flags,unread:!m.flags?.includes('\\Seen'),starred:m.flags?.includes('\\Flagged'),messageId:m.messageId||null,from:(m.from||[]).map(serializeAddress),to:(m.to||[]).map(serializeAddress),cc:(m.cc||[]).map(serializeAddress),subject:m.subject,date:m.date,size:m.size||0,preview:m.preview||''};}
export function serializeMessage(m:ImapMessage){return {...m,html:m.html?sanitizeEmailHtml(m.html):'',attachments:m.attachments.map(a=>({filename:a.filename,mimeType:a.mimeType,size:a.size}))};}

export async function listMailbox(key:string,page=1,query?:string){
  if(key==='starred'){
    const [a,b]=await Promise.all([fetchMessages(mailboxFromKey('inbox'),1,100,query),fetchMessages(mailboxFromKey('sent'),1,100,query)]);
    const all=[...a.messages.map((m:any)=>({...m,folder:'inbox'})),...b.messages.map((m:any)=>({...m,folder:'sent'}))].filter((m:any)=>m.flags.includes('\\Flagged')).sort((x:any,y:any)=>new Date(y.date).getTime()-new Date(x.date).getTime());
    const start=(page-1)*pageSize();const messages=all.slice(start,start+pageSize());return {messages:messages.map(serializeOverview),total:all.length,page,pageSize:pageSize(),totalPages:Math.max(1,Math.ceil(all.length/pageSize())),unreadCount:all.filter((m:any)=>!m.flags.includes('\\Seen')).length};
  }
  const folder=mailboxFromKey(key);const result=await fetchMessages(folder,page,pageSize(),query);const metas=await getMailMetadata(folder).catch(()=>[]);const metaMap=new Map(metas.map((m:any)=>[Number(m.uid),m]));
  return {...result,messages:result.messages.map((m:any)=>{const meta=metaMap.get(m.uid);const flags=meta?.starred&&!m.flags.includes('\\Flagged')?[...m.flags,'\\Flagged']:m.flags;return serializeOverview({...m,flags,folder:key});}),unreadCount:await getUnreadCount(folder)};
}

export async function openMailboxMessage(key:string,uid:number){const folder=mailboxFromKey(key);const m=await getMessage(folder,uid,true);const client=m.from[0]?.address?await findClientByEmail(m.from[0].address):null;await upsertMailMetadata({folder,uid,read:true,starred:m.flags.includes('\\Flagged'),messageId:m.messageId||null,clientId:client?.id||null});if(client&&m.messageId)await recordEmailCommunication({messageId:m.messageId,clientId:client.id,direction:'INBOUND',subject:m.subject,fromAddress:m.from.map(x=>x.address).join(', '),toAddress:m.to.map(x=>x.address).join(', '),sentAt:new Date(m.date)}).catch(()=>undefined);return {...serializeMessage(m),uid,folder:key,clientId:client?.id||null,clientName:client?`${client.firstName} ${client.lastName}`:null};}
export async function flagMessage(key:string,uid:number,enabled:boolean){const folder=mailboxFromKey(key);await setMessageFlag(folder,uid,'flagged',enabled);await upsertMailMetadata({folder,uid,starred:enabled});}
export async function unreadMessage(key:string,uid:number){const folder=mailboxFromKey(key);await setMessageFlag(folder,uid,'seen',false);await upsertMailMetadata({folder,uid,read:false});}
export async function trashMessage(key:string,uid:number){const folder=mailboxFromKey(key);await moveToTrash(folder,uid);await moveMailMetadata(folder,uid,mailboxFromKey('trash')).catch(()=>undefined);}
