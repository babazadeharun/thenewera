# NEW ERA — Instagram üzrə fərdi müştəri əlaqələri

Yer: **Super Admin → Satış CRM → Instagram əlaqələri**.
Birbaşa keçid: `/admin?section=sales&salesView=outreach`.

## Nə əlavə edildi?

- Mövcud satış siyahısının (o cümlədən fayldan idxal edilən müştərilərin) səhifələnən görünüşü.
- Müştəri, şirkət və Instagram istifadəçi adı üzrə axtarış; əlaqə statusuna görə filtr.
- Satış üçün Instagram istifadəçi adı/profil linki və mesaj qaralaması.
- İlk tanışlıq, həkim/klinika və razılıqdan sonrakı təklif üçün redaktə edilən mesaj nümunələri.
- Nümunədə müştərinin adı və şirkətinin yerinə qoyulması; mətn istifadəçi tərəfindən yoxlanılır.
- “Mesajı kopyala” və yadda saxlanmış “Instagram profilini aç” keçidi.
- Həmin satışın aktiv yayımlanmış onlayn təklifini seçib linkini kopyalanan mesaja əlavə etmək.
- Operator tərəfindən qeyd edilən əlaqə nəticələri və müəllifli fəaliyyət tarixçəsi.
- Paralel redaktələr üçün versiya yoxlaması; təkrar eyni qeydin tarixçəni çoxaltmaması.
- “Əlaqə saxlamayın” statusunda kopyalama və təklif linki əlavə etmə dayandırılır.

Bu modul mesajı Instagram-a göndərmir. Profil açmaq və mətni kopyalamaq göndərilmə sayılmır.
“İlk mesaj göndərildi” və “Təklif linki paylaşıldı” ayrıca operator təsdiqi tələb edir.
Bu statuslar çatdırılma/oxunma təsdiqi deyil. “Maraqlıdır” və digər nəticələr də əl ilə daxil edilir.
Mövcud onlayn təklifin baxış və müştəri cavabı izləməsi əvvəlki bölmədə işləməyə davam edir.
Əlaqə statusu mövcud satış mərhələsini, təklif statusunu və maliyyə məlumatlarını dəyişmir.

İnstagram hesabının API ilə qoşulması bu əl ilə əlaqə axını üçün tələb olunmur.
Yeni müştəriyə ilk mesajı Instagram-ın öz interfeysindən operator göndərir.
Toplu və avtomatik ilk DM göndərişi əlavə edilməyib.

## Quraşdırma

Bu arxiv `846cbfae219e26f411818772648d015f2d07f1d6` commitindəki layihəyə əsaslanır.
Arxivdəki yolları qoruyaraq faylları layihənin kökünə əlavə edin. Mövcud Prisma sxeminə yalnız
bir əlavə model və SalesDeal üzərində onun əlaqəsi əlavə edilib. Əgər sxem sizdə daha sonra
dəyişibsə, bütöv faylı əvəz etmək əvəzinə bu əlavə dəyişiklikləri birləşdirin.

PowerShell, layihənin kökündə:

```powershell
& {
    npx prisma generate
    if ($LASTEXITCODE -ne 0) { throw "Prisma client yaradılmadı." }

    npx prisma migrate deploy
    if ($LASTEXITCODE -ne 0) { throw "Migration tamamlanmadı." }

    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Build alınmadı." }
}
```

`migrate deploy` mövcud tətbiq edilməmiş migration-ları da icra edir; onu yalnız düzgün
DATABASE_URL ilə işlədin. Bazanın sıfırlanması və `db push --accept-data-loss` lazım deyil.
Production bazasında migration deployment-dən əvvəl tətbiq edilməlidir.

Yeni migration: `20261021190000_sales_instagram_prospecting`.
Yeni cədvəl: `SalesInstagramProspect`; mövcud cədvəl və məlumatlar silinmir.
Yeni environment dəyişəni və production paketi tələb olunmur.
Təklif linki əlavə etmək üçün əvvəlki `SALES_OFFER_SECRET` və `SALES_OFFER_APP_URL`
(və ya mövcud `CRM_APP_URL`) ayarları işlək olmalıdır.

## İstifadə

1. Satış CRM-də müştərini açın: **Instagram əlaqələri** tabı.
2. Profil adını və ya profil linkini daxil edin.
3. Mesaj nümunəsini seçin, fərdiləşdirin və “Profil və qaralamanı saxla” basın.
4. İstəyə bağlı bu satışın aktiv onlayn təklifini seçib linki mesaja əlavə edin.
5. Mesajı kopyalayın, Instagram profilini açın və Instagram-da özünüz göndərin.
6. “İlk mesaj göndərildi” və ya “Təklif linki paylaşıldı” seçib təsdiq xanasını işarələyin.
7. Sonrakı cavabları “Maraqlıdır”, “Cavab gözlənilir” və digər statuslarla qeyd edin.

Qeydlərdə açıq instagram.com profil URL-i varsa, profil sahəsində təklif edilir;
operator yadda saxlamayana qədər bu keçid təsdiqlənmiş profil hesab olunmur.
Profilin kimə aid olduğunu operator yoxlamalıdır. Bu funksiya Instagram hesabının
sahibliyini və ya mövcudluğunu avtomatik təsdiqləmir.

## Yoxlamalar

Yalnız test üçün, əsas package.json/package-lock.json dəyişmədən:

```powershell
npm install --prefix .crm-test-runtime --no-package-lock --no-audit --no-fund @electric-sql/pglite@0.3.7 @prisma/adapter-pg@5.17.0 jsdom@26.0.0
node tests/sales-prospecting.integration.cjs
node tests/sales-prospecting.ui.cjs
```

- 69 real Prisma + müvəqqəti in-process PostgreSQL/API yoxlaması keçdi.
- 18 faktiki React komponenti/DOM davranışı yoxlaması keçdi.
- Mövcud onlayn təkliflər üzrə 127 regression yoxlaması keçdi (eyni in-process test bazası körpüsü ilə).
- TypeScript yoxlaması və Prisma sxem validasiyası keçdi.
- Next.js production kompilyasiyası və build-in lint/tip mərhələsi keçdi. Tam build mövcud
  `/events` səhifəsinin prerender mərhələsində bu mühitdə `DATABASE_URL` olmadığı üçün dayandı.
  Tam production build baza bağlantısı olan quraşdırma mühitində yenidən işlədilməlidir.
- Köhnə CSS fayllarında olan autoprefixer xəbərdarlıqlarına toxunulmayıb.
- Yoxlamalar giriş rollarını, bloklanmış hesabı, MFA-nı, sorğu mənbəyini, profil linki
  validasiyasını, səhifələməni, filtr/axtarışı, paralel redaktəni, operator təsdiqini,
  tarixçəni, yanlış/vaxtı bitmiş təklifləri və satış məlumatlarının qorunmasını əhatə edir.
- Testlərdə xarici Instagram/SMTP göndərişi yoxdur.
- Interfeys testi həqiqi brauzer renderi deyil. Desktop/mobil görünüş deployment-dən sonra
  ayrıca yoxlanmalıdır; responsive CSS daxil edilib.

Canlı bazaya migration tətbiqi, GitHub push və deployment bu arxiv hazırlanarkən edilməyib.
