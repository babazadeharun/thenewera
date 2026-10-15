# New Era — vahid glass navbar və monitor düzəlişi

Bu paket əvvəlki `new-era-portfolio-detail.zip` tam layihəsinin düzəldilmiş davamıdır.

## Düzəlişlər
- `app/components-site-header.tsx`: bütün əsas açıq səhifələr üçün vahid navbar. Ana səhifə də bu komponentdən istifadə edir. Eyni 7 əsas link, logo və birbaşa hesab keçidi saxlanılıb. Əlaqə, axtarış, qeydiyyat və çıxış kimi əlavə mövcud əməliyyatlar kiçik əlavə menyuda əlçatandır. Menyu Escape ilə bağlanır. Hesabın roluna uyğun yönləndirmə, auth/me və logout API-si dəyişməyib. Əvvəldən funksiyasız olan axtarış üçün yeni axtarış funksiyası yaradılmayıb.
- `app/public-navbar.css` (yeni): nümunədəki geniş glass panel, eyni logo ölçüsü, əsas menyunun düzülüşü, hesab düyməsi; şəffaf gradient, 24px backdrop blur, ağ border və yumşaq kölgə. Desktopda 42px yan boşluq və 102px hündürlük; dar ekranlarda vahid responsive qaydalar. Bütün əsas açıq səhifələrdə eyni CSS tətbiq edilir. Admin, müştəri və promoter workspace naviqasiyaları dəyişdirilməyib.
- `app/page.tsx`: köhnə ayrıca homepage navbarı çıxarılıb; root layout-dakı vahid SiteHeader istifadə edilir. Hero və səhifənin qalan məzmunu saxlanılıb. Əlaqə keçidi əlavə menyuda və səhifənin footer hissəsində qalır.
- `app/portfolio/portfolio-reference.css`: portfolio səhifəsinə aid navbar override-ları çıxarılıb.
- `app/portfolio/[id]/project-detail-reference.css`: detal səhifəsinin navbar override-ları çıxarılıb. Bəyənilməyən monitor PNG çərçivəsi istifadə edilmir. Örtük real img/video olaraq yumşaq şəffaf glass paneldə, object-fit:contain ilə kəsilmədən göstərilir. Qalan qalereya, video və CMS məlumatları saxlanılıb.

Əvvəlki portfolio siyahısı/detal hesabatlarındakı monitor və ayrıca header rəngləri barədə qeydlər bu düzəlişlə əvəz edilir. Fayl şəklində köhnə monitor asset-i layihədə qalsa da yeni CSS-də ona istinad yoxdur və göstərilmir.

## Yoxlama
- TypeScript keçib.
- Real Next.js dev tətbiqində /, /services, /portfolio, /start-project və /login səhifələri yoxlanılıb. Auth me cavabı yalnız test brauzerində kontrollu nümunə ilə əvəz olunub; bazaya heç nə yazılmayıb.
- 320,390,760,810,1024,1440,1920px ölçülərdə yoxlamalar: üfüqi daşma yoxdur.
- 1440px ölçüdə bu səhifələrin navbar eni, hündürlüyü, x koordinatı, fon gradienti, border radius və backdrop-filter dəyərləri eynidir. Hər səhifədə tək header və 7 əsas link var.
- Menyunun açılması/Escape bağlanması, daxil olmuş hesab keçidi, guest login/register keçidləri işləyir. Brauzer runtime xətası yoxdur.
- Actual detal server komponenti fixture ilə ayrıca render olunub: 320–1440px daşma yoxdur; media qruplaşdırılması, draft/başqa şirkət filtri, video controls, xarici layihə keçidi, geri keçid və notFound qorunur. Şəkillər monitor olmadan göstərilir.
- `npm run build` kompilyasiya və type yoxlamasını keçib; mövcud `/events` prerender zamanı bazaya qoşulmadığı üçün tam build tamamlanmayıb.
- API, Prisma/schema/migration və biznes məntiqi dəyişdirilməyib. Deploy/push/commit edilməyib; istifadəçinin əvvəlki dəyişiklikləri saxlanılıb.

## İstifadə
Bu ZIP tam layihədir. `new-era` qovluğunun içindəkiləri mövcud layihə kökünə köçürün. Öz `.env` və `.env.local` fayllarınızı saxlayın. node_modules/.next/.git/.vercel və şəxsi .env faylları paketdə yoxdur. Lokal dev serveri yenidən başladın. Monitor çərçivəsi yeni versiyada göstərilmir.
