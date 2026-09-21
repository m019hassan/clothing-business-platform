سؤال مهم — أتحقق أولاً من الاصطلاح الموجود في المشروع (هل هناك آلية seeding معتمدة؟):
لا يوجد حالياً أي ملف لإضافة المستخدمين (لا seed ولا API تسجيل) — الحسابات أُنشئت بسكربتات مؤقتة. أفضّل أن أضيف لك المكان الصحيح: سكربت seed رسمي:
السكربت يعمل. أتحقق أن الحساب الجديد يسجّل دخولاً فعلاً:
ما كانش فيه أي ملف لإضافة المستخدمين أصلاً (لا seed ولا API تسجيل) — كانوا بيتعملوا بسكربتات مؤقتة. عملتلك المكان الصحيح:

## الملف: `prisma/seed.mjs` + أمر `npm run seed`

**إضافة عميل:**
```bash
npm run seed -- --email mona@example.com --password "Mona12345" --type customer --first Mona --last Saleh
```

**إضافة موظف (بدور له صلاحيات):**
```bash
npm run seed -- --email staff@example.com --password "Staff12345" --type employee --first Ali --last Hassan --role order_manager
```

**أوامر مساعدة:**
```bash
npm run seed -- --list                                              # عرض كل الحسابات
npm run seed -- --email x@example.com --password "NewPass123" --update-password   # تغيير باسورد حساب موجود
```

### تفاصيل مهمة

- **الجوال**: مطلوب في المخطط وفريد — السكربت يولّده تلقائياً لو ما حددته، أو حدده بـ`--phone +9665...`.
- **الشروط**: الباسورد ≥ 8 أحرف، البريد صيغته صحيحة، ويُشفَّر bcrypt عند الحفظ (ما يُخزَّن أبداً كنص).
- **الموظف**: يُنشأ بدون أي صلاحية حتى تربطه بدور؛ `--role <code>` يربطه بدور موجود. الأدوار والصلاحيات نفسها في جداول `Role`/`Permission` (القائمة المعتمدة في `modules/auth/application/permissions.ts`، ومنها `orders.cancel` و`orders.manage` و`payments.verify`…).
- **حماية التكرار**: لو البريد/الجوال موجود، السكربت يرفض ويقول لك استخدم `--update-password`.

### تحقّق فعلي (مش كلام نظري)

أنشأت حساباً تجريبياً `demo.user@example.com` / `Demo12345` → **سجّل دخول بنجاح (303 + جلسة) ووصل للـdashboard**، ورسالة التكرار ظهرت عند إعادة المحاولة بنفس البريد.

### وين باقي الأجزاء المتعلقة

- نماذج البيانات: `prisma/schema.prisma` (Account / CustomerProfile / EmployeeProfile / Role / Permission).
- منطق الدخول والجلسات: `modules/auth/`.
- **لا يوجد تسجيل ذاتي (Sign up) بعد** — لو عايزه، أقدر أضيفه كشريحة جديدة (صفحة + endpoint) بقواعد صحة واضحة.



cd /Users/mohammedhassan/My-Work/clothing-business-platform

# عميل جديد
npm run seed -- --email X@example.com --password 'Pass12345!' --type customer \
  --phone +966555100003 --first Ahmed --last Ali --classification RETAIL

# موظف جديد + دور
npm run seed -- --email Y@example.com --password 'Pass12345!' --type employee \
  --phone +966555100004 --first Sara --last Mostafa --department OPS --role order_manager

# تغيير كلمة مرور حساب موجود
npm run seed -- --email X@example.com --password 'NewPass123!' --update-password

# قائمة كل الحسابات
npm run seed -- --list
