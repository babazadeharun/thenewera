# New Era — mobil ana səhifə adaptasiyası

Mobil referansın header, hamburger menyusu, alt-alta CTA və aşağıda portal şəkli kompozisiyası mövcud ana səhifəyə tətbiq edildi. Mövcud 760px breakpoint istifadə edildi. Mətnlər, CMS hero/video mənbələri, xidmətlər, bütün mövcud linklər və Biznes Audit keçidi saxlanıldı. Desktop məzmunu dəyişdirilmədi. Referansdakı fərqli mətn və CRM CTA üçün yeni məzmun və ya istiqamət tətbiq edilmədi.

## Bu tapşırıqda dəyişən fayllar
- `app/page.tsx`: mobil menyu komponenti və scoped CSS importu; əsas nav üçün aria-label.
- `app/components-home-mobile-menu.tsx` (yeni): yalnız mobil görünən native details menyu; mövcud nav linkləri, hesab istiqaməti, Escape və keçid seçildikdə bağlanma.
- `app/home-mobile-reference.css` (yeni): yalnız `.glassHome` və `max-width:760px` daxilində layout, header, hero, şəkil crop, düymə, xidmət kartları və aşağı bölmələrin oxunaqlılığı.
- `MOBILE-REFERENCE-CHANGES.md` (bu hesabat).

## Yoxlama
- Dəyişiklikdən əvvəl və sonra 1440px desktopun tam səhifə screenshotları piksel səviyyəsində eynidir; mövcud DOM elementlərinin ölçüləri və yoxlanmış CSS dəyərləri eynidir.
- 320, 360, 390, 430, 760, 761, 810 və 1024px: üfüqi daşma yoxdur.
- Mobil menyu açılma və Escape ilə bağlanma yoxlaması keçdi. Native summary klaviatura ilə işləyir; mövcud keçidlər saxlanıldı.
- Brauzerdə runtime xətası qeydə alınmadı.
- `node node_modules/typescript/bin/tsc --noEmit` keçdi.
- `npm run build`: kompilyasiya və type yoxlaması keçdi; `/events` prerender zamanı mövcud PostgreSQL serverinə bağlantı alınmadı. Build tam tamamlanmadı.
- Git deposu mövcud deyil; heç bir köhnə fayl bərpa edilmədi. Əvvəlki admin/public işləri saxlanıldı. API, Prisma schema, məlumat axını, digər route stilləri dəyişdirilmədi.

## Quraşdırma
ZIP node_modules, .next və şəxsi .env fayllarını daxil etmir. Mövcud `.env` / `.env.local` fayllarını yeni `new-era` qovluğuna köçürün, asılılıqları quraşdırın və normal layihə əmrlərini işlədin. Deploy və Git əməliyyatları edilmədi.
