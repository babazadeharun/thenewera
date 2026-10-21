# NEW ERA — Onlayn təklif yaratma axını

## Yeni istifadə qaydası

**Satış CRM → Onlayn təkliflər → Yeni təklif**.

1. **Müştəri və xidmətlər** — müştərini seçin, xidmətləri və qiymətləri doldurun.
2. **Təklifə bax** — məlumatlar qaralamada saxlanır, müştəri görünüşü avtomatik açılır.
3. **Yayımlamaya keç → Yayımla və linki al** — məzmunu təsdiqləyin, linki yaradın və paylaşın.

“Qaralamanı saxla” ayrıca ikinci düymədir; redaktə ekranından çıxmadan saxlayır.
Önbaxışdan redaktəyə və yayımlama addımından önbaxışa qayıtmaq mümkündür.
Mərhələ dəyişəndə ekran təklif bölməsinin əvvəlinə yönəlir.
Yayımlamaq avtomatik e-poçt/Instagram mesajı göndərmir.

## E-poçtu olmayan müştəri

- E-poçt sahəsi istəyə bağlıdır. Boş saxlanarsa qaralama və yayımlanmış baxış linki yaradıla bilər.
- Linkdə xidmətlər, qiymətlər və şərtlər görünür; mövcud baxış izləməsi işləyir.
- Onlayn qəbul, imtina, dəyişiklik və görüş istəyi bağlıdır; server bu əməliyyatları da rədd edir.
- Müştəriyə cavab üçün təklifi göndərən NEW ERA nümayəndəsi ilə əlaqə saxlamaq bildirilir.
- E-poçtla göndər düyməsi göstərilmir; server də boş ünvana göndəriş etmir.
- Sonradan e-poçtla təsdiqi aktivləşdirmək üçün “Yeni versiya hazırla” seçib düzgün e-poçtu əlavə edin.
  Köhnə yayımlanmış versiya redaktə olunmur; yeni versiya yalnız yayımlananda əvvəlki link bağlanır.

E-poçtu olan təkliflərdə əvvəlki kodla təsdiq, ünvanla məhdudlaşdırma, OTP müddəti,
cəhd limitləri, göndəriş təsdiqi və qəbul edilmiş versiyanın qorunması saxlanılıb.

## Qiymət və xəta göstərişi

Endirim xidmətlərin cəmindən çoxdursa mənfi yekun göstərilmir. Səhv mesajı formanın sonunda görünür,
önbaxış və qaralama düymələri qiymət düzələnə qədər bağlanır. Hesablama qəpiklə aparılır;
server bütün məbləğləri yenidən yoxlayır. Pulsuz təklif üçün qiymət/endirim 0/0 və ya 500/500 kimi
uyğun məbləğlər ola bilər. API xətaları qırmızı xəbərdarlıqla, redaktə zamanı isə formanın sonunda da göstərilir.

## Quraşdırma

Arxivin içindəkiləri yolları qorumaqla layihənin əsas qovluğuna çıxarın.
**Yeni migration, sxem dəyişikliyi və production paketi yoxdur.**

```powershell
& {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Build alınmadı. Nəticəni göndər." }
}
```

Əvvəlki `SALES_OFFER_SECRET` və `SALES_OFFER_APP_URL` (və ya `CRM_APP_URL`) saxlanmalıdır.
Yeni environment dəyişəni yoxdur. E-poçtla cavablandırılan təkliflər üçün mövcud SMTP işlək olmalıdır.
E-poçtsuz, yalnız baxış linkinin yaradılması SMTP bağlantısı tələb etmir.

Bu paket əvvəlki Instagram əlaqələri modulunun fayllarını əvəz etmir.
Hesab rollarına, girişə, qeydiyyata, navbar-a və Workspace məlumatlarına dəyişiklik edilmir.

## Yoxlamalar

164 real Prisma/müvəqqəti PostgreSQL API yoxlaması və 35 faktiki React/DOM yoxlaması keçib.
API suite mövcud onlayn təkliflər üzrə 127 əvvəlki yoxlamanı da ehtiva edir.
TypeScript yoxlaması və `next build --experimental-build-mode compile` kompilyasiya mərhələsi keçib.
Bu, baza tələb edən tam prerender yoxlaması deyil. Heç bir real e-poçt və ya Instagram mesajı göndərilməyib.
UI yoxlaması DOM əsasındadır; həqiqi brauzerdə desktop/mobil render yoxlaması aparılmayıb.
Tam production build baza bağlantısı olan mühitdə işlədilməlidir.

Yalnız test üçün (əsas package.json/package-lock.json dəyişmir):

```powershell
npm install --prefix .crm-test-runtime --no-package-lock --no-audit --no-fund @electric-sql/pglite@0.3.7 @prisma/adapter-pg@5.17.0 jsdom@26.0.0
node tests/sales-offer-workflow.integration.cjs
node tests/sales-offer-workflow.ui.cjs
```

Test bazası in-process qurulur, production bazasına qoşulmur. Test mühiti helper-i də arxivdədir.
GitHub push və deployment bu paket hazırlanarkən edilməyib.
