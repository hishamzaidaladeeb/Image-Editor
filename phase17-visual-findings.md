
## Phase 17 Visual Verification — 2026-08-22

تم فتح التطبيق ورفع `/home/ubuntu/phase17-source.png` فعلياً، وظهرت أزرار Undo وRedo في TopBar. بعد فتح Pixel Operations وتنفيذ Apply، أصبح Undo متاحاً. عند الضغط على Undo ظهرت رسالة `تعذر الوصول إلى نسخة سابقة من الصورة.` وبقيت Asset الحالية ظاهرة. هذه فجوة حقيقية في مسار التحقق وليست نتيجة متوقعة، وسيتم تشخيص validator/Asset retention قبل إعلان Phase 17.

تمت المحافظة على عدم بدء Phase 18 أو أي Feature مؤجلة.

تشخيص إضافي: بعد استبدال validator من HEAD إلى GET، بقيت رسالة Missing Revision في الجلسة المفتوحة. سجّل Performance API موارد Asset IDs منها `c95f3197-fc2d-4bb6-8a72-25f3eb941fe3` و`b1680e23-dc66-412e-80bc-4b834411df49` و`7cc00d57-33a9-4f09-bafd-06c14b020245`. يلزم الآن تحديد status الفعلي للـGET والـRevision المستهدفة؛ لا يُعلن PASS قبل إصلاح السبب.

بعد إصلاح validator وإعادة تحميل التطبيق، نجح Upload نظيف للصورة `phase17-source.png` وظهرت Canvas مع metadata `64px × 48px`. ستُعاد الآن تجربة Pixel Apply ثم Undo/Redo بصرياً.

في الجلسة النظيفة، Pixel Preview وApply نجحا وأصبحت الصورة المعتمدة تحمل اسم Revision الناتجة. أزرار Undo/Redo بقيت ظاهرة في TopBar قبل تنفيذ Undo.

بعد الإصلاح وإعادة الاختبار اليدوي: Undo أعاد Canvas إلى `phase17-source.png` الأصلية، ثم Redo أعاد Revision `9388787d-38f5-4cc8-b15e-f00d52677f7d-pixel-adjust.png`. لم تظهر رسالة Missing Revision، وأثبتت الواجهة بصرياً نجاح Undo/Redo وCanvas synchronization.

اختبار لوحة المفاتيح: أداة الضغط أرسلت Meta+Z بدلاً من Control+Z، وبعد الفحص بقي اسم Revision المطبقة ظاهراً. لا يكفي ذلك لإثبات Bug في handler لأن أداة المتصفح غيّرت modifier؛ سيُختبر dispatch مباشر لحدث Ctrl+Z.

اختبار dispatch المباشر لحدث Ctrl+Z نجح: عاد Canvas إلى `phase17-source.png` الأصلية. لذلك كانت نتيجة محاولة `browser_press_key` السابقة بسبب إرسال Meta+Z/طريقة automation، وليست Bug في Keyboard handler. Visual Verification للزر ولـKeyboard shortcut الآن PASS.
