# NEW ERA — Super Admin Satış: fayldan idxal və təklif izləmə

Bu paket əvvəlki Workspace V2 yeniləməsinin üzərinə əlavə olunur. Yalnız bu tapşırığa aid fayllar var; əvvəlki müştəri giriş yönləndirməsi bu paketdə dəyişdirilmir.

## İstifadə

1. Super Admin panelində mövcud **Satış** bölməsini açın. Əvvəlki **Yeni satış** düyməsi qalır.
2. **Fayldan idxal et** düyməsi ilə `.xlsx`, `.docx` və ya UTF-8 `.csv` seçin.
3. Sütunları şirkət/satış adı, əlaqə şəxsi, e-poçt, telefon, Instagram, fəaliyyət sahəsi, mənbə və qeydlə uyğunlaşdırın. Tanınan başlıqlar avtomatik seçilir, dəyişmək mümkündür.
4. **Önizləməni yoxla** düyməsini basın. Düzgün, təkrar və səhv sətirlər ayrıca göstərilir. İstədiyiniz hazır sətirləri seçin.
5. Seçimi təsdiqləyin. Yeni qeydlər mövcud satış siyahısına, daxil olmuş adminə təyin edilərək **Təklif göndərilməlidir** statusu ilə əlavə edilir.
6. Satış kartında təklif statusunu və mövcud follow-up tarixini dəyişin. **Təklif göndərildi** seçildikdə göndərməni təsdiqləyin və kanalı qeyd edin. Son göndərilmə tarixi serverdə yazılır; status keçidi, kanal, müəllif və vaxt fəaliyyət tarixçəsində saxlanılır. İmtina üçün səbəb tələb olunur.
7. Təklif statusu üzrə filtr və say göstəriciləri əsas Satış ekranındadır; status satış siyahısında və Kanban kartlarında görünür.

**Fayl yükləmək və ya status dəyişmək e-poçt, WhatsApp və Instagram mesajı göndərmir.** “Göndərildi” adminin faktiki göndərdiyi təklifi qeyd etməsidir; məktubun çatdırıldığını və ya oxunduğunu təsdiqləmir. Avtomatik göndərmə və cavab izləmə bu paketin funksiyası deyil. Mövcud fəaliyyət qeydlərinə təklif mətni və əlaqə nəticəsi yazmaq olar.

## Faylın quruluşu

- Maksimum 2 MB, 1000 məlumat sətri, 100 sütun.
- Excel: ilk vərəq, ilk sətirdə başlıqlar. Formulaları əvvəl sadə dəyərlərə çevirin. Telefonları mətn formatında saxlayın ki, əvvəlindəki 0 və + itməsin.
- Word: ilk sətri başlıq olan sadə cədvəl. Sərbəst mətn və iç-içə cədvəllər qəbul edilmir. Köhnə `.doc` faylını Word-də `.docx` kimi saxlayın.
- Köhnə `.xls` formatını `.xlsx` kimi saxlayın. CSV UTF-8 olmalıdır, vergül və ya nöqtəli vergül ayırıcıları oxunur.
- Şirkət / satış adı və ya əlaqə şəxsi tələb olunur. Telefon və e-poçt məcburi deyil, daxil edilibsə format yoxlanır.

Nümunə başlıq:

| Şirkət | Ad soyad | Email | Telefon | Instagram | Fəaliyyət sahəsi | Mənbə | Qeyd |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Nümunə klinika | Həkim adı | doctor@example.com | +994501234567 | @example | Stomatologiya | Instagram | İlk əlaqə qurulmalıdır |

İdxal **SalesDeal** potensial satış qeydləri yaradır; sayt istifadəçi hesabları, login şifrələri və Workspace CRM müştəriləri yaratmır. Şirkət adı satışın adı kimi saxlanılır. Instagram və fəaliyyət sahəsi mövcud qeyd sahəsinə yazılır və satış axtarışında tapılır.

## Təkrarlar və təhlükəsizlik

- Platformanın mövcud ADMIN / SUPER_ADMIN satış icazələri qorunur. Müştəri, promoter və Workspace Owner rolu idxala çıxış vermir.
- Yeni idxal endpoint-i serverdə autentifikasiya və eyni mənbə yoxlaması aparır; şəxsi cavablar keşlənmir.
- E-poçt böyük/kiçik hərfə baxmadan, telefon isə boşluq və mötərizələrdən təmizlənərək yoxlanır. Yerli Azərbaycan nömrələrinin 050..., 50... və +99450... formaları uyğunlaşdırılır.
- Fayl daxilindəki təkrarlar və mövcud satış siyahısındakı manual/idxal qeydləri yoxlanır. Telefon/e-poçt olmayan qeydlərdə eyni satış adı və əlaqə şəxsi təkrar sayılır. Eyni adda fərqli şəxslər üçün əlavə əlaqə məlumatı verin.
- İdxal zamanı server yenidən yoxlayır; paralel idxallar tranzaksiya kilidi ilə qorunur. Yenidən cəhd və eyni faylın təkrar idxalı mövcud qeydlərin üzərinə yazmır.
- UI 25 sətirlik paketlərlə işləyir. Uğurlu sətirlər saxlanır, problemli sətirlər ayrıca göstərilir. Bağlantı kəsilərsə önizləməni yenidən yoxlayıb davam edin.
- Təklif statusu mövcud satış mərhələsindən ayrıdır. “Təklif qəbul edildi” mərhələni avtomatik WON etmir; mövcud “Qazanıldı” və layihəyə çevirmə axını qalır. Təklifin göndərilməsi maliyyə daxilolması sayılmır.
- Yüklənən fayl arxiv kimi saxlanmır; uyğunlaşdırılmış məlumatlar satış bazasında saxlanır. Office ZIP açılma həddi 20 MB-dır; Word XML-də DTD qəbul edilmir.

## Quraşdırma

ZIP-dəki faylları mövcud `new-era` layihəsinin üzərinə çıxarın. Qovluq strukturu qorunmalıdır. Bu dəyişiklik üçün **yeni migration və environment dəyişəni yoxdur**; mövcud SalesDeal və SalesActivity sahələri istifadə edilir. Əvvəlki Workspace V2 migration-ının tətbiqi ilə bağlı tələb qüvvədə qalır.

PowerShell:

```powershell
Set-Location "C:\Users\User\Downloads\new-era-starter\new-era-starter\new-era-starter\new-era"

npm ci
if ($LASTEXITCODE -ne 0) { throw "Paketlər quraşdırılmadı." }

npm run build
if ($LASTEXITCODE -ne 0) { throw "Build alınmadı. Nəticəni göndər." }

$changedFiles = @(
    Get-Content -LiteralPath "ADMIN-SALES-IMPORT-FILES.md" -Encoding UTF8 |
    Where-Object { $_ -match '^- `(.+)`$' } |
    ForEach-Object { $Matches[1] }
)
if ($changedFiles.Count -eq 0) { throw "Fayl siyahısı oxunmadı." }

git --literal-pathspecs add -- @changedFiles
if ($LASTEXITCODE -ne 0) { throw "Git add alınmadı." }

git --no-pager diff --cached --stat

git commit -m "Add admin sales file import and proposal tracking"
if ($LASTEXITCODE -ne 0) { throw "Commit alınmadı." }

git push origin main
if ($LASTEXITCODE -ne 0) { throw "Push alınmadı." }
```

Yalnız `saxes@6.0.0` birbaşa asılılıq kimi əlavə edilib (Word XML üçün); mövcud ExcelJS istifadə olunur. ExcelJS-in mövcud daxili SAX versiyası qorunur. Paket yenilənməsi və platforma upgrade-i edilməyib.

## Yoxlama nəticələri

- 58 inteqrasiya yoxlaması: həqiqi Prisma və müvəqqəti PostgreSQL (PGlite). İcazələr, sorğu mənbəyi, XLSX/DOCX/CSV, formulalar, səhv fayllar, təkrarlar, paralel və təkrar idxal, manual qeydlərin qorunması, status təsdiqi, tarix və fəaliyyət qeydləri.
- Brauzer: 100 sətirlik Excel-dən 97 qeyd yaradıldı; 2 təkrar, 1 səhv sətir ayrıldı. Yenidən idxal yeni dublikat yaratmadı. Status dəyişməsi serverdə qeydə alındı. DOCX önizləməsi 390 və 320 px mobil enlərdə yoxlandı; səhifə JavaScript xətası olmadı.
- TypeScript və Next.js production **compile** yoxlaması keçdi. Tam standart `npm run build` public səhifələrin bazadan məlumat oxumasını da tələb edir; bu paket üçün canlı istehsal bazasında həmin yoxlama aparılmayıb. Deploy-dan əvvəl yuxarıdakı build əmri öz mühitinizdə işlədilməlidir.
- Canlı sayta və GitHub-a bu paket avtomatik göndərilməyib. Real mesaj göndərilməyib.

İnteqrasiya testinin təkrar icrası (təcrid olunmuş test bazasıdır):

```powershell
npm install --prefix .crm-test-runtime --no-save @electric-sql/pglite@0.5.10 @electric-sql/pglite-socket@0.2.13
npm run test:admin-sales-import
```

Test alətləri production paketlərinə daxil deyil. Əgər əvvəlki Workspace test runtime-ı qurulubsa yenidən quraşdırmağa ehtiyac yoxdur.
