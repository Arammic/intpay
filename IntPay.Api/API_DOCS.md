# IntPay API v1 Documentation

Base path: `/api/v1`

هذا التوثيق مطابق لبنية المشروع الحالية في `Endpoints/V1` وملفات الـ DTOs داخل `supabase`. جميع الأمثلة تستخدم أسماء الحقول بصيغة JSON الافتراضية في ASP.NET Core، أي `camelCase`.

في بيئة **Development** يعمل التالي:

- **`MapOpenApi()`** يولّد JSON تلقائيًا (مثلًا تحت مسار `/openapi/v1.json`) ولا يحتوي عادةً على الأمثلة `examples` الطويلة من الملف اليدوي.
- **`docs/openapi-v1.yaml`** يُعرَض كما هو من المسار **`/openapi/intpay-v1.yaml`**، و**Scalar** مضبوط عبر `WithOpenApiRoutePattern` ليقرأ هذا المسار، فيظهر الوصف الكامل والأمثلة كما في YAML.
- للتحقق: افتح `https://localhost:<port>/openapi/intpay-v1.yaml` (أو العنوان الذي تستخدمه) وتأكد أن الملف يُحمَّل، ثم افتح **`/scalar`**.

يُفضّل إبقاء `docs/openapi-v1.yaml` متوافقًا مع `Endpoints/V1` عند تغيير المسارات.

## قواعد عامة

### نموذج الأمان الحالي

- النظام لا يستخدم JWT/session authentication حاليًا.
- أغلب المسارات المحمية تعتمد مؤقتًا على `userId` أو `profileId` أو `actingUserId` كحد أمان على مستوى الطلب.
- يمكن الوصول إلى بيانات البطاقة أو القصد `intent` فقط إذا كان المستخدم هو المرسل `creator_id` أو المستلم `receiver_id`.
- عند عدم السماح بالوصول ترجع بعض المسارات `403 Forbidden`.
- عند عدم وجود المورد ترجع بعض المسارات `404 Not Found`.

### شكل الاستجابة العام

أغلب مسارات القراءة والتحديث ترجع:

```json
{
  "success": true,
  "message": "Operation message.",
  "data": {},
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-05-01T02:00:00.0000000+00:00"
  }
}
```

**استثناء واحد مهم:** `POST /intents/create` يرجع **`data`، `message`، `status`** فقط (HTTP 201) **بدون** `success` و**بدون** `meta` — باقي مسارات v1 في `Endpoints/V1` للنجاح ترجع `success` و`meta` بنفس شكل `Meta` (بما في ذلك `GET /profiles/{id}` ومسارات البطاقات بعد توحيد المغلف).

### شكل الأخطاء

أخطاء التحقق أو المنع غالبًا ترجع:

```json
{
  "success": false,
  "message": "Error message."
}
```

أخطاء `Results.Problem` ترجع بشكل Problem Details:

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Error detail."
}
```

أخطاء binding للـ query parameters يتم التقاطها في `Program.cs` وترجع:

```json
{
  "success": false,
  "message": "Invalid query parameter value.",
  "detail": "Failed to bind parameter ..."
}
```

### ملاحظة حساسة عن بيانات البطاقات

في وضع الـ MVP الحالي، بعض GET responses ترجع `cardNumber` كاملًا و`cvv` كاملًا للمستخدم المصرح له. هذا مناسب للديمو فقط، ويجب إعادة الإخفاء masking والتوثيق الحقيقي قبل الإنتاج.

### قاعدة `useTimes` المهمة

- الحقل `useTimes` في `POST /intents/create` اختياري.
- إذا لم يتم إرسال `useTimes`، أو تم إرساله كـ `null`، يعتبر النظام القيمة `unlimited`.
- التمثيل الداخلي الحالي لـ `unlimited` هو `99999`.
- لا ترسل النص `"unlimited"` في JSON لأن نوع الحقل `integer | null` وليس `string`.
- عندما تكون البطاقة unlimited يظهر في الاستجابة `useTimes: 99999` و`usesLeft: 99999` عند الإنشاء، ثم تنقص `usesLeft` فقط عند عمليات دفع approved.

## Enums والقيم شبه الثابتة

### `decision_status`

مستخدم في `audit_logs.decision`.

- `approved`: العملية تمت الموافقة عليها.
- `declined`: العملية مرفوضة.
- `info`: حدث معلوماتي غير مالي مثل إنشاء/تعديل/تجميد.

### `activity role`

**فلتر الاستعلام** `role` على `GET /users/{userId}/activities/latest` (يُطبَّع داخل الخادم قبل التصفية):

- `all` (الافتراضي عند قيمة غير معروفة أو فارغة): كل البطاقات التي يظهر فيها المستخدم كـ `creator_id` أو `receiver_id`.
- `sender`: المرسل فقط (`creator_id` = المستخدم و`receiver_id` ≠ المستخدم).
- `creator` أو `sent`: يُعاملان مثل **`sender`**.
- `receiver`: المستلم فقط (`receiver_id` = المستخدم و`creator_id` ≠ المستخدم).
- `recipient` أو `received`: يُعاملان مثل **`receiver`**.
- `self`: المرسل والمستلم نفس المستخدم على البطاقة.

**داخل عنصر** `UserActivityItem.role` (حقل الاستجابة) قد تظهر أيضًا **`participant`** عندما لا ينطبق أحد الأنماط أعلاه (حالة شاذة نادرة للبطاقة المرتبطة بالسجل).

### `activity severity`

مستخدم في `UserActivityItem.severity`.

- `success`: غالبًا عند `decision = approved`.
- `danger`: غالبًا عند `decision = declined`.
- `warning`: أحداث معلوماتية مرتبطة بقفل/تجميد/فاتورة.
- `neutral`: الحالة الافتراضية.

### `activity entity type`

مستخدم في `GET /users/{userId}/activities/latest` كفلتر استعلام `entityType` وفي كل عنصر `UserActivityItem.entityType` (قيمة مشتقة داخل الـ API).

- `profile`: أحداث محفظة مرتبطة بـ `audit_logs.user_id` بدون بطاقة (مثل `balance_added`، `balance_deducted`، `wallet_credit` عندما تظهر على التغذية).
- `intent`: أحداث حوكمة مرتبطة بالـ intent على تغذية الملف الشخصي.
- `virtual_card`: أحداث مرتبطة ببطاقة وليست محاولة دفع (`action` غير `authorization`).
- `transaction`: محاولات دفع (`action = authorization`).

### `activity outcome`

مستخدم كفلتر استعلام باسم **`status`** (لتفادي التعارض مع حالة البطاقة)، ويعاد في الاستجابة ضمن `filters.outcome` و`UserActivityItem.outcome` بعد تطبيع القيم.

- `success`: نجاح العملية (مثل `decision = approved` لعمليات الدفع، أو رصيد ناجح عندما يُمثّل كذلك).
- `failed`: فشل أو رفض (مثل `decision = declined` أو `status = failed` في السجل).
- `info`: أحداث معلوماتية (`decision = info` أو ما يعادلها).

### `relationship type` (منظور البطاقة)

مستخدم في `CardDetailsResponse.type` ضمن `IntentWithCardResponse` (قيم JSON فعلية من الخادم).

- `self`: المستخدم الحالي هو المرسل والمستلم.
- `sent`: المستخدم الحالي هو المرسل والمستلم مختلف.
- `receiver`: المستخدم الحالي هو المستلم والمرسل مختلف.

لا تُستخدم القيمة `participant` على كائن البطاقة الغني؛ تظهر فقط في `UserActivityItem.role` عند الحاجة كما في قسم `activity role`.

### `card status` (lifecycle)

`CardDetailsResponse.status` و`UserActivityItem.cardStatus` يعكسان **`virtual_cards.status`** فقط:

- `active`
- `inactive`

لا يُعرَض **intent status** عبر حقل `status` في الاستجابات الغنية؛ يبقى على جدول `intents` إذا احتجته لاحقًا من مسارات أخرى.

قيد قاعدة البيانات (بعد تطبيق الهجرة): قيمة العمود مقيدة بـ `active` أو `inactive` فقط.

يمكن تغيير دورة حياة البطاقة عبر **`POST /cards/{cardId}/lifecycle-status`** (انظر قسم البطاقات).

## أنواع البيانات المشتركة

### `ApiEnvelope<T>`

- `success` (`boolean`): هل تمت العملية بنجاح.
- `message` (`string`): رسالة مقروءة للواجهة.
- `data` (`T`): جسم الاستجابة.
- `meta` (`object`, optional): معلومات الإصدار والوقت.

### `Meta`

- `statusCode` (`integer`)
- `version` (`string`): غالبًا `v1`.
- `timestamp` (`string`, ISO-8601 UTC)

### `IntentWithCardResponse`

- `intentId` (`integer`)
- `city` (`string`)
- `country` (`string`)
- `description` (`string | null`)
- `mccList` (`MccItem[]`)
- `requiredInvoiceProve` (`boolean`)
- `card` (`CardDetailsResponse`)

### `CardDetailsResponse`

- `id` (`integer`): رقم البطاقة في قاعدة البيانات.
- `stripeId` (`string`): معرف البطاقة الخارجي/المولد.
- `createdAt` (`string`, date-time)
- `status` (`string`): **`virtual_cards.status`** — `active` أو `inactive` فقط (دورة حياة البطاقة).
- `isLockedByPendingInvoice` (`boolean`)
- `isManuallyFrozen` (`boolean`)
- `isSpendBlocked` (`boolean`): true إذا كان يوجد قفل فاتورة أو تجميد يدوي.
- `isRequestRefund` (`boolean`): true إذا سجّل المرسل أو المستلم طلب استرداد عبر `POST /cards/{cardId}/request-refund`.
- `cardNumber` (`string`): رقم البطاقة كاملًا في MVP الحالي.
- `last4` (`string`)
- `cvv` (`string`): CVV كامل في MVP الحالي.
- `expiryDate` (`string`): صيغة `MM/YY`.
- `expiryMonth` (`integer`)
- `expiryYear` (`integer`)
- `cardholderName` (`string`)
- `amount` (`number`)
- `remainingAmount` (`number`)
- `useTimes` (`integer`): إذا كانت unlimited تظهر `99999`.
- `usesLeft` (`integer`): عدد الاستخدامات المتبقية، وإذا كانت unlimited تبدأ بـ `99999`.
- `unLockedAt` (`string | null`, date-time)
- `minutesToUnlock` (`integer`)
- `hoursToUnlock` (`integer`)
- `daysToUnlock` (`integer`)
- `timeRemainingLeveled` (`string`)
- `daysLocked` (`integer`)
- `creatorId` (`integer`)
- `retrieveId` (`integer`): المستلم `receiver_id`.
- `type` (`string`): `self` أو `sent` أو `receiver`.
- `senderName` (`string | null`)

### `MccItem`

- `code` (`string`)
- `name` (`string`): اسم معروف إذا كان الكود موجودًا في `MccMapper`، وإلا `Unknown MCC`.
- `group` (`string`): مثل `Food & Drink`, `Transport`, `Shopping`, `Health`, `Services`, `Entertainment`, أو `Other`.

### `AuditLogDto`

- `id` (`integer`)
- `cardId` (`integer | null`): قد يكون null للأحداث غير المرتبطة ببطاقة.
- `transactionAmount` (`number`)
- `merchantName` (`string | null`)
- `mcc` (`string | null`)
- `decision` (`string`): `approved`, `declined`, `info`.
- `reason` (`string | null`)
- `createdAt` (`string`, date-time)
- `city` (`string | null`)
- `country` (`string | null`): حاليًا لا يأتي من `AuditLog` model إلا إذا أضيف لاحقًا.
- `externalId` (`string | null`): حاليًا لا يأتي من `AuditLog` model إلا إذا أضيف لاحقًا.
- `entityId` (`integer | null`): غالبًا intent id عند أحداث governance.
- `action` (`string | null`): مثل `authorization`, `intent_updated`, `invoice_verification`, `card_manual_freeze_set`, `refund_requested`.
- `occurredAt` (`string | null`, date-time)

### `PagedCardsResponse`

- `total` (`integer`)
- `limit` (`integer`)
- `offset` (`integer`)
- `items` (`IntentWithCardResponse[]`)

### `CardWithLogsResponse`

- `card` (`IntentWithCardResponse`)
- `logs` (`AuditLogDto[]`)

### `PagedAuditLogsResponse`

- `cardId` (`integer`)
- `total` (`integer`)
- `limit` (`integer`)
- `offset` (`integer`)
- `logs` (`AuditLogDto[]`)

### `ReceiverPagedAuditLogsResponse`

- `receiverUserId` (`integer`)
- `total` (`integer`)
- `limit` (`integer`)
- `offset` (`integer`)
- `logs` (`AuditLogDto[]`)

### `UserTransactionsResponse`

- `userId` (`integer`)
- `total` (`integer`)
- `limit` (`integer`)
- `offset` (`integer`)
- `logs` (`AuditLogDto[]`)

### `DashboardMetricsResponse`

- `userId` (`integer`)
- `totalSpentApproved` (`number`)
- `totalIntentPrincipal` (`number`)
- `totalRemainingAcrossIntents` (`number`)
- `distinctIntentCount` (`integer`)
- `distinctCardCount` (`integer`)

### `HomeSummaryResponse`

- `freeMoney` (`number`)
- `lockMoney` (`number`)
- `totalActivityCount` (`integer`)
- `selfCards` (`CardSection`)
- `receivedCards` (`CardSection`)
- `sentCards` (`CardSection`)

### `CardSection`

- `items` (`IntentWithCardResponse[]`)
- `count` (`integer`): محسوب من عدد العناصر.

### `UserLatestActivitiesResponse`

- `userId` (`integer`)
- `total` (`integer`)
- `limit` (`integer`)
- `offset` (`integer`)
- `filters` (`UserLatestActivitiesAppliedFilters`)
- `summary` (`UserLatestActivitiesSummary`)
- `items` (`UserActivityItem[]`)

### `UserLatestActivitiesAppliedFilters`

- `decision` (`string | null`)
- `action` (`string | null`)
- `entityType` (`string | null`): أحد قيم `activity entity type` عند تمرير فلتر `entityType`.
- `outcome` (`string | null`): يعكس فلتر الاستعلام `status` (تطبيع النتيجة).
- `cardId` (`integer | null`)
- `intentId` (`integer | null`)
- `fromUtc` (`string | null`, date-time)
- `toUtc` (`string | null`, date-time)
- `merchant` (`string | null`)
- `mcc` (`string | null`)
- `city` (`string | null`)
- `minAmount` (`number | null`)
- `maxAmount` (`number | null`)
- `role` (`string`)
- `includeInfo` (`boolean`)

### `UserLatestActivitiesSummary`

- `approvedCount` (`integer`)
- `declinedCount` (`integer`)
- `infoCount` (`integer`)
- `approvedSpendTotal` (`number`)
- `declinedAmountTotal` (`number`)
- `distinctCards` (`integer`)
- `distinctIntents` (`integer`)

### `UserActivityItem`

- `id` (`integer`)
- `cardId` (`integer | null`)
- `intentId` (`integer | null`)
- `action` (`string | null`)
- `decision` (`string`)
- `reason` (`string | null`)
- `transactionAmount` (`number`)
- `merchantName` (`string | null`)
- `mcc` (`string | null`)
- `city` (`string | null`)
- `createdAt` (`string`, date-time)
- `occurredAt` (`string | null`, date-time)
- `creatorId` (`integer`)
- `receiverId` (`integer`)
- `role` (`string`)
- `intentDescription` (`string | null`)
- `category` (`string | null`)
- `country` (`string | null`)
- `intentAmount` (`number`)
- `remainingAmount` (`number`)
- `cardLast4` (`string`)
- `cardStatus` (`string`)
- `isLockedByPendingInvoice` (`boolean`)
- `isManuallyFrozen` (`boolean`)
- `isSpendBlocked` (`boolean`)
- `isRequestRefund` (`boolean`): نفس علم البطاقة؛ لا يُحسب ضمن `isSpendBlocked`.
- `senderName` (`string | null`)
- `activityType` (`string`)
- `title` (`string`): عنوان قصير مُشتق من السجل؛ للدفع مع `merchantName` يكون غالبًا `Approved at {merchantName}` أو `Declined at {merchantName}`؛ لأحداث أخرى انظر منطق العناوين في `IntPayService.BuildActivityTitle`.
- `subtitle` (`string`)
- `severity` (`string`)
- `amountLabel` (`string`)
- `entityType` (`string | null`): تصنيف مشتق؛ راجع `activity entity type`.
- `outcome` (`string | null`): نتيجة مشتقة؛ راجع `activity outcome`.

## Profiles

### Get Profile

Endpoint: `GET /profiles/{id}`

الوصف: يجلب بيانات profile كاملة مع contacts ونقاط mock.

Path parameters:

- `id` (`integer`, required): رقم المستخدم.

Response type: `ApiEnvelope<ProfileFullResponse>`

`ProfileFullResponse`:

- `id` (`integer`)
- `name` (`string`)
- `username` (`string | null`)
- `email` (`string | null`)
- `vaultBalance` (`number`)
- `lockMoney` (`number`)
- `link` (`string`)
- `contacts` (`ContactSummary[]`)
- `points` (`integer`): قيمة mock عشوائية بين 4 و20.

Validation:

- `id` يجب أن يكون integer في المسار.

Errors:

- `404`: profile غير موجود.
- `400`: خطأ عام أو فشل binding.

Request example:

```http
GET /api/v1/profiles/1
```

Response example:

```json
{
  "success": true,
  "message": "Profile fetched successfully.",
  "data": {
    "id": 1,
    "name": "Mohammed Fares",
    "username": "mohammed",
    "email": "mohammed@example.com",
    "vaultBalance": 12000.0,
    "lockMoney": 2500.0,
    "link": "https://intentpay.app/u/1",
    "contacts": [
      {
        "id": 2,
        "name": "Aisha Saleh",
        "email": "aisha@example.com",
        "username": "aisha",
        "link": "https://intentpay.app/u/2"
      }
    ],
    "points": 11
  },
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-05-01T02:00:00.0000000+00:00"
  }
}
```

### Add Funds

Endpoint: `POST /profiles/{userId}/add-funds`

الوصف: يضيف مبلغًا إلى `vault_balance` للمستخدم، ويكتب audit event من نوع `wallet_credit`.

Path parameters:

- `userId` (`integer`, required): رقم المستخدم.

Body type: `AddFundsRequest`

- `amount` (`number`, required): المبلغ المراد إضافته.

Response type: `ApiEnvelope<ProfileBalanceResponse>`

Validation:

- body مطلوب.
- `amount` يجب أن يكون أكبر من صفر حسب service validation.

Errors:

- `400`: body غير موجود أو amount غير صالح.
- `404`: profile غير موجود.

Request example:

```json
{
  "amount": 500.0
}
```

Response example:

```json
{
  "success": true,
  "message": "Funds added successfully.",
  "data": {
    "id": 1,
    "name": "Mohammed Fares",
    "username": "mohammed",
    "email": "mohammed@example.com",
    "vaultBalance": 12500.0,
    "lockMoney": 2500.0
  },
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-05-01T02:00:00.0000000+00:00"
  }
}
```

### Search Profiles

Endpoint: `GET /profiles/search`

الوصف: يبحث عن profiles بالاسم باستخدام بحث case-insensitive.

Query parameters:

- `name` (`string`, required): نص البحث.

Response type: `ApiEnvelope<ProfileSearchItem[]>`

Validation:

- `name` مطلوب ولا يجوز أن يكون فارغًا.

Errors:

- `400`: `name` غير موجود أو فارغ، أو خطأ عام.

Request example:

```http
GET /api/v1/profiles/search?name=Mohammed
```

Response example:

```json
{
  "success": true,
  "message": "Found 1 profile(s) matching 'Mohammed'.",
  "data": [
    {
      "id": 1,
      "name": "Mohammed Fares",
      "username": "mohammed",
      "email": "mohammed@example.com",
      "link": "https://intentpay.app/u/1"
    }
  ],
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-05-01T02:00:00.0000000+00:00"
  }
}
```

## Home

### Get Home Summary

Endpoint: `GET /home/summary/{user_id}`

الوصف: يرجع ملخص الصفحة الرئيسية للمستخدم، بما في ذلك المال المتاح، المال المحجوز، والبطاقات مقسمة إلى self/received/sent.

Path parameters:

- `user_id` (`integer`, required): رقم المستخدم.

Response type: `ApiEnvelope<HomeSummaryResponse>`

Errors:

- `404`: المستخدم غير موجود.
- `400`: خطأ عام.

Request example:

```http
GET /api/v1/home/summary/1
```

Response example:

```json
{
  "success": true,
  "message": "Home summary fetched successfully.",
  "data": {
    "freeMoney": 9500.0,
    "lockMoney": 2500.0,
    "totalActivityCount": 12,
    "selfCards": { "items": [], "count": 0 },
    "receivedCards": { "items": [], "count": 0 },
    "sentCards": { "items": [], "count": 0 }
  },
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-05-01T02:00:00.0000000+00:00"
  }
}
```

## Intents

### Create Intent

Endpoint: `POST /intents/create`

الوصف: ينشئ intent وبطاقة افتراضية مرتبطة به عبر RPC `create_intent_with_card_atomic`.

Body type: `CreateIntentRequest`

- `creatorId` (`integer`, required): مرسل المبلغ.
- `userId` (`integer`, required): المستلم `receiver`.
- `amount` (`number`, required): قيمة intent.
- `useTimes` (`integer | null`, optional): عدد مرات الاستخدام. Default: `unlimited` عند عدم الإرسال أو عند `null`، وتمثل داخليًا بـ `99999`.
- `expiryDate` (`string | null`, optional, date-time): تاريخ انتهاء intent/card. إذا لم يرسل، تستخدم البطاقة تاريخًا بعد 3 سنوات في response.
- `country` (`string | null`, optional)
- `city` (`string | null`, optional)
- `description` (`string | null`, optional)
- `mccList` (`string[] | null`, optional): قائمة MCC مسموحة. القائمة الفارغة تعني عدم تقييد MCC.
- `firstDateToUser` (`string | null`, optional, date-time): وقت تفعيل البطاقة للمستلم.
- `requiredInvoiceProve` (`boolean | null`, optional): هل يتطلب إثبات فاتورة.

Response type: `{ data: IntentWithCardResponse, message: string, status: 201 }`

Validation:

- body مطلوب.
- `creatorId`, `userId`, `amount` تعتمد على RPC وقاعدة البيانات للتحقق النهائي.
- `useTimes` لا يقبل النص `"unlimited"`؛ اتركه غير مرسل أو أرسله `null`.

Errors:

- `400`: خطأ من RPC أو قاعدة البيانات أو body غير صالح.

Request example with unlimited default:

```json
{
  "creatorId": 1,
  "userId": 2,
  "amount": 750.0,
  "country": "SA",
  "city": "Riyadh",
  "description": "Team travel allowance",
  "mccList": ["4121", "7011"],
  "requiredInvoiceProve": true
}
```

Response example:

```json
{
  "data": {
    "intentId": 21,
    "city": "Riyadh",
    "country": "SA",
    "description": "Team travel allowance",
    "mccList": [
      { "code": "4121", "name": "Taxis & Rideshare", "group": "Transport" },
      { "code": "7011", "name": "Hotels", "group": "Transport" }
    ],
    "requiredInvoiceProve": true,
    "card": {
      "id": 31,
      "stripeId": "ic_1234567890abcdef1234",
      "createdAt": "2026-05-01T02:00:00Z",
      "status": "active",
      "isLockedByPendingInvoice": true,
      "isManuallyFrozen": false,
      "isSpendBlocked": true,
      "isRequestRefund": false,
      "cardNumber": "4111123412341234",
      "last4": "1234",
      "cvv": "123",
      "expiryDate": "05/29",
      "expiryMonth": 5,
      "expiryYear": 2029,
      "cardholderName": "Aisha Saleh",
      "amount": 750.0,
      "remainingAmount": 750.0,
      "useTimes": 99999,
      "usesLeft": 99999,
      "unLockedAt": "2026-05-01T02:00:00Z",
      "minutesToUnlock": 0,
      "hoursToUnlock": 0,
      "daysToUnlock": 0,
      "timeRemainingLeveled": "Available Now",
      "daysLocked": 0,
      "creatorId": 1,
      "retrieveId": 2,
      "type": "sent",
      "senderName": null
    }
  },
  "message": "Intent and virtual card created successfully.",
  "status": 201
}
```

### Get Intent By Id

Endpoint: `GET /intents/{id}`

الوصف: يرجع intent واحدًا مع البطاقة الغنية الخاصة به.

Path parameters:

- `id` (`integer`, required): رقم intent.

Query parameters:

- `actingUserId` (`integer`, required): المستخدم الطالب، ويجب أن يكون creator أو receiver.

Response type: `ApiEnvelope<IntentDetailResponse>`

`IntentDetailResponse`:

- `intentId` (`integer`)
- `intent` (`Intent` raw model)
- `card` (`CardDetailsResponse`)
- `rich` (`IntentWithCardResponse`)

Validation:

- `actingUserId` مطلوب ويجب أن يكون أكبر من صفر.

Errors:

- `400`: `actingUserId` غير صالح أو خطأ عام.
- `403`: المستخدم ليس creator ولا receiver.
- `404`: intent أو card غير موجود.

Request example:

```http
GET /api/v1/intents/21?actingUserId=1
```

Response example:

```json
{
  "success": true,
  "message": "Intent fetched successfully.",
  "data": {
    "intentId": 21,
    "intent": {
      "id": 21,
      "creatorId": 1,
      "receiverId": 2,
      "amount": 750.0,
      "remainingAmount": 750.0,
      "useTimes": 99999,
      "usesLeft": 99999,
      "status": "active"
    },
    "card": {
      "id": 31,
      "cardNumber": "4111123412341234",
      "cvv": "123",
      "isLockedByPendingInvoice": true,
      "isManuallyFrozen": false,
      "isRequestRefund": false,
      "isSpendBlocked": true
    },
    "rich": {
      "intentId": 21,
      "city": "Riyadh",
      "country": "SA",
      "description": "Team travel allowance",
      "mccList": [],
      "requiredInvoiceProve": true,
      "card": {
        "id": 31,
        "last4": "1234",
        "useTimes": 99999,
        "usesLeft": 99999,
        "isLockedByPendingInvoice": true,
        "isManuallyFrozen": false,
        "isRequestRefund": false,
        "isSpendBlocked": true
      }
    }
  },
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-05-01T02:00:00.0000000+00:00"
  }
}
```

### Patch Intent

Endpoint: `PATCH /intents/{id}`

الوصف: يعدل metadata فقط ولا يسمح بتعديل `amount`, `remainingAmount`, `useTimes`, `usesLeft`.

Path parameters:

- `id` (`integer`, required): رقم intent.

Query parameters:

- `actingUserId` (`integer`, required): المستخدم الطالب.

Body type: `PatchIntentRequest`

- `description` (`string | null`, optional)
- `city` (`string | null`, optional)
- `country` (`string | null`, optional)
- `category` (`string | null`, optional)
- `mccList` (`string[] | null`, optional)
- `requiredInvoiceProve` (`boolean | null`, optional)

Response type: `ApiEnvelope<IntentDetailResponse>`

Validation:

- body مطلوب.
- إذا لم يرسل أي حقل قابل للتعديل، يرجع النظام تفاصيل intent الحالية بدون تعديل.
- `actingUserId` مطلوب وأكبر من صفر.

Errors:

- `400`: body غير موجود أو `actingUserId` غير صالح.
- `403`: المستخدم غير مصرح.
- `404`: intent أو card غير موجود.

Request example:

```json
{
  "description": "Updated travel allowance",
  "city": "Jeddah",
  "mccList": ["4121", "5812"],
  "requiredInvoiceProve": false
}
```

Response example:

```json
{
  "success": true,
  "message": "Intent updated successfully.",
  "data": {
    "intentId": 21,
    "rich": {
      "intentId": 21,
      "city": "Jeddah",
      "description": "Updated travel allowance",
      "mccList": [
        { "code": "4121", "name": "Taxis & Rideshare", "group": "Transport" },
        { "code": "5812", "name": "Restaurants", "group": "Food & Drink" }
      ]
    }
  },
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-05-01T02:00:00.0000000+00:00"
  }
}
```

## Cards

### Get Card With Logs

Endpoint: `GET /cards/{cardId}`

الوصف: يرجع البطاقة الغنية مع audit logs الخاصة بها.

Path parameters:

- `cardId` (`integer`, required): رقم البطاقة.

Query parameters:

- `profileId` (`integer`, required): المستخدم الطالب. يتم قراءته كـ string ثم التحقق منه لتفادي أخطاء empty query.

Response type: `ApiEnvelope<CardWithLogsResponse>`

Validation:

- `profileId` مطلوب ويجب أن يكون integer أكبر من صفر.

Errors:

- `400`: `profileId` مفقود أو غير صالح.
- `403`: المستخدم ليس creator ولا receiver.
- `404`: البطاقة غير موجودة.

Request example:

```http
GET /api/v1/cards/31?profileId=1
```

Response example:

```json
{
  "success": true,
  "message": "Card fetched successfully.",
  "data": {
    "card": {
      "intentId": 21,
      "city": "Riyadh",
      "country": "SA",
      "mccList": [],
      "requiredInvoiceProve": true,
      "card": {
        "id": 31,
        "cardNumber": "4111123412341234",
        "last4": "1234",
        "cvv": "123",
        "useTimes": 99999,
        "usesLeft": 99999,
        "isLockedByPendingInvoice": true,
        "isManuallyFrozen": false,
        "isRequestRefund": false,
        "isSpendBlocked": true
      }
    },
    "logs": []
  },
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-05-01T02:00:00.0000000+00:00"
  }
}
```

### Get Card Audit Logs

Endpoint: `GET /cards/{cardId}/logs`

الوصف: يرجع audit logs الخاصة ببطاقة واحدة مع pagination وفلاتر بسيطة.

Path parameters:

- `cardId` (`integer`, required)

Query parameters:

- `actingUserId` (`integer`, required): creator أو receiver.
- `limit` (`integer`, optional, default `50`): يتم fallback إلى 50 إذا كان فارغًا أو غير صالح.
- `offset` (`integer`, optional, default `0`): يتم fallback إلى 0 إذا كان فارغًا أو غير صالح.
- `decision` (`string`, optional): `approved`, `declined`, `info`.
- `from` (`string`, optional, date-time)
- `to` (`string`, optional, date-time)

Response type: `ApiEnvelope<PagedAuditLogsResponse>`

Validation:

- `actingUserId` مطلوب وأكبر من صفر.
- `from` و`to` يجب أن تكون قيم date-time قابلة للربط.

Errors:

- `400`: `actingUserId` مفقود أو date غير صالح.
- `403`: المستخدم غير مصرح.
- `404`: البطاقة غير موجودة.

Request example:

```http
GET /api/v1/cards/31/logs?actingUserId=1&decision=approved&limit=20&offset=0
```

Response example:

```json
{
  "success": true,
  "message": "Audit logs fetched successfully.",
  "data": {
    "cardId": 31,
    "total": 1,
    "limit": 20,
    "offset": 0,
    "logs": [
      {
        "id": 90,
        "cardId": 31,
        "transactionAmount": 25.5,
        "merchantName": "Riyadh Taxi",
        "mcc": "4121",
        "decision": "approved",
        "reason": null,
        "createdAt": "2026-05-01T02:00:00Z",
        "city": "Riyadh",
        "entityId": 21,
        "action": "authorization",
        "occurredAt": "2026-05-01T02:00:00Z"
      }
    ]
  },
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-05-01T02:00:00.0000000+00:00"
  }
}
```

### Request Card Refund

Endpoint: `POST /cards/{cardId}/request-refund`

الوصف: يضبط `is_request_refund` على البطافة إلى `true` (عملية أحادية الاتجاه؛ متكررة بدون خطأ إذا كانت القيمة بالفعل true). لا يُعاد في الاستجابة كائن البطاقة.

Path parameters:

- `cardId` (`integer`, required)

Body type: `RequestRefundBody`

- `actingUserId` (`integer`, required): creator أو receiver.

Response: غلاف نجاح بدون `data`:

- `success` (`boolean`)
- `message` (`string`)
- `meta` (`object`): `statusCode`, `version`, `timestamp`

Validation:

- body مطلوب.
- `actingUserId` يجب أن يكون أكبر من صفر.

Errors:

- `400`: body مفقود أو `actingUserId` غير صالح.
- `403`: المستخدم غير مصرح.
- `404`: البطاقة غير موجودة.

Request example:

```json
{
  "actingUserId": 1
}
```

Response example:

```json
{
  "success": true,
  "message": "Refund request recorded successfully.",
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-05-01T02:00:00.0000000+00:00"
  }
}
```

### Set Card Manual Freeze State

Endpoint: `POST /cards/{cardId}/lock-state`

الوصف: يفعّل أو يلغي التجميد اليدوي للبطاقة فقط. لا يغير قفل الفاتورة `isLockedByPendingInvoice`.

Path parameters:

- `cardId` (`integer`, required)

Body type: `SetCardLockRequest`

- `locked` (`boolean`, required): true للتجميد، false لإلغاء التجميد.
- `actingUserId` (`integer`, required): creator أو receiver.

Response type: `ApiEnvelope<CardManualFreezeStateResponse>`

`CardManualFreezeStateResponse`:

- `cardId` (`integer`)
- `isManuallyFrozen` (`boolean`)
- `isLockedByPendingInvoice` (`boolean`)
- `isRequestRefund` (`boolean`)
- `isSpendBlocked` (`boolean`)
- `previousManualFreeze` (`boolean`)

Validation:

- body مطلوب.
- `actingUserId` يجب أن يكون أكبر من صفر.

Errors:

- `400`: body مفقود أو `actingUserId` غير صالح.
- `403`: المستخدم غير مصرح.
- `404`: البطاقة غير موجودة.

Request example:

```json
{
  "locked": true,
  "actingUserId": 1
}
```

Response example:

```json
{
  "success": true,
  "message": "Card manual freeze state updated successfully.",
  "data": {
    "cardId": 31,
    "isManuallyFrozen": true,
    "isLockedByPendingInvoice": false,
    "isRequestRefund": false,
    "isSpendBlocked": true,
    "previousManualFreeze": false
  },
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-05-01T02:00:00.0000000+00:00"
  }
}
```

### Set Virtual Card Lifecycle Status

Endpoint: `POST /cards/{cardId}/lifecycle-status`

الوصف: يضبط `virtual_cards.status` إلى `active` أو `inactive` فقط. يجب أن يكون المتصل creator أو receiver للبطاقة.

Path parameters:

- `cardId` (`integer`, required)

Body type: `SetCardLifecycleStatusRequest`

- `status` (`string`, required): `active` أو `inactive` (غير حساس لحالة الأحرف؛ يُخزَّن lowercase).
- `actingUserId` (`integer`, required): creator أو receiver.

Response type: `ApiEnvelope<CardLifecycleStatusResponse>`

`CardLifecycleStatusResponse`:

- `cardId` (`integer`)
- `status` (`string`)
- `previousStatus` (`string`)

Validation:

- body مطلوب.
- `actingUserId` يجب أن يكون أكبر من صفر.
- `status` يجب أن يكون `active` أو `inactive`.

Errors:

- `400`: قيمة status غير صالحة أو body مفقود.
- `403`: المستخدم غير مصرح.
- `404`: البطاقة غير موجودة.

Request example:

```json
{
  "status": "inactive",
  "actingUserId": 1
}
```

Response example:

```json
{
  "success": true,
  "message": "Virtual card lifecycle status updated successfully.",
  "data": {
    "cardId": 31,
    "status": "inactive",
    "previousStatus": "active"
  },
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-05-01T02:00:00.0000000+00:00"
  }
}
```

### Get Latest Card For User

Endpoint: `GET /cards/by-user/{userId}/latest`

الوصف: يرجع أحدث بطاقة مرتبطة بالمستخدم كمرسل أو مستلم.

Path parameters:

- `userId` (`integer`, required)

Response type: `ApiEnvelope<IntentWithCardResponse>`

Errors:

- `404`: لا توجد بطاقات للمستخدم.
- `400`: خطأ عام.

Request example:

```http
GET /api/v1/cards/by-user/1/latest
```

Response example:

```json
{
  "success": true,
  "message": "Latest card fetched successfully.",
  "data": {
    "intentId": 21,
    "city": "Riyadh",
    "country": "SA",
    "mccList": [],
    "requiredInvoiceProve": false,
    "card": {
      "id": 31,
      "cardNumber": "4111123412341234",
      "cvv": "123",
      "useTimes": 99999,
      "usesLeft": 99999
    }
  },
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-05-01T02:00:00.0000000+00:00"
  }
}
```

### Get Cards For User

Endpoint: `GET /cards/by-user/{userId}`

الوصف: يرجع قائمة paged لكل البطاقات التي يكون المستخدم creator أو receiver فيها.

Path parameters:

- `userId` (`integer`, required)

Query parameters:

- `limit` (`integer`, optional, default `50`, max service clamp `1000`)
- `offset` (`integer`, optional, default `0`)

Response type: `ApiEnvelope<PagedCardsResponse>`

Notes:

- `limit` و`offset` يقرآن كـ string ويستخدمان fallback عند القيم الفارغة أو غير الصالحة.

Errors:

- `400`: خطأ عام.

Request example:

```http
GET /api/v1/cards/by-user/1?limit=10&offset=0
```

Response example:

```json
{
  "success": true,
  "message": "Cards fetched successfully.",
  "data": {
    "total": 2,
    "limit": 10,
    "offset": 0,
    "items": [
      {
        "intentId": 21,
        "city": "Riyadh",
        "country": "SA",
        "mccList": [],
        "requiredInvoiceProve": false,
        "card": {
          "id": 31,
          "last4": "1234",
          "useTimes": 99999,
          "usesLeft": 99999
        }
      }
    ]
  },
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-05-01T02:00:00.0000000+00:00"
  }
}
```

## Users

### Get Dashboard Metrics

Endpoint: `GET /users/{userId}/dashboard/metrics`

الوصف: يحسب مؤشرات dashboard للمستخدم كمرسل أو مستلم.

Path parameters:

- `userId` (`integer`, required)

Response type: `ApiEnvelope<DashboardMetricsResponse>`

Errors:

- `400`: خطأ عام.

Request example:

```http
GET /api/v1/users/1/dashboard/metrics
```

Response example:

```json
{
  "success": true,
  "message": "Dashboard metrics computed successfully.",
  "data": {
    "userId": 1,
    "totalSpentApproved": 300.0,
    "totalIntentPrincipal": 2500.0,
    "totalRemainingAcrossIntents": 2200.0,
    "distinctIntentCount": 4,
    "distinctCardCount": 4
  },
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-05-01T02:00:00.0000000+00:00"
  }
}
```

### Get Latest User Activities

Endpoint: `GET /users/{userId}/activities/latest`

الوصف: يرجع تغذية نشاط مدمجة: سجلات `audit_logs` المرتبطة بالبطاقات الظاهرة للمستخدم (كمرسل أو مستلم)، مدمجة مع سجلات الملف الشخصي حيث `audit_logs.user_id` يساوي `userId` في المسار (تغييرات الرصيد في الخزنة وأحداث الحوكمة المعروضة على تغذية الملف الشخصي). تُحسب لكل عنصر حقول مشتقة `entityType` و`outcome` للواجهة والفلترة.

Path parameters:

- `userId` (`integer`, required)

Query parameters:

- `limit` (`integer`, optional, default `50`, clamped من 1 إلى 1000)
- `offset` (`integer`, optional, default `0`, أقل قيمة 0)
- `decision` (`string`, optional): قرار السجل الخام `approved`, `declined`, `info`.
- `action` (`string`, optional): مثل `authorization`, `balance_added`, `balance_deducted`, `wallet_credit`, `intent_updated`, `invoice_verification`, `card_manual_freeze_set`.
- `entityType` (`string`, optional): فلتر على التصنيف المشتق؛ راجع `activity entity type`.
- `status` (`string`, optional): فلتر على النتيجة المطبّعة؛ القيم `success`, `failed`, `info`؛ يُعاد في `data.filters.outcome` (اسم الحقل في JSON `outcome` وليس `status`).
- `cardId` (`integer`, optional)
- `intentId` (`integer`, optional)
- `from` (`string`, optional, date-time): يحول إلى UTC.
- `to` (`string`, optional, date-time): يحول إلى UTC.
- `merchant` (`string`, optional): تطابق جزئي case-insensitive على اسم التاجر؛ لصفوف الملف الشخصي يُطابق `note` أو `reason`.
- `mcc` (`string`, optional): match exact.
- `city` (`string`, optional): contains filter case-insensitive داخل الذاكرة.
- `minAmount` (`number`, optional)
- `maxAmount` (`number`, optional)
- `role` (`string`, optional, default `all`): راجع enum `activity role`.
- `includeInfo` (`boolean`, optional, default `true`): إذا false يستبعد `decision = info`.

Response type: `ApiEnvelope<UserLatestActivitiesResponse>`

Validation:

- typed binding مستخدم لهذا endpoint؛ إرسال قيمة غير قابلة للتحويل مثل `limit=abc` يرجع `400 Invalid query parameter value`.
- `limit` يتم ضبطه داخل service بين 1 و1000.
- `offset` يتم ضبطه إلى 0 إذا كان أقل من صفر.
- role غير معروف يتم التعامل معه كـ `all`.

Errors:

- `400`: query parameter غير صالح أو خطأ عام.

Request example:

```http
GET /api/v1/users/1/activities/latest?decision=approved&role=sender&merchant=Taxi&limit=20&offset=0
```

Response example:

```json
{
  "success": true,
  "message": "Latest user activities fetched successfully.",
  "data": {
    "userId": 1,
    "total": 1,
    "limit": 20,
    "offset": 0,
    "filters": {
      "decision": "approved",
      "action": null,
      "entityType": null,
      "outcome": null,
      "cardId": null,
      "intentId": null,
      "fromUtc": null,
      "toUtc": null,
      "merchant": "Taxi",
      "mcc": null,
      "city": null,
      "minAmount": null,
      "maxAmount": null,
      "role": "sender",
      "includeInfo": true
    },
    "summary": {
      "approvedCount": 1,
      "declinedCount": 0,
      "infoCount": 0,
      "approvedSpendTotal": 25.5,
      "declinedAmountTotal": 0.0,
      "distinctCards": 1,
      "distinctIntents": 1
    },
    "items": [
      {
        "id": 90,
        "cardId": 31,
        "intentId": 21,
        "action": "authorization",
        "decision": "approved",
        "reason": null,
        "transactionAmount": 25.5,
        "merchantName": "Riyadh Taxi",
        "mcc": "4121",
        "city": "Riyadh",
        "createdAt": "2026-05-01T02:00:00Z",
        "occurredAt": "2026-05-01T02:00:00Z",
        "creatorId": 1,
        "receiverId": 2,
        "role": "sender",
        "intentDescription": "Team travel allowance",
        "category": null,
        "country": "SA",
        "intentAmount": 750.0,
        "remainingAmount": 724.5,
        "cardLast4": "1234",
        "cardStatus": "active",
        "isLockedByPendingInvoice": false,
        "isManuallyFrozen": false,
        "isSpendBlocked": false,
        "isRequestRefund": false,
        "senderName": null,
        "activityType": "authorization",
        "title": "Approved at Riyadh Taxi",
        "subtitle": "Team travel allowance · Riyadh · MCC 4121",
        "severity": "success",
        "amountLabel": "$25.50",
        "entityType": "transaction",
        "outcome": "success"
      }
    ]
  },
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-05-01T02:00:00.0000000+00:00"
  }
}
```

### Get User Transactions

Endpoint: `GET /users/{userId}/transactions`

الوصف: يرجع audit logs لكل البطاقات المرتبطة بالمستخدم كمرسل أو مستلم.

Path parameters:

- `userId` (`integer`, required)

Query parameters:

- `limit` (`integer`, optional, default `50`, clamped من 1 إلى 1000)
- `offset` (`integer`, optional, default `0`, أقل قيمة 0)

Response type: `ApiEnvelope<UserTransactionsResponse>`

Errors:

- `400`: query parameter غير صالح أو خطأ عام.

Request example:

```http
GET /api/v1/users/1/transactions?limit=50&offset=0
```

Response example:

```json
{
  "success": true,
  "message": "User transactions fetched successfully.",
  "data": {
    "userId": 1,
    "total": 1,
    "limit": 50,
    "offset": 0,
    "logs": [
      {
        "id": 90,
        "cardId": 31,
        "transactionAmount": 25.5,
        "merchantName": "Riyadh Taxi",
        "mcc": "4121",
        "decision": "approved",
        "reason": null,
        "createdAt": "2026-05-01T02:00:00Z",
        "city": "Riyadh",
        "entityId": 21,
        "action": "authorization",
        "occurredAt": "2026-05-01T02:00:00Z"
      }
    ]
  },
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-05-01T02:00:00.0000000+00:00"
  }
}
```

### Get Receiver Card Logs

Endpoint: `GET /users/{userId}/cards/logs-as-receiver`

الوصف: يرجع audit logs للبطاقات التي يكون فيها المستخدم مستلمًا فقط.

Path parameters:

- `userId` (`integer`, required)

Query parameters:

- `limit` (`integer`, optional, default `50`)
- `offset` (`integer`, optional, default `0`)

Response type: `ApiEnvelope<ReceiverPagedAuditLogsResponse>`

Errors:

- `400`: query parameter غير صالح أو خطأ عام.

Request example:

```http
GET /api/v1/users/2/cards/logs-as-receiver?limit=20&offset=0
```

Response example:

```json
{
  "success": true,
  "message": "Receiver card audit logs fetched successfully.",
  "data": {
    "receiverUserId": 2,
    "total": 1,
    "limit": 20,
    "offset": 0,
    "logs": [
      {
        "id": 90,
        "cardId": 31,
        "transactionAmount": 25.5,
        "merchantName": "Riyadh Taxi",
        "mcc": "4121",
        "decision": "approved",
        "createdAt": "2026-05-01T02:00:00Z",
        "city": "Riyadh"
      }
    ]
  },
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-05-01T02:00:00.0000000+00:00"
  }
}
```

## Verification

### Verify Invoice

Endpoint: `POST /verify-invoice`

الوصف: يتحقق من فاتورة مرتبطة بـ intent، ويحدث قفل البطاقة المرتبط بالفاتورة حسب نتيجة التحقق.

Body type: `VerifyInvoiceRequest`

- `intentId` (`integer`, required)
- `imageUrl` (`string`, required): رابط صورة الفاتورة.
- `actingUserId` (`integer`, required): المستخدم الطالب، يجب أن يكون creator أو receiver.

Response type: `ApiEnvelope` حيث `data` كائن يعكس تنفيذ الخادم الحالي (ليس `intentId`/`cardId`/`approved`):

- إذا كان `requiredInvoiceProve` على الـ intent = false: يُرجع `{ skippedVerification, isMatch, reason, isLockedByPendingInvoice, isManuallyFrozen, isRequestRefund, isSpendBlocked, cardLocked }`.
- وإلا بعد استدعاء نموذج التحقق: `{ isMatch, reason, isLockedByPendingInvoice, isManuallyFrozen, isRequestRefund, isSpendBlocked, cardLocked, provider, invoiceCity, invoiceCountry, hasGps, gpsLatitude, gpsLongitude, metadataCity, metadataCountry }` (بعض الحقول قد تكون `null` حسب المزود).

Validation:

- body مطلوب.
- `actingUserId` مطلوب وأكبر من صفر.
- صلاحية الوصول تعتمد على intent participants.

Errors:

- `400`: body مفقود أو بيانات غير صالحة.
- `403`: المستخدم غير مصرح.
- `404`: intent أو card غير موجود.
- `502`: خطأ في خدمة التحقق الخارجية أو حالة تشغيل غير صالحة.

Request example:

```json
{
  "intentId": 21,
  "imageUrl": "https://example.com/invoices/21.png",
  "actingUserId": 2
}
```

Response example:

```json
{
  "success": true,
  "message": "Invoice verification completed successfully.",
  "data": {
    "isMatch": true,
    "reason": "Invoice accepted.",
    "isLockedByPendingInvoice": false,
    "isManuallyFrozen": false,
    "isRequestRefund": false,
    "isSpendBlocked": false,
    "cardLocked": false,
    "provider": "gemini",
    "invoiceCity": "Riyadh",
    "invoiceCountry": "SA",
    "hasGps": false,
    "gpsLatitude": null,
    "gpsLongitude": null,
    "metadataCity": null,
    "metadataCountry": null
  },
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-05-01T02:00:00.0000000+00:00"
  }
}
```

Notes:

- شكل `data` يعتمد على نتيجة `InvoiceVerificationService`.
- عند فشل الفاتورة قد تبقى البطاقة مقفلة بـ `isLockedByPendingInvoice = true`.

## Simulation

### Simulate Tap To Pay

Endpoint: `POST /simulate/tap-to-pay`

الوصف: يحاكي عملية دفع باستخدام رقم البطاقة ويطبق قواعد الحوكمة: وجود البطاقة، وجود intent، قفل الفاتورة، التجميد اليدوي، وقت التفعيل، الرصيد المتبقي، uses left، وMCC.

Body type: `TapToPayRequest`

- `cardNumber` (`string`, required)
- `amount` (`number`, required)
- `merchantName` (`string`, required)
- `mcc` (`string`, required)
- `city` (`string`, required)
- `country` (`string`, required)

Response type: `ApiEnvelope<TapToPayResult>`

`TapToPayResult`:

- `approved` (`boolean`)
- `reason` (`string`)

Validation and business rules:

- إذا لم توجد البطاقة: declined مع reason `card was not found`.
- إذا لم يوجد intent: declined.
- إذا كانت البطاقة مقفلة بسبب فاتورة: declined.
- إذا كانت البطاقة مجمدة يدويًا: declined.
- إذا كان `firstDateToUser` في المستقبل: declined.
- إذا كان الرصيد المتبقي غير كافٍ: declined.
- إذا كان `usesLeft <= 0`: declined.
- إذا كان MCC غير مسموح: declined.
- عند `approved`: ينقص `remainingAmount` وينقص `usesLeft` بمقدار 1 ويعاد احتساب `lockMoney`.
- في جميع الحالات المهمة يتم إنشاء audit log.

Errors:

- `400`: body مفقود أو خطأ عام.

Request example:

```json
{
  "cardNumber": "4111123412341234",
  "amount": 25.5,
  "merchantName": "Riyadh Taxi",
  "mcc": "4121",
  "city": "Riyadh",
  "country": "SA"
}
```

Response example:

```json
{
  "success": true,
  "message": "Tap-to-pay simulation completed successfully.",
  "data": {
    "approved": true,
    "reason": "approved"
  },
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-05-01T02:00:00.0000000+00:00"
  }
}
```

Declined example:

```json
{
  "success": true,
  "message": "Tap-to-pay simulation completed successfully.",
  "data": {
    "approved": false,
    "reason": "Transaction declined: merchant category code [7994] is not allowed for this intent."
  },
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-05-01T02:00:00.0000000+00:00"
  }
}
```
