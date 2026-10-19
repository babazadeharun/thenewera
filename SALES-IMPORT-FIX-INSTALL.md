# Satış idxalı — Excel hesabatları üçün uyğunluq düzəlişi

Bu paket əvvəlki **Admin Sales Import** yeniləməsinin üzərinə tətbiq edilir. Yalnız bu düzəlişin 8 faylı var. Göndərilən həkim siyahısı dəyişdirilməyib və bu paketə daxil edilməyib.

## Düzəldilənlər

- Standart namespace prefiksi ilə yazılmış XLSX sənədləri üçün təhlükəsiz XML oxuyucu əlavə edildi. ExcelJS sənədi yükləyə bilmədikdə ehtiyat oxuyucu işə düşür; ZIP açılma limiti, formulaların rəddi və XML DTD qadağası qorunur.
- İlk 30 sətirdə sütun başlıqları tanınır. Faylın üstündəki hesabat adı, izahlar və boş sətirlər məlumat kimi idxal edilmir.
- **Başlıq sətri** seçimi ilə avtomatik təyini dəyişmək olur. Önizləmədə XLSX-in həqiqi sətir nömrələri göstərilir.
- “Ad / Klinika”, “İxtisas / Xidmət”, “Instagram adı”, “Telefon / WhatsApp” və bu siyahının digər sütunları avtomatik uyğunlaşdırılır.
- “Bio-da tapılmadı”, “yoxdur”, “qeyd edilməyib” kimi əlaqə qeydləri telefon/e-poçt sahəsini boş saxlayır, orijinal qeyd ayrıca qeydlərdə qorunur. Səhv yazılmış həqiqi e-poçt ünvanları yenə xəta kimi göstərilir.
- Bir hüceyrədə bir neçə telefon olduqda ilk tam nömrə əsas telefon kimi saxlanır; tam ilkin mətn də qeydlərdə qalır. Yalnız qısa qaynar xətt olan hüceyrələrdə əsas telefon boş qalır, qaynar xətt qeydlərdə saxlanır.
- Ünvan, ərazi üzrə sübut, profil linki, Instagram, ixtisas, əlavə telefonlar və araşdırma qeydləri saxlanır. İstifadəçi hesabı və ya şifrə yaradılmır.
- Mövcud satış mərhələləri, təklif statusları, manual əlavə etmə, icazələr və idxalın təkrar yoxlaması qorunur. Fayl və status əməliyyatları mesaj göndərmir.

## Göndərdiyiniz faylla nəticə

`Baki-Hekimler-Instagram(1).xlsx` faylı ilə həm serverdə, həm brauzerdə yoxlanıb:

- Başlıqlar: **6-cı sətir**.
- Məlumat: **150 profil**, **0 format xətası**.
- Boş test bazasında **149 yeni qeyd**, **1 eyni telefon nömrəsinə görə təkrar kimi ayrılan qeyd**.
- Təkrar cəhd əlavə dublikat yaratmır.
- Brauzerdə avtomatik sütun uyğunluğu, başlıq sətrinin dəyişdirilməsi, ilkin sətir nömrələri, qeydlərin qorunması, idxal və 390/320 px mobil ekranlar yoxlanıb.

Canlı bazanızda əvvəlcədən uyğun qeydlər varsa daha çox təkrar görünə bilər. Eyni klinika telefonunu paylaşan fərqli şəxslər də mövcud telefon üzrə təkrar qaydasına düşə bilər; belə qeydləri yoxlayın. İlkin Excel faylı saxlanılır, mövcud satışın üzərinə yazılmır.

## Quraşdırma və GitHub

ZIP-i mövcud layihənin üzərinə çıxarın. Qovluq strukturu qorunmalıdır. Yeni paket, migration və environment dəyişəni tələb olunmur; əvvəlki idxal paketindəki ExcelJS və saxes istifadə edilir.

```powershell
Set-Location "C:\Users\User\Downloads\new-era-starter\new-era-starter\new-era-starter\new-era"

if (-not (Test-Path "src/lib/sales/xlsx-xml.ts")) {
    throw "Düzəliş faylları tapılmadı. ZIP-i layihənin üzərinə çıxarın."
}

npm run build
if ($LASTEXITCODE -ne 0) { throw "Build alınmadı. Nəticəni göndər." }

$changedFiles = @(
    Get-Content -LiteralPath "SALES-IMPORT-FIX-FILES.md" -Encoding UTF8 |
    Where-Object { $_ -match '^- `(.+)`$' } |
    ForEach-Object { $Matches[1] }
)
if ($changedFiles.Count -ne 8) { throw "Fayl siyahısı düzgün oxunmadı." }

git --literal-pathspecs add -- @changedFiles
if ($LASTEXITCODE -ne 0) { throw "Git add alınmadı." }

git --no-pager diff --cached --stat

git commit -m "Fix Excel report imports and contact normalization"
if ($LASTEXITCODE -ne 0) { throw "Commit alınmadı." }

git push origin main
if ($LASTEXITCODE -ne 0) { throw "Push alınmadı." }
```

Vercel deploy Ready olduqda Super Admin → Satış → Fayldan idxal et vasitəsilə **orijinal Excel faylını** yenidən seçin. Başlıq sətri 6 olmalıdır. Önizləmədə sütunları və təkrarları yoxlayıb təsdiqləyin.

## Texniki yoxlamalar

- Müvəqqəti PostgreSQL + həqiqi Prisma ilə 98 yoxlama keçdi; bunlara təqdim etdiyiniz faylın oxunması və paketlərlə idxalı da daxildir. İstehsal bazasında dəyişiklik edilməyib.
- Sintetik namespace prefiksli XLSX, adi XLSX, DOCX və CSV; başlıq seçimi, orijinal sətir nömrələri, əlaqə normalizasiyası, formulalar, DTD, limitlər, icazələr, təkrar və paralel idxal yoxlanıb.
- Həqiqi brauzer ilə ayrıca 150 sətirlik fayldan 149 qeyd əlavə edilməsi və mobil görünüş yoxlanıb.
- TypeScript və Next.js production compile keçdi. Tam standart build canlı bazadan public səhifələr üçün məlumat oxunmasını da tələb edir; bu mühitdə istehsal bazası ilə tam build yoxlanmayıb. Deploy-dan əvvəl yuxarıdakı build-i öz mühitinizdə işlədin.
- Canlı sayta və GitHub-a avtomatik göndərilməyib. Real məktub və mesaj göndərilməyib.

Əvvəlki test runtime-ı varsa `npm run test:admin-sales-import` ilə yenilənmiş, şəxsi məlumat içərməyən reqressiya testini işlədə bilərsiniz. Testdə təqdim edilən həkim siyahısı tələb olunmur.
