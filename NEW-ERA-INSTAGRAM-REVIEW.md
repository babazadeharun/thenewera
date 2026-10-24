# NEW ERA Workspace — Instagram App Review hazırlığı

Bu mətnlər mənbə kodunda olan istifadəni təsvir edir. App Review qaralaması üçün hazırlanıb; canlı test, video və reviewer test girişi hazır olmadan müraciət göndərilməməlidir. Başqasının Instagram şifrəsi və ya production istifadəçi hesabı reviewer-ə verilməməlidir.

## instagram_business_basic — istifadə izahı

NEW ERA Workspace is a multi-tenant CRM operated by NEAGENCY LLC under the NEW ERA brand. A business owner or another authorized member opens Workspace Settings, chooses Instagram Connect, and signs in through Instagram's official authorization window. We use instagram_business_basic to retrieve the authorizing professional account's user ID and username, show the account returned by Instagram, and let the member explicitly confirm which account is linked to their company. This identifies the correct business inbox and prevents connecting one Instagram account to two different companies at the same time. The connected account name and connection status appear in Workspace Settings under Instagram.

We request instagram_business_basic as a dependency of instagram_business_manage_messages. This integration does not publish posts or import historical media. Only authorized members of the connected company can use its social connection; server-side company and permission checks enforce this boundary. The business can disconnect the account in Settings and request deletion through our public data deletion instructions page.

To test: sign into the dedicated NEW ERA reviewer account supplied in Reviewer instructions, open its assigned test Workspace, go to Settings (Ayarlar), and click Instagram Connect (Qoş). Authorize your own Instagram professional account, return to NEW ERA, select the account returned by Instagram and confirm the connection. Its username/display name and connected status should appear in the Instagram card. We do not ask reviewers to share Instagram credentials with NEW ERA.

## instagram_business_manage_messages — istifadə izahı

NEW ERA Workspace lets a business manage new incoming Instagram text messages in the same CRM as its customers, sales and tasks. After an authorized business member connects and confirms their professional account using official Instagram Login, the server subscribes the selected account to messaging events. Verified webhooks create incoming message records in that company's Workspace. We store message text, message ID, sender/recipient platform identifiers, account ID and timestamps so authorized employees can view the conversation, link it to a customer and send a confirmed text reply through the connected business account.

This permission is necessary to receive and reply to Instagram customer messages inside the CRM. Replies require an authorized user action and the provider's permitted response window. The current integration does not bulk-send cold messages, publish content, import historical inboxes or automatically import media. Tokens are encrypted server-side, webhook signatures are validated, and a company's messages are not exposed to other Workspaces. Disconnecting stops the local connection and removes its stored token; deletion of previously stored CRM messages is handled through the published data deletion request process.

To test: connect your professional Instagram account in the dedicated reviewer Workspace as described above. Send a new text message to that business from a separate test Instagram account. Open Messages (Mesajlar) in NEW ERA and locate the received text. Link it to a test customer if required by the UI, enter a text reply and confirm sending. Verify that the reply arrives in the originating Instagram conversation. Finally disconnect from Settings and check the disconnected state. The submitted screencast must show this entire flow in NEW ERA and Instagram.

## Ekran videosunun planı

1. NEW ERA-ya test istifadəçisi ilə daxil olmaq; yalnız test məlumatları görünür.
2. Test Workspace seçmək → Ayarlar → Sosial hesablarınız.
3. Instagram Qoş → Instagram-ın rəsmi giriş/razılıq pəncərəsi. Şifrə daxil edilən hissəni videoya salmayın; icazə ekranını göstərin.
4. NEW ERA-ya qayıtmaq, real qaytarılan hesabı seçmək və təsdiqləmək.
5. Instagram kartında istifadəçi adını və Qoşulub vəziyyətini göstərmək.
6. Ayrı test hesabından həmin biznesə yeni mətn göndərmək.
7. Workspace Mesajlar bölməsində eyni mətni açmaq, müştəriyə bağlamaq və təsdiqlə cavab göndərmək.
8. Instagram-da eyni cavabın gəldiyini göstərmək.
9. Workspace-də hesabı ayırmaq və ayrılmış vəziyyəti göstərmək.

## Reviewer instructions üçün faktiki hazırlanmalı giriş

- Sayt: https://thenewera.space
- Workspace başlanğıcı: https://thenewera.space/workspace
- Ayrı test istifadəçisi və ona məxsus test şirkəti yaradılmalıdır. Reviewer üçün test login məlumatları yalnız Meta-nın uyğun sahəsində təhlükəsiz təqdim edilir; bu fayla şifrə yazılmır.
- Hesabın e-poçt təsdiqi əvvəlcədən tamamlanmalı və test Workspace-in planı review müddətində aktiv qalmalıdır.
- Reviewer üçün lazımi settings/messages səlahiyyətləri olmalıdır; production admin/super-admin icazəsi verilməməlidir.
- İki mərhələli giriş tələb olunarsa reviewer-in işlədə biləcəyi qanuni test axını ayrıca izah olunmalıdır; production təhlükəsizliyi söndürülməməlidir.
- Məxfilik: https://thenewera.space/privacy — yalnız deploy-dan sonra mövcud olacaq.
- Silinmə: https://thenewera.space/data-deletion — yalnız deploy-dan sonra mövcud olacaq.

## Data handling — uydurulmadan cavablandırılmalı suallar

Meta bu bölmədə xidmət sahibini, emalçılara verilən məlumatları, səlahiyyətləri və dövlət sorğuları üzrə prosesləri soruşa bilər. Kod üzrə Vercel hostinqi, Neon PostgreSQL və Meta API inteqrasiyası var. Digər aktiv subpodratçılar, onların həqiqi emal ölkələri, daxili qaydalar və hüquqi sorğuların tarixçəsi xidmət sahibi tərəfindən təsdiqlənməlidir. Region, sertifikat, audit və ya olmayan daxili siyasət haqqında müsbət bəyanat verməyin.

## Hazırkı xarici maneələr

- Şəxsiyyət vəsiqəsi göndərilib; Meta yoxlaması davam edir.
- Biznes portfolyosu hələ Verified deyil; rəsmi şirkət sənədi təqdim edilməyib.
- Webhook callback/token/hadisə abunəliyi canlı təsdiqlənməyib.
- Tester hesabı ilə real login/mesaj/cavab videosu və ayrıca reviewer girişi hazırlanmayıb.
- İcazələrin istifadə şərtlərini qəbul etmək və yekun App Review göndərişi konkret müraciət hazır olduqda ayrıca təsdiqlənməlidir.
