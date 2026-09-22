# ROADMAP — Clothing Business Platform

> آخر تحديث: 2026-09-20 · الإصدار المرجعي: ما بعد Phase 15 (Backend) و Phase 14 (Frontend)
> هذه الوثيقة ملخّص تنفيذي لما بُني، وجرد الملاحظات القائمة، وخطة الاستمرار بالترتيب حسب القيمة والاعتماديات.

---

## 1) خط الأساس — ما هو مكتمل ومُتحقَّق

### Backend
- **Auth/RBAC**: جلسات HMAC-Cookie، أدوار→صلاحيات، حالات حساب (PENDING/ACTIVE/SUSPENDED/LOCKED/ARCHIVED)، قفل تسجيل الدخول + كتابة AuditLog.
- **Catalog**: Product/Variant/Category/Warehouse/InventoryItem (عدّادات on-hand/reserved لكل مخزن) — قراءة عامة + قراءة إدارية داخلية.
- **Cart/Orders**: حجز عند السلة، إنشاء طلب معاملي (تحويل السلة)، انتقالات العميل (DRAFT→PENDING_PAYMENT، إلغاء ≤24h)، حارس منع الازدواج.
- **Payments**: دفعة PENDING تلقائياً مع الطلب، تسجيل النتيجة (APPROVED/REJECTED) + استهلاك/تحرير الحجز في نفس المعاملة.
- **Notifications**: نموذج + تفضيلات لكل نوع + مسارات (قائمة/غير مقروء/تعليم/الكل) + إصدار من دورة الطلب/الدفع.
- **Admin reads**: موظفون (قراءة فقط)، أدوار + مصفوفة صلاحيات، مخزون (قراءة فقط)، تقارير (مبيعات/منتجات/عملاء/مدفوعات/مخزون بفترات).

### Frontend
Shell متجاوب + Login + Dashboard (عميل/موظفين) + Products (قائمة/تفاصيل + إضافة للسلة) + Cart + Checkout + Orders (قائمة/تفاصيل + إلغاء/إرسال) + Account + Inventory + Payments + Employees/Roles (قراءة) + Reports.

### التحقق الحالي
TypeScript/ESLint/Build/Prisma validate: **PASS** · 6/6 migrations مطبّقة · اختبارات آلية: **غير موجودة** · التحقق الوظيفي عبر 100+ فحص HTTP فعلي موثّق في تقارير المراحل.

---

## 2) الملاحظات القائمة (Known Issues)

### أولوية عالية — تؤثر على الاستمرارية
| # | الملاحظة | الأثر | المقترح |
|---|---|---|---|
| 1 | **لا اختبارات آلية** | كل تطوير جديد يعتمد على فحوص يدوية | إطار Vitest + اختبارات الخدمات الحرجة (حجز/طلب/دفع/تفويض) |
| 2 | **قاعدة تطوير مؤقتة** (prisma dev/pglite) | انقطاعات عابرة + قيود proxy (pgbouncer، لا shadow DB) | التحول إلى Postgres عبر docker-compose الموجود |
| 3 | **لا انتهاء صلاحية للحجوزات** | سلة/طلب متروك يحتجز مخزوناً بلا سقف | سياسة expiry موثّقة + مهمة خلفية |
| 4 | **انحراف موثّق**: الاستهلاك عند إنشاء الطلب بدل التأكيد | الإلغاء لا يحرّر شيئاً؛ لا سجل حركات | إعادة نظر: StockMovement ledger أو الإبقاء بقرار صريح |

### محجوبة بالـBackend (الواجهة جاهزة/جزئية والباقي مفقود)
| # | النطاق | المفقود |
|---|---|---|
| 5 | Products | CRUD كامل (إنشاء/تعديل/أرشفة/variants)، بحث/فلترة/ترتيب، `total`، صور، تسعير جملة/حسب تصنيف |
| 6 | Categories | لا API إطلاقاً (النموذج موجود) |
| 7 | Inventory | لا تعديلات/لا StockMovement/لا سجل حركات |
| 8 | Addresses | لا نموذج ولا API (أساس التوصيل) |
| 9 | Delivery | لا نموذج ولا حالات ولا رسوم |
| 10 | Payments | اختيار طريقة الدفع، رفع إيصال، تعليمات بنكية، حقول تاريخ/مرجع/سبب رفض |
| 11 | Notifications | واجهة مركز الإشعارات (الـBackend جاهز)، قنوات (email) |
| 12 | Profile | كتابة الاسم/الجنس/الميلاد/الموافقة (القراءة متاحة) |
| 13 | Signup | لا تسجيل ذاتي إطلاقاً |
| 14 | Employees/Roles | مسارات الإدارة (إنشاء/تعديل/تعيين) — العرض للقراءة فقط |
| 15 | Audit log | لا endpoint ولا صلاحية `audit.view` |

### ثانوية
- تعارض تسمية الصلاحيات: الوثائق `users.*`/`roles.manage` مقابل الكود `employees.*`/`roles.*`.
- `endpoints.md` يذكر مسارات غير منفَّذة (auth/users/categories/inventory) — يحتاج توفيقاً.
- صفحة not-found داخلية تعيد 200 (بثّ Next) — الواجهة صحيحة.
- اختبار التزامن متعدد الاتصالات لم يتم (قاعدة محلية أحادية الاتصال).
- `readmeme.txt` غير متتبَّع في جذر المستودع (ليس من عملي).
- أعمال عدة مراحل **غير مُلتزمة في git** — يلزم الالتزام.

---

## 3) خريطة الطريق

### المرحلة A — التثبيت والأساس *(الأولوية القصوى)*
- **A1**: نقل التطوير من pglite إلى Postgres حقيقي (`brew install postgresql@16`) + `prisma migrate deploy` + `.env`. **مبرر مقيس**: خادم `prisma dev` الحالي يقبل **9 اتصالات متزامنة كحد أقصى** (العاشر يفشل بـ`Can't reach database server`)، ما يسبب سقوطه المتكرر أثناء تشغيل الاختبارات/الخادم/Studio معاً — بينما Postgres الحقيقي يسمح بـ100. يفتح أيضاً `psql` وH1.
- **A2 (✅ منجز)**: إطار اختبارات Vitest (`npm test`) — 27 اختباراً مقابل قاعدة التطوير: `tests/unit/format.test.ts` (8)، `tests/integration/cart.test.ts` (10: ثوابت الحجز 0≤reserved≤onHand، 409/400/404)، `tests/integration/orders.test.ts` (9: دورة الطلب DRAFT→PENDING_PAYMENT→CONFIRMED، نتيجة الدفع/الاستهلاك، بوابات التفويض).
- **A3 (✅ منجز)**: `countProducts()` + `total` في استجابة `GET /api/products` (مع عرض "X of Z" في `/products`)؛ إعادة كتابة `docs/06-api/endpoints.md` (المُنفَّذ فعلياً + قائمة GAP) و`docs/04-security/roles-and-permissions.md` (24 كود صلاحية مطابقة لـ`PERMISSIONS`) وتصحيح `authorization.md`.
- **A4 (✅ منجز)**: التزامات منطقية بعد كل مرحلة (كود/اختبارات/وثائق) — الالتزامات e5e11bb, 45e2f7c, 1cfecbc (A2), 73c5bf1, a788256 (A3), ffe4e5f, 2743a54 (B1).

### المرحلة B — إكمال تجربة الشراء للعميل *(واجهة فقط — الـBackend جاهز)*
- **B1 (✅ منجز)**: مركز الإشعارات: جرس + عدّاد غير مقروء في الـShell (`NotificationBell`)، صفحة `/notifications` (قائمة + ترقيم + تعليم مقروء/الكل عبر Server Actions)، واختبارات خدمة (`tests/integration/notifications.test.ts`).
- **B2 (✅ منجز)**: قسم Preferences في `/account`: اللغة/التوقيت/موافقة التسويق عبر Server Actions (نفس خدمة `GET/PUT /api/account/preferences`) + مفاتيح تفضيلات الإشعارات لكل نوع، مع اختبارات الخدمة (`tests/integration/account-preferences.test.ts`).
- **B3 (✅ منجز)**: بعد «Submit for payment» تظهر لوحة تأكيد «Submitted for payment» بروابط مباشرة لحالة الطلب وكل الطلبات، وكتلة تنبيه «بانتظار الدفع» على صفحة الطلب أثناء `PENDING_PAYMENT`.

### المرحلة C — إدارة الكتالوج (Backend ثم واجهة)
- **C1 (✅ منجز)**: مسارات الكتابة `POST/PUT/DELETE /api/products` و`POST/PUT/DELETE .../variants` بصلاحيات `products.create/update/delete` (تحقق كامل + 409/404/400/403/401)، بحث/فلترة/ترتيب في `GET /api/products` (`q`/`category`/`sort`)، أرشفة = `status = ARCHIVED`. متبقٍ من C: واجهة الإدارة (C2) وAPI التصنيفات (C3).
- **C2 (✅ منجز)**: واجهة إدارة الكتالوج: `/products/new` و`/products/[id]/edit` (نموذج منتج + مدير متغيّرات بإضافة/تعديل/أرشفة) + مدير التصنيفات + فك زرّي «Add product»/«Edit product» المعطّلين، وفلترة/ترتيب/بحث فعلية مع فلتر حالة للموظفين فقط (`GET /api/products?status=` يتطلب `products.view`).
- **C3 (✅ منجز)**: `GET /api/categories` (نشطة فقط علناً، و`includeInactive=1` بصلاحية `products.view`)، `POST /api/categories` (`products.create`)، `PUT /api/categories/:id` (`products.update`)، مع اختبارات وتحقق HTTP.

### المرحلة D — العملاء والحسابات
- **D1 (✅ منجز)**: `GET/PUT /api/account/profile` (خدمة مملوكة للعميل، تحقق كامل: اسم/جنس/تاريخ ميلاد + منع المستقبل) + نموذج تعديل الملف في `/account` وفك زر «Edit profile» المعطّل. (موافقة التسويق تُدار من قسم Preferences.)
- **D2 (✅ منجز)**: `GET /api/customers` (بحث بالاسم/الكود/الإيميل/الهاتف + ترقيم) و`GET /api/customers/:id` (الملف + آخر 10 طلبات) بصلاحية `customers.view`، وصفحتا `/customers` و`/customers/[id]` + بند تنقّل «Customers» يظهر لأصحاب الصلاحية فقط. قراءة فقط (الإدارة لاحقاً).
- **D3**: Sign up + تحقق البريد (يتطلب مزوّد بريد — قرار بنية).

### المرحلة E — المخزون التشغيلي
- **E1 (✅ منجز)**: نموذج `StockMovement` + migration مطبَّقة، تعديلات يدوية (`POST /api/inventory/adjustments` بصلاحية `inventory.adjust`، حماية عدم النزول تحت المحجوز) وقراءة السجلّ (`GET /api/inventory/movements`)، وربط مسارات السلة/الدفع لتسجيل `RESERVATION`/`RELEASE`/`CONSUMPTION` داخل نفس المعاملة.
- **E2 (✅ منجز)**: سياسة انتهاء الحجوزات كنص سكربت خلفي `npm run expire-reservations` (نافذة `RESERVATION_TTL_HOURS` افتراضياً 48 سا، `--older-than-hours/--dry-run/--json/--quiet`): السلة الخاملة → `ABANDONED` + إفراج الحجز + كتابة `RELEASE` في السجلّ. مُتحقق باختبارات + تشغيل فعلي. التسجيل عبر cron موثّق في `docs/10-development/development-workflow.md`.
- **E3 (✅ منجز)**: واجهة `/inventory` بقت تفاعلية للمصرّح لهم (`inventory.adjust`): نموذج تعديل inline لكل صف (سالب/موجب + سبب) عبر Server Action بنفس خدمة E1، + جدول «Stock movements» بآخر 20 حركة (النوع/التغيير/الرصيد بعد/السبب/التاريخ) لصلاحية `inventory.view`.

### المرحلة F — التوصيل والتنفيذ
- **F1 (✅ منجز)**: نموذج `Address` + migration، CRUD للعناوين الذاتية (`/api/account/addresses`، أول عنوان افتراضي تلقائياً، حذف مؤقت) وواجهتها في `/account`، وربط الطلب بالعنوان مع **snapshot غير قابل للتغيير** (`Order.addressId` + `deliveryAddress`) ومنتقي عنوان في `/checkout` وعرضه في صفحة الطلب.
- **F2 (✅ منجز)**: نموذج `Delivery` (+migration) بحالات `PENDING→PROCESSING→READY→SHIPPED→DELIVERED` و`CANCELLED`، يُنشأ تلقائياً عند تأكيد الدفع ويُلغى مع إلغاء الطلب، مع `carrier`/`trackingNumber` (إلزاميان للشحن) وأختام `dispatchedAt`/`deliveredAt` وسجلّ تدقيق لكل تغيير. صلاحية **`shipping.manage`** أُضيفت رسمياً (25 كوداً الآن)، ومسارات `/api/deliveries` + صفحة `/deliveries` للتجهيز + قسم Delivery في صفحة الطلب.
- **F3 (✅ منجز)**: نوع إشعار جديد `DELIVERY` (+migration) يُرسَل للعميل عند كل تغيّر حالة في التوصيل (مع الناقل/التتبع في النص)، و**تفعيل تفضيلات الإشعارات فعلياً**: `createNotification` بقى يحترم `inApp` لكل نوع (كانت مخزّنة وغير مفعّلة)، وواجهتا الإشعارات/التفضيلات تعرضان النوع الجديد.

### المرحلة G — الدفع الحقيقي
- **G1**: اختيار طريقة الدفع عند الطلب (COD/تحويل) — الحقل والتعداد موجودان.
- **G2**: تعليمات التحويل + رفع الإيصال (يحتاج قرار تخزين ملفات) + تدفّق التحقق للموظفين (بديل المحاكاة) بصلاحيات `payments.verify/approve/reject`.
- **G3**: الاسترداد كحدث مالي منفصل عند المرتجعات.

### المرحلة H — تحصين وتشغيل
- **H1**: اختبار تزامن متعدد الاتصالات على Postgres حقيقي (حارسات الحجز).
- **H2 (✅ منجز)**: Rate limiting نافذي على الدخول (5 محاولات/15د لكل معرّف + 20/15د لكل عميل عبر `src/lib/rate-limit.ts`، مع 429/`RATE_LIMITED` و`retryAfterSeconds`، وتصفير النافذة عند نجاح الدخول — فوق قفل الحساب الموجود) + Security headers كاملة في `next.config.ts` (CSP/no‑sniff/X‑Frame‑Options/Referrer‑Policy/Permissions‑Policy/COOP/HSTS في الإنتاج) وإخفاء `X-Powered-By`.
- **H3**: مراقبة أخطاء إنتاج + سجلّ منظم.

### المرحلة I — الفروع والموزّعون وإدارة الحسابات *(متفق عليها مع صاحب العمل 2026-09-22)*

**قرارات صاحب العمل**
- نوع حساب ثالث: **الموزّع** — له دخول، يبيع للعميل مباشرة من الفرع، ويشوف مبيعاته (اليوم/الشهر)، المتبقي عنده، النواقص، والأكثر طلباً.
- كل الفروع لها **مستودع واحد حالياً = المصنع**.
- **الأدمن يتحكم في كل شيء من الواجهة**.

**الخطوات**
- **I1 (✅ منجز)**: كيان `Branch` (+migration) و`Warehouse.branchId`، صلاحيات `branches.view/manage` و`users.view/manage` (أصبحت 29 كوداً)، وخدمة ومسارات `/api/branches` (CRUD + إسناد/فصل المستودعات)، ومصنع مسجَّل كفرع `FACTORY` مربوط بمستودع `MAIN`.
- **I2**: ربط الموظف/الموزّع بفرعه + **عزل القراءات بالفرع** (مخزون/طلبات/توصيل/تقارير).
- **I3**: **لوحة الأدمن** — إنشاء/تعديل/تعطيل حسابات (موظف/عميل/موزّع) + تعيين الأدوار + إعادة كلمة المرور + إدارة الفروع، كلها من الواجهة.
- **I4**: الموزّع ونقطة البيع — `DISTRIBUTOR` كنوع حساب + بروفايل، وطلب قناة `POS` على فرعه بدفعة `CASH` معتمدة تُستهلك المخزون فوراً (مع عميل نقدي لكل فرع).
- **I5**: لوحة الموزّع — مبيعات اليوم/الشهر، مخزون فرعه، النواقص، الأكثر طلباً.
- **I6**: تقارير وإشعارات واعية بالفرع.

**قرارات تصميم اتخذها المنفّذ (قابلة للتعديل في أي وقت)**
- العلاقة `Branch 1—* Warehouse`: اليوم يُربط المصنع بالفرع المركزي، ومتى احتجت عزل مخزون فرع تماماً تُنشأ له مستودعاته الخاصة — النموذج يدعم الحالتين.
- «الموزّع» **نوع حساب** وليس تصنيف عميل (التصنيف يبقى للأعمال: جملة/تجزئة…).
- طلبات نقطة البيع تُنشأ `CONFIRMED` مباشرة مع دفعة كاش معتمدة في نفس المعاملة (نقطة البيع لا تنتظر تحقق).

### تبعيات مهمة
- **Addresses → Delivery → الشحن** (F1 قبل F2).
- **Payment methods → إزالة المحاكاة** (G2 قبل إيقاف simulation).
- **الاختبارات (A2) قبل أي refactor كبير**.

---

## 4) القرارات المفتوحة (تحتاج توجيه)
1. نموذج استهلاك المخزون: الإبقاء على «الاستهلاك عند الإنشاء» أم الانتقال إلى «الاستهلاك عند التأكيد» (الموثّق)؟
2. تسمية صلاحيات الموظفين: `employees.*` (الكود) أم `users.*` (الوثائق)؟
3. `audit.view`: هل نبني واجهة سجل التدقيق ونضيف الصلاحية؟
4. سياسة انتهاء الحجوزات (مدة؟ إشعار؟).
5. لغة الواجهة: الإنجليزية الحالية أم عربي/ثنائي؟
6. استضافة الملفات (إيصالات الدفع/صور المنتجات): تخزين محلي أم خدمة خارجية؟

---

## 5) سجل المراحل المنجزة (للمرجعية)
- Phase 1: Shell + Auth UI · Phase 2: Products list · Phase 3: Product details + inventory · Phase 4: Cart/Checkout · Phase 5: Orders UI · Phase 6: Account · Phase 7: Catalog audit · Phase 8: Inventory (staff) · Phase 9: Cart/Checkout audit · Phase 10: Payments queue · Phase 11: Operations dashboard · Phase 12: Employees/Roles (read) · Phase 13: Notifications/Settings audit · Phase 14: Reports · Phase 15 (Backend): Notifications/Preferences · Phases 12–14 fixes: cart reservation realignment, `orders.manage` decisions, DRAFT transitions.
