# The New Era | Admin WhatsApp satış paneli

Bu yeniləmə eyni New Era layihəsinə aiddir. ZIP-dəki faylları layihənin
`package.json` olan qovluğuna eyni yollarla əlavə edin. Sonradan dəyişdirdiyiniz
`prisma/schema.prisma`, `.env.example` və `app/admin/SalesOffers.tsx` faylları
varsa, həmin üç faylı birləşdirin. Əlavə iki Prisma modeli və yeni miqrasiya
mövcud müştəri və satış qeydlərini dəyişdirmir. ZIP-də server sirləri və
müştəri məlumatları yoxdur.

## Meta ayarları

1. Meta tətbiqində WhatsApp Cloud API üçün agentliyin nömrəsini və hesabını
   aktivləşdirin. Telefon nömrəsi ID-si, göndəriş icazəli server tokeni və
   tətbiqin App Secret-i tələb olunur. Bu modul müştəri Workspace-lərinin
   WhatsApp ayarlarından ayrıdır.
2. Meta-da göndəriləcək marketinq şablonunu təsdiqlədin. Bu inteqrasiya şablon
   gövdəsində yalnız bir mətn parametri gözləyir. Bu parametr təklifin HTTPS
   linki ilə əvəzlənir. Məsələn: «Salam! The New Era marketinq təklifinə
   buradan baxa bilərsiniz: {{1}}. Mesaj almaq istəmirsinizsə STOP yazın.»
   Nümunəni Meta-da təqdim edərkən parametr üçün real HTTPS nümunəsi əlavə edin.
3. `.env.example` faylının `SALES_WHATSAPP_*` dəyişənlərini serverdə qurun.
   Graph API versiyasını tətbiqinizin aktiv versiyası ilə, şablon dilini isə
   Meta-da təsdiqlənmiş dil kodu ilə eyniləşdirin. Verify Token sizin yaratdığınız
   ayrıca təsadüfi dəyərdir. Access Token və App Secret yalnız serverdə saxlanır.
4. Ümumi təqdimatı göndərmək üçün `SALES_WHATSAPP_PUBLIC_PROPOSAL_URL`
   dəyişəninə istifadə ediləcək HTTPS təqdimat və ya PDF linkini verin.
   Müştəriyə məxsus fərdi təklif üçün CRM-də həmin satışa aid təklifi yayımlayın.
5. AI cavab layihələri istəyə görə `SALES_WHATSAPP_AI_API_KEY` və
   `SALES_WHATSAPP_AI_MODEL` ilə aktivləşir. Düymə basıldıqda köməkçi son
   altıyadək mesajın qısaldılmış mətnindən layihə hazırlayır. Linklər, e-poçt və
   telefon nümunələri sorğudan əvvəl maskalanır. Admin mətni redaktə edib özü
   göndərir. AI ayarı olmadan hazır satış cavablarından istifadə etmək mümkündür.

## Yerləşdirmə və işə salma

- Layihənin mövcud yerləşdirmə prosesində Prisma miqrasiyasını tətbiq edin
  (`npx prisma migrate deploy`). Sonra mövcud `npm run build` ilə qurun.
- Meta webhook ünvanı: `https://thenewera.space/api/sales-whatsapp/webhook`.
  Meta ayarında eyni Verify Token-i istifadə edin, WhatsApp Business Account
  üçün `messages` sahəsinə abunə olun və tətbiqin həmin hesaba abunəsini yoxlayın.
- **Admin → Satış → Onlayn təkliflər → WhatsApp satış paneli** bölməsini açın.
  Birbaşa ünvan: `/admin/sales-whatsapp`.
- Mövcud müştərilər və Sales CRM nömrələri avtomatik görünür. Marketinq
  mesajına razılıq verən əlaqənin razılıq mənbəyini qeyd edin, təklifi seçin
  və göndərin. Yazışma və çatdırılma statusları həmin əlaqədə görünür.
- İlk canlı yoxlamanı razılıq verilmiş bir sınaq nömrəsində edin. Göndərişi,
  cavabın tarixçəyə düşməsini və oxunma statusunu yoxlayın.

Bu versiyada təklif göndərişi kontakt üzrə fərdi düymə ilə başlayır. AI yalnız
cavab layihəsi hazırlayır. Toplu kampaniya və avtonom mesaj göndərişi daxil deyil.
