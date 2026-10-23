"use client";
import { useState } from "react";
import { api, Form, type R } from "./shared";
export default function LeadFlowSettings({ meta, url, allowed }: { meta: R; url: (s: string) => string; allowed: boolean }) {
  const initial = meta.company.preferences?.leadFlow || {};
  const [members, setMembers] = useState<string[]>(initial.memberIds || []), [notice, setNotice] = useState(""), [secret, setSecret] = useState<R | null>(null), [busy,setBusy] = useState(false);
  async function key(revoke: boolean) {
    setBusy(true); setNotice(""); setSecret(null);
    try { const r = await api(url("intake-key"), { revoke }); if (!revoke) setSecret(r); setNotice(revoke ? "Forma açarı ləğv edildi." : "Yeni açarı indi köçürün. Əvvəlki açar artıq işləmir."); }
    catch(e) { setNotice((e as Error).message); } finally { setBusy(false); }
  }
  return <section className="crmPanel">
    <h2>Müraciətdən satışa avtomatik axın</h2>
    <p>Qoşulmuş kanaldan yeni müraciət gəldikdə müştəri və açıq satış yaradılır. Mövcud kontakt təkrar yaradılmır. Hazırkı məlumatları dəyişməmək üçün ilk aktivləşdirmə şirkət rəhbərinə aiddir.</p>
    {notice && <p role="status" className="crmBanner">{notice}</p>}
    <Form disabled={!allowed} values={{ enabled: initial.enabled ? "yes" : "no", assignment: initial.assignment || "OWNER", slaMinutes: meta.company.preferences?.slaMinutes || 30, escalationMinutes: initial.escalationMinutes ?? 30, followUpDays: initial.followUpDays ?? 2 }} fields={[
      {key:"enabled",label:"Avtomatik axın",options:[{value:"no",label:"Bağlı"},{value:"yes",label:"Aktiv"}]},
      {key:"assignment",label:"Yeni müraciətin təyinatı",options:[{value:"OWNER",label:"Kanal məsulu / şirkət rəhbəri"},{value:"ROUND_ROBIN",label:"Seçilmiş əməkdaşlar arasında növbə ilə"}]},
      {key:"slaMinutes",label:"İlk cavab üçün müddət (dəqiqə)",type:"number",required:true},
      {key:"escalationMinutes",label:"Gecikmədən neçə dəqiqə sonra rəhbərə xəbər verilsin?",type:"number",required:true},
      {key:"followUpDays",label:"Təklif SENT olduqdan neçə gün sonra əlaqə? (0: bağlı)",type:"number",required:true}
    ]} submit={async b => { await api(url("preferences"), {slaMinutes:Number(b.slaMinutes),leadFlow:{enabled:b.enabled==="yes",assignment:b.assignment,memberIds:members,escalationMinutes:Number(b.escalationMinutes),followUpDays:Number(b.followUpDays)}});setNotice("Müraciət axını saxlanıldı."); }}>
      <fieldset disabled={!allowed}><legend>Növbəli təyinatda iştirak edən əməkdaşlar</legend>
      {meta.members.map((m:R)=><label key={m.id}><input type="checkbox" checked={members.includes(m.id)} onChange={e=>setMembers(v=>e.target.checked?[...v,m.id]:v.filter(id=>id!==m.id))}/>{m.user.email}</label>)}</fieldset>
    </Form>
    <p>Bildirişlər planlaşdırılmış yoxlamada yaranır. Eyni müraciət üzrə təkrar bildiriş göndərilmir; yeni mesaj cavab müddətini uzatmır. Təklif üzrə tapşırıq hər təklif üçün bir dəfə yaradılır.</p>
    {allowed && <><h3>Sayt forması bağlantısı</h3><p>Forma açarı yalnız saytınızın serverində saxlanmalıdır. Müştərinin brauzerində yerləşdirməyin. Hər müraciətə unikal requestId verin; eyni ID ilə təkrar sorğu yeni qeyd yaratmır.</p>
      <div className="crmActions"><button disabled={busy} onClick={()=>key(false)}>Yeni forma açarı yarat</button><button disabled={busy} onClick={()=>key(true)}>Forma açarını ləğv et</button></div>
      {secret && <div><p>Açar yalnız indi göstərilir:</p><code style={{overflowWrap:"anywhere"}}>{secret.key}</code><p>POST {secret.path}</p><p>Authorization: Bearer açar</p><pre style={{whiteSpace:"pre-wrap"}}>{JSON.stringify({requestId:"unique-form-request",name:"Müştərinin adı",email:"customer@example.com",phone:"+994501234567",source:"Instagram reklamı",message:"Xidmətlə maraqlanıram"},null,2)}</pre><button onClick={()=>setSecret(null)}>Açarı gizlət</button></div>}</>}
  </section>;
}
