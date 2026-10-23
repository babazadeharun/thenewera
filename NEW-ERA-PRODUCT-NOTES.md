# NEW ERA — İstifadəçi təcrübəsi yenilənməsi · 22 oktyabr 2026

Əvvəlki Release Fixes yenilənməsinin üzərinə tətbiq olunur. Yeni DB modeli, miqrasiya və ya npm asılılığı əlavə olunmur. Əvvəlki təhlükəsizlik miqrasiyası tətbiq edilmiş olmalıdır.

## Dəyişən istifadə yolları

- Ana səhifə: məqsədə görə üç giriş, daha konkret standart alt mətn. Adminin fərdiləşdirdiyi hero mətni saxlanılır.
- `/contact`: ad, e-poçt/telefon, ehtiyac və əlaqə razılığı ilə qeydiyyatsız müraciət. Satış CRM-də `WEBSITE_QUICK_REQUEST` mənbəsi ilə yeni satış və aktiv adminlərə daxili bildiriş yaranır. Dublikat sorğu, ziddiyyətli eyni açar, sorğu ölçüsü və davamlı sorğu limiti yoxlanır. Məktub avtomatik göndərilmir; CRM-də müraciətlərə komanda baxmalıdır.
- `/start-project`: qonaq üçün qısa müraciət; müştəri hesabı üçün əvvəlki ətraflı brif saxlanılır. Giriş vəziyyəti serverin `/api/auth/me` cavabı ilə müəyyən edilir.
- `/workspace`: qonağa açıq məhsul təqdimatı; giriş etmiş istifadəçiyə əvvəlki şirkət seçimi. `/workspace?intro=1` təqdimatı hər kəsə göstərir. Başlama keçidi mövcud giriş və təsdiq axınını istifadə edir.
- `/workspace/demo`: real API-yə yazmayan interaktiv nümunə. Müştəri, satış, dəvət, növbəti əlaqə və tapşırıq addımları; sıfırlama. Səhifə yenilənəndə nümunə dəyişiklikləri sıfırlanır.
- Açıq planlar yalnız adminin dərc etdiyi faktiki CrmPlan qeydlərindən alınır. Tarif yoxdursa qiymət uydurulmur. Modeldə ödəniş dövrü saxlanmadığına görə aylıq/illik vəd verilmir, aktivləşdirmə zamanı təsdiq tələb olunur. 1 ay sınaq, avtomatik tutulmanın olmaması və müddət bitəndə baxış qaydası izah edilir. İnteqrasiyalar demo vasitəsilə real qoşulmuş kimi göstərilmir.
- Workspace İcmal: Bakı vaxtı ilə əlaqə vaxtı çatmış satışlar (keçmiş tarixlər daxil), gecikmiş tapşırıqlar, cavabsız yazışmalar, qalıq məbləğlər və qərar gözləyən təkliflər. Kartlar özlərinə aid real qeydləri səhifələyir; qeyd mövcud redaktorda açılır. Qərar gözləyən köhnə təklif versiyaları sayılmır. Qalıq yalnız görünən satış və görünən qeydə alınmış ödənişlərdən hesablanır, bank balansı deyil. Valyutalar birləşdirilmir.
- Satış redaktorunda ayrıca növbəti əlaqə vaxtı və razılaşdırılmış ödəniş tarixi var. Bunlar əvvəlki gözlənilən bağlanma tarixini əvəz etmir. Boş tarix məcbur deyil; tarix təyin edilməmiş satış “əlaqə vaxtı çatıb” sayılmır.
- İlk addımlar siyahısı görünən, saxlanmış müştəri/satışlara və aktiv komanda/dəvətlərə əsaslanır. Excel/CSV importu mövcud bölməyə aparır. Tamamlanma düyməyə klik etməklə saxtalaşdırılmır. Müştəri əlavə et, satış yarat və növbəti əlaqə addımı müvafiq bölmələrdə edilir.
- Hesabatlar əvvəlki Hesabatlar bölməsində qalır. Şirkət və OWN/TEAM/ALL icazələri hər gündəlik siyahıda tətbiq olunur.
- Portfolio admini: problem, görülən iş, müddət, nəticə, sübut linki və konsept işarəsi. Məlumatlar mövcud media metadatasında saxlanılır. Mövcud layihələrə rəqəm və ya nəticə uydurulmur. Boş sahə “hələ paylaşılmayıb” kimi göstərilir. Ehtiyat nümunələr açıq “Konsept layihə” kimi işarələnir. Real nəticəni siz daxil etməlisiniz.
- `/admin/product-insights`: yalnız Super Admin üçün son 30 gündə veb müraciətləri, yeni şirkətlər, gündəlik ekranı açmış şirkətlər, ən azı iki ayrı gündə qayıdan istifadəçilər və ilk addımlar. Daxili menyuda “Məhsul istifadəsi”. Yeni istifadə ölçümü bu yenilənmədən sonra başlayır. Dəstək baxışları sayılmır. Ziyarətçi trafik ölçümü olmadığına görə müraciət konversiyası uydurulmur.

## İşə saldıqdan sonra

1. Super Admin → Portfolio bölməsində real işlərin problem, görülən iş, müddət və təsdiqlənən nəticələrini daxil edin. Konseptləri işarələyin. Müştəri rəyi və paylaşım icazəsini real müştəridən alın.
2. Workspace tariflərini admin panelində dəqiqləşdirin. Hazırkı modeldə tarif dövrü sahəsi yoxdur; aktivləşdirmədən əvvəl qiymət, dövr və şərtləri müştəri ilə təsdiqləyin.
3. Müraciətlərə cavab verəcək məsul şəxsi təyin edin. İstəsəniz `CONTACT_RESPONSE_TEXT` Vercel dəyişənində real cavab müddəti və komanda adını adi mətnlə yazın. Yeni dəyişən məcburi deyil; dəyişdikdə yenidən deploy edin.
4. `/contact` mənbəli müraciətə cavab verəndə Satış CRM-də məsul şəxsi və növbəti addımı təyin edin. Məlumatın silinməsi istənərsə həmin CRM qeydi və əlaqəli daxili bildirişləri də yoxlayın.
5. Aşağıdakı istifadə sınağını 3–5 real şirkətlə həyata keçirin. Bu paket real şirkətlərlə sınağın aparıldığını iddia etmir.

## Sınaq qeydləri

Avtomatlaşdırılmış inteqrasiya sınağı müvəqqəti PostgreSQL-də işləyir. Canlı DB və real məktub göndərişi istifadə edilmir. DOM sınağı real brauzer və iPhone vizual yoxlamasını əvəz etmir. Windows installer PowerShell-də ayrıca icra edilməyib; bütün faylların hash və paket bütövlüyü yoxlanıb.
