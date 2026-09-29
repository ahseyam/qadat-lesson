# -*- coding: utf-8 -*-
"""منصة الحصة الموحَّدة — تطبيقٌ واحد بأربع مراحل وثلاثة أدوار.

المراحل: ١ الجدولة · ٢ الاستعداد والتحضير · ٣ أداء الحصة · ٤ بعد الحصة.
الأدوار: المعلم القائم بالحصة · المعلم الزائر · المقيّم (مدير/وكيل تعليمي/مشرف مختص).
ولكل دورٍ ما يخصّه فقط، ولكل مرحلةٍ شرحُها ونماذجها المعينة وأداتها القابلة للتعبئة.

التخزين: محليٌّ في الجهاز دائماً، ومشتركٌ عبر Google Apps Script إن رُبط (اختياري).
⚠️ GitHub Pages يخدم التطبيق ولا يخزّن ما يُكتب فيه — فالمشترك يحتاج الخادم المجاني.

الاستعمال: CLS_GENDER=m|f python3 platform.py <الملف.html>
"""
import base64
import json
import os
import re
import sys
from urllib.parse import quote

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import zcontent as Z
import scontent as S
from femjs import fem_js, guard
import qadatdata as Q
from prepdef import (HINTS, INFO, TICKS, STAGES, MODES, TIMEMAP_K, TIME_KEYS,
                     TIME_SUM, TIME_LEGACY, TIME_MAIN, TIME_DIFF,
                     TIME_DIFF_TITLE, SECTIONS)

FONTS = os.path.expanduser("~/Library/Fonts")
# ⛔ رابطُهم وحدهم — لا رابطَ مدرسةٍ أخرى.
SITE = os.environ.get(
    "CLS_SITE", "https://ahseyam.github.io/qadat-lesson/")
RLM = "‏"
GENDER = os.environ.get("CLS_GENDER", "m")
F = GENDER == "f"


def g(m, f):
    return f if F else m


def fem(t):
    if not F or not isinstance(t, str):
        return t
    from gender import feminize
    from lfem import lfem
    return feminize(lfem(t))


def b64(p):
    with open(p, "rb") as f:
        return base64.b64encode(f.read()).decode()


def face(name, file, weight="normal", digits=False):
    p = os.path.join(FONTS, file)
    if not os.path.exists(p):
        return ""
    ur = "" if digits else "  unicode-range:U+0000-065F,U+066A-FFFF;\n"
    return (f"@font-face{{font-family:{name};font-weight:{weight};font-display:swap;\n"
            f"  src:url(data:font/ttf;base64,{b64(p)}) format('truetype');\n{ur}}}\n")


FONTCSS = (face("JZ", "ArbFONTS-Al-Jazeera-Arabic-Regular.ttf")
           + face("JZ", "ArbFONTS-Al-Jazeera-Arabic-Bold.ttf", "700")
           + face("JZL", "ArbFONTS-Al-Jazeera-Arabic-Light.ttf")
           + face("SK", "Sakkal Majalla Regular.ttf", digits=True))


def doc(*parts):
    """رابط مستندٍ على الموقع المنشور."""
    return SITE + quote(os.path.join(*parts))


PDF = " (للعرض والطباعة).pdf"
# ⛔ دليلُ كلِّ دورٍ يُعرض له وحده في المرحلة الأولى: فيجدها صاحبُها في أول
#    شاشةٍ يفتحها، ولا يرى دليلَ غيره فيقرأ ما لا يعنيه. (٢٩ سبتمبر ٢٠٢٦)
SF = " (بنات)" if F else ""
GF = "بنات" if F else "بنين"

# ═════════ شرح كل مرحلة ونماذجها المعينة ═════════
PHASES = [
 dict(id=1, t="جدول الحصص الموحَّدة للتقويم الخارجي",
      s="المصفوفة الأولى — ومنها تبدأ كل حصة",
      who=["evaluator", "teacher", "peer"],
      # ⛔ النصُّ يصف بنيةَ هذه المدرسة لا بنيةَ غيرها: مدرسةٌ واحدةٌ بمرحلتين
      #    ولا مجمعاتٍ ولا دورانَ فرق. (٢٩ سبتمبر ٢٠٢٦)
      why="هذه الشاشة هي جدولُ الحصص الموحَّدة للتقويم الخارجي داخل المنصة: "
          "صفوفُها الأسبوعُ واليومُ ونطاقُ الإشراف، وأعمدتُها حصصُ المرحلتين بأوقات بدئها، "
          "وتحت كل حصةٍ خمسةُ حقول: المعلم · الإستراتيجية · الاتجاه التدريسي · الفصل · وقت البدء. "
          "فما يُكتب في الخلية يصير حصةً، ومن الخلية تبدأ الحصةُ بضخِّ بياناتها في التحضير.",
      steps=["اختر الأسبوعَ واليوم — ثم تخصصك إن كنت معلماً أو مشرفاً.",
             "نطاقاتُ الإشراف الخمسةُ حاضرةٌ كلَّ يوم، وتُضيَّق بمرشِّحَي التخصص واليوم.",
             "اكتب في خلية الحصة: اسم المعلم، والإستراتيجية من البنك، والاتجاه التدريسي، والفصل.",
             "ووقتُ البدء يختلف بين المرحلة الأولية والعليا — فاكتب وقتَ حصتك أنت.",
             "اضغط «ابدأ الحصة» في الخلية — تُفتح مرحلةُ التحضير وبياناتُها مضخوخةٌ فيها."],
      docs=[]),
      # ⛔ حُذف رابطُ «جدول الحصص (إكسل)» ٢٩ سبتمبر ٢٠٢٦: الجدولُ يُبنى في المنصة
      #    نفسِها، فنسخةُ الإكسل تفترق عنه ويصير مصدرا حقيقةٍ متناقضان.
 dict(id=2, t="الاستعداد والتحضير", s="ما يُعدّه المعلم قبل الحصة",
      who=["teacher", "evaluator"],
      why="التحضير توأمُ الاستمارة: كل خانةٍ فيه يقابلها مؤشرٌ يبحث عنه الزائر. "
          "فما يُكتب هنا هو ما يُرى في الحصة — ولا يُصدَّر ناقصاً.",
      steps=["اختر حصتك من الجدول.",
             "املأ خانات التحضير بترتيب مجالات الاستمارة، واستعن بزرّ «؟» في كل خانة.",
             "وزّع خريطة الزمن حتى يساوي مجموع المراحل زمن الحصة.",
             "اكتب المهمة المكيَّفة والإثرائية — فعبارة «مراعاة الفروق» بلا مهمةٍ لا تُعدّ شاهداً.",
             "اضغط «إصدار التحضير»: لا يعمل قبل اكتمال كل خانةٍ يقابلها مؤشر."],
      docs=[]),
 dict(id=6, t="تنفيذ الحصة", s="ورقةُ التنفيذ — ما يُنفَّذ وما يُقرأ قبل الدخول",
      who=["teacher", "peer", "evaluator"],
      why="بعد أن يكتمل التحضير، هذه ورقتُه جاهزةً للتنفيذ: خريطةُ الزمن ومراحلُ الحصة "
          "وبطاقةُ الإستراتيجية والمهمتان المكيَّفة والإثرائية — يُمسكها المعلم في الحصة، "
          "ويقرؤها الزائرُ قبل دخوله فيعرف ما يبحث عن شواهده.",
      steps=["اختر الحصة — وتظهر ورقةُ تنفيذها كاملةً في شاشةٍ واحدة.",
             "المعلم: نفّذ المراحل بأزمنتها، والورقةُ أمامك بلا تنقّل بين الشاشات.",
             "الزائر: اقرأها قبل الدخول — فالرصدُ قبل قراءة التحضير يُفقد الشواهد معناها.",
             "اطبعها إن شئت: تخرج في صفحةٍ أو صفحتين بلا أزرارٍ ولا زوائد."],
      docs=[]),
 dict(id=3, t="رصد الحصة", s="ما يُملأ أثناء الحصة ولها",
      who=["peer", "evaluator"],
      why="ثلاثة مقيّمين يرصدون الاستمارة وبطاقة الإستراتيجية، ومعلمان زائران يملآن بطاقة الأقران. "
          "والشاهد يُرى لا يُفترض: ما لم يُرصد أثناء الحصة لا يُحتسب.",
      steps=["افتح الحصة، واقرأ تحضير المعلم أولاً — فهو ما تبحث عن شواهده.",
             "ارصد الاستمارة مؤشراً مؤشراً، و«لا ينطبق» للاستثناء لا للهروب.",
             "افتح بطاقة تشخيص الإستراتيجية التي أعلنها المعلم وقيّم مؤشراتها العشرة.",
             "المعلم الزائر يملأ بطاقة الأقران وينقل إجراءً واحداً لنفسه."],
      docs=[]),
 dict(id=4, t="بعد الحصة", s="النتيجة وبطاقة الجسر والاعتماد",
      who=["teacher", "peer", "evaluator"],
      why="تنتهي الحصة بدرجةٍ موثَّقة وإجراءٍ واحدٍ يُتابَع — لا بانطباعٍ عام. "
          "وبطاقة الجسر هي التي تنقل الأثر إلى الحصص اليومية.",
      steps=["راجع الدرجة والنسبة والمستوى، ودرجة مؤشر الإستراتيجية.",
             "اكتب في بطاقة الجسر إجراءً واحداً محدداً يمكن رؤيته.",
             "اطبع تقرير الزيارة أو أرسله للمعلم عبر واتساب.",
             "وفي الزيارة التالية يُفتح الإجراء للتحقق من تنفيذه."],
      docs=[]),
]

# ═════════ الأدوارُ الخمسة ═════════
# ⛔ كان «المقيّم» دوراً واحداً يجمع المديرَ والوكيلَ والمشرف، ونطاقاتُهم متناقضة:
#    المديرُ والوكيلُ في مدرسةٍ واحدة، والمشرفُ يدور على المجمعات بتخصصه يوماً بيوم.
#    ففُصلوا ٢٩ سبتمبر ٢٠٢٦ بطلب المستشار: «قم بمراجعة كل ما يخص الزوار المقيمين
#    (مدير/ مشرف تربوي/ وكيل تعليمي) … وما لا يخصه قم بحذفه واستبداله بما يخصه».
# ⚠️ و`who` في المراحل يبقى "evaluator" — تُترجمه effRole() للثلاثة، فلا تُمسّ.
# scope: ما يُسأل عنه عند الدخول — "school" مدرسةٌ واحدة · "spec" تخصص · "" لا شيء.
ROLES = [
    dict(k="teacher", t=g("المعلم القائم بالحصة", "المعلمة القائمة بالحصة"),
         d=g("يحضّر حصته ويصدرها، ثم يرى نتيجتها وإجراء الجسر",
             "تحضّر حصتها وتصدرها، ثم ترى نتيجتها وإجراء الجسر"), scope="spec"),
    dict(k="peer", t=g("المعلم الزائر", "المعلمة الزائرة"),
         d=g("يرى الزيارات المسنَدة إليه، ويقرأ التحضير ويملأ بطاقة الأقران",
             "ترى الزيارات المسنَدة إليها، وتقرأ التحضير وتملأ بطاقة الأقران"), scope="spec"),
    dict(k="principal", t=g("مدير المدرسة", "مديرة المدرسة"),
         d=g("يرى حصص مدرسته وحدها: يجدولها ويرصدها ويعتمد نتيجتها",
             "ترى حصص مدرستها وحدها: تجدولها وترصدها وتعتمد نتيجتها"), scope="school"),
    dict(k="deputy", t=g("الوكيل التعليمي", "الوكيلة التعليمية"),
         d=g("يجدول حصص مدرسته ويسنِد المعلمين الزائرين إليها ويرصدها",
             "تجدول حصص مدرستها وتسنِد المعلمات الزائرات إليها وترصدها"), scope="school"),
    dict(k="supervisor", t=g("المشرف التربوي المختص", "المشرفة التربوية المختصة"),
         d=g("يرى حصص تخصصه في المجمع الذي يزوره كل يوم، ويرصدها ويعتمدها",
             "ترى حصص تخصصها في المجمع الذي تزوره كل يوم، وترصدها وتعتمدها"), scope="spec"),
    # ⛔ سادساً — من هيكلهم: تابعٌ للمدير التنفيذي لا للمدرسة، ويرى نطاقات
    #    الإشراف الخمسةَ كلَّها ومتابعةَ مشرفيها. (٢٩ سبتمبر ٢٠٢٦)
    dict(k="supervision", t="مدير الإشراف التربوي", scope="",
         d="يرى التخصصات الخمسة كلَّها ومتابعة مشرفيها ولوحةً تجمع عملهم"),
]

# ⛔ قطاعٌ واحدٌ ومدرسةٌ واحدة: لا «عالمي» ولا مجمعاتٍ هنا.
SECTORS = [Q.SECTOR]
COMPLEX = {Q.SECTOR: [Q.SCHOOL]}
# ⛔ مرحلتان لا ثلاث — قرارُ المستشار.
SCHOOL_STAGES = Q.STAGES
WEEKS = ["الأسبوع ٤", "الأسبوع ٥", "الأسبوع ٨", "الأسبوع ٩", "الأسبوع ١٠"]
DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"]
PERIODS = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة"]
# ── مأخوذٌ حرفياً من جدول البرنامج السابق (ف٢ — ١٤٤٦هـ) ──
# الورقة الأولى: المجمع × الأسبوع × اليوم ← مجموعة تخصّصٍ زائرة (أربع مجموعات).
# وورقةُ كل مجمع: صفوفها (الأسبوع × اليوم × تخصص المعلم الزائر) وأعمدتها الحصص،
# وتحت كل حصةٍ خمسةُ حقول: المعلم · الإستراتيجية · الاتجاه التدريسي · الفصل · وقت البدء.
# ⛔ لا تُكتب التخصصاتُ هنا: كانت نسخةٌ يدويةٌ بألفاظٍ طويلة («الرياضيات» ·
#    «الدراسات الإسلامية» · «اللغة الإنجليزية») تناقض ما تعرضه المنصةُ فعلاً،
#    لأن المعروضَ يأتي من scheddata المستخرَجةِ من الإكسل («رياضيات» · «إسلامية»
#    · «E»). فكانت مصدرَ حقيقةٍ ثانياً صامتاً — كما كانت COLS. (٢٩ سبتمبر ٢٠٢٦)
# ⛔ مصدرٌ واحدٌ للتخصصات: نطاقاتُ المشرفين الخمسة كما في «منظومة القيادات».
SPECGROUPS = list(Q.DOMAINS.keys())
PAIRS = Q.DOMAINS
SPECS = Q.SPECS
# أوقات البدء المستعملة فعلاً في الملف — ستٌّ لا أكثر، وهي افتراضٌ يقبل التعديل في الخلية.
PTIMES = ["٧:٠٠", "٧:٤٠", "٨:٢٠", "٩:٠٠", "١٠:٤٥", "١١:٣٠"]
# ⛔ حُذفت COLS: كانت مُعرَّفةً ولا يستعملها أحد (مصدرُ حقيقةٍ ثانٍ للأعمدة)،
#    وفيها عمودُ «٣ (صفوف أولية)» الذي أُلغي ٢٩ سبتمبر ٢٠٢٦. ومصدرُ الأعمدة
#    الوحيدُ هو BANDS في scheddata.py المستخرَجةُ من الإكسل.
# ═════════ مطابقةُ تخصصات الكشف بتخصصات المنصة ═════════
# ⛔ كان الرقمُ الوظيفيُّ يعرف تخصصَ صاحبه ويعرضه عند الدخول ثم **يُهمله**، فيعيد
#    المستخدمُ اختيارَه بيده. وأسوأُ منه أن لغةَ الكشف غيرُ لغة المنصة: «E» و«حاسب
#    آلي» و«إسلامية» لا توجد في قائمة التخصصات أصلاً.
# ⚠️ و«أخرى» (٨٨ معلماً) تبقى فارغةً يختارها صاحبُها — لا يُخمَّن لها شيء.
# ⚠️ وتبيّن أن ألفاظَ الكشف **هي** ألفاظُ المنصة نفسُها (رياضيات · إسلامية · E
#    · حاسب آلي)، فلا ترجمةَ إلا لـ«أخرى» التي تبقى فارغةً يختارها صاحبُها.
#    وكنتُ قد كتبتُ ترجمةً إلى ألفاظٍ طويلةٍ لا تعرفها المنصة — فسقط الترشيح.
SPECMAP = {x: x for x in Q.SPECS}
SPECMAP["أخرى"] = ""


def guard_specmap(roster):
    """⛔ قيمةٌ في الكشف بلا مطابقةٍ تمرّ صامتةً فيدخل صاحبُها بلا تخصص."""
    seen = {v.get("s", "") for v in roster.values()}
    miss = sorted(x for x in seen if x not in SPECMAP)
    bad = sorted(v for v in SPECMAP.values() if v and v not in Q.SPECS)
    if miss or bad:
        raise SystemExit(
            "⛔ مطابقةُ التخصصات ناقصة.\n"
            + ("  بلا مطابقةٍ في الكشف: " + " · ".join(miss) + "\n" if miss else "")
            + ("  مطابقةٌ إلى تخصصٍ لا تعرفه المنصة: " + " · ".join(bad) + "\n" if bad else "")
            + "  أضِفها إلى SPECMAP في platform.py — ولا تُخمَّن، تُسأل.")
    return True


EVAL_ROLES = [g("مدير المدرسة", "مديرة المدرسة"), g("الوكيل التعليمي", "الوكيلة التعليمية"),
              g("المشرف المختص", "المشرفة المختصة")]

SCHED_FIELDS = [
    ("sector", "القطاع", "sel", SECTORS),
    ("complex", "المجمع", "sel", COMPLEX["وطني"]),
    ("stage", "المرحلة", "sel", SCHOOL_STAGES),
    ("school", "المدرسة", "txt", None),
    ("week", "الأسبوع", "sel", WEEKS),
    ("day", "اليوم", "sel", DAYS),
    ("period", "الحصة", "sel", PERIODS),
    ("time", "وقت البدء", "txt", None),
    ("teacher", g("اسم المعلم", "اسم المعلمة"), "txt", None),
    ("subject", "المادة", "txt", None),
    ("klass", "الصف/الفصل", "txt", None),
    ("strategy", "الإستراتيجية", "sel", [b[1] for b in S.BANK]),
    ("approach", "الاتجاه التدريسي", "sel", TICKS["dir"]),
    ("spec", g("تخصص المعلم الزائر", "تخصص المعلمة الزائرة"), "sel", SPECS),
    ("peer1", g("المعلم الزائر ١", "المعلمة الزائرة ١"), "txt", None),
    ("peer2", g("المعلم الزائر ٢", "المعلمة الزائرة ٢"), "txt", None),
    ("ev1", EVAL_ROLES[0], "txt", None),
    ("ev2", EVAL_ROLES[1], "txt", None),
    ("ev3", EVAL_ROLES[2], "txt", None),
]

DATA = {
    "gender": GENDER,
    "school": Q.SCHOOL,
    "company": Q.COMPANY,
    "site": SITE,
    # ⚠️ عنوان المستند يُؤنَّث والرابط لا يُمَسّ — وإلا انكسر المسار
    "phases": [dict(p, t=fem(p["t"]), s=fem(p["s"]), why=fem(p["why"]),
                    steps=[fem(x) for x in p["steps"]],
                    docs=[[fem(t), u, r] for t, u, r in p["docs"]]) for p in PHASES],
    "roles": ROLES,
    "sched": [{"k": k, "l": fem(l), "t": t, "o": o} for k, l, t, o in SCHED_FIELDS],
    "complexes": COMPLEX,
    "sectors": SECTORS,
    "stages_sch": SCHOOL_STAGES,
    # ── بنيةُ جدول البرنامج السابق مستخرجةً من الإكسل حرفياً (scheddata.py) ──
    # ⚠️ الأسابيعُ الستةُ بتواريخها هي المعمولُ بها، وأسابيعُ الملف الأصلي مرجعٌ لا أكثر
    "weeks": Q.WEEKS,
    "cal": Q.CAL,                    # لكل أسبوع: مداه ميلادياً وهجرياً وتاريخُ كل يوم
    "days": Q.DAYS,
    "specs": Q.SPECS,                # تخصصاتُ الروستر كما هي
    "specgroups": SPECGROUPS,        # نطاقاتُ الإشراف الخمسة
    "pairs": PAIRS,
    # ⛔ المدرسةُ واحدةٌ بمرحلتين: «المجمع» هو المدرسةُ نفسُها، والنطاقان صفّاها.
    "bands": {Q.SCHOOL: [b for st in Q.STAGES for b in Q.BANDS[st]]},
    "complexlist": [Q.SCHOOL],
    # ⛔ لا دورانَ مشرفين: لا مجمعاتٍ يُقسَّمون عليها. فكلُّ نطاقٍ يزور المدرسةَ
    #    كلَّ يوم، ويُرشِّح المشرفُ تخصصَه ويومَه من الشاشة نفسِها.
    "norot": True,
    "rot": {Q.SCHOOL: {w: {d: "" for d in Q.DAYS} for w in Q.WEEKS}},
    "sup": {g: {w: {d: Q.SCHOOL for d in Q.DAYS} for w in Q.WEEKS} for g in SPECGROUPS},
    "natgroup": "", "natspecs": [], "natdays": {}, "natsup": "",
    "wmig": {},

    "lab_spec": g("تخصص المعلم الزائر", "تخصص المعلمة الزائرة"),
    "lab_teacher_short": g("المعلم", "المعلمة"),
    "approaches": TICKS["dir"],
    "info": [{"k": k, "l": fem(l), "u": u} for k, l, u in INFO],
    "sections": [{"t": s["t"], "n": fem(s["n"]),
                  "rows": [dict(r, label=fem(r["label"]),
                                hint=fem(r["hint"]) if r.get("hint") else None,
                                note=fem(r["note"]) if r.get("note") else None,
                                items=[fem(x) for x in r["items"]] if r.get("items") else None)
                           for r in s["rows"]]} for s in SECTIONS],
    "stages": [[k, fem(n)] for k, n in STAGES],
    "modes": [[fem(x) for x in grp] for grp in MODES],
    # خريطةُ الزمن مجموعتان كما في المطبوع تماماً: أربعٌ ومجموعُها، ثم التمايز
    "tlabels": {k: fem(l) for k, l in TIMEMAP_K},
    "tmain": TIME_MAIN, "tdiff": TIME_DIFF, "tdifft": fem(TIME_DIFF_TITLE),
    "tkeys": TIME_KEYS, "tsum_keys": TIME_SUM, "tlegacy": TIME_LEGACY,
    "domains": [{"t": fem(n), "inds": [fem(t) for t, _ in inds]} for n, inds in Z.MAJALAT],
    "bank": [{"key": k, "name": fem(n), "inds": [fem(x) for x in items]}
             for k, n, _, items in S.BANK],
    "levels": [[fem(n), v] for n, v in [("متحقق", 4), ("متحقق لحد كبير", 3),
                                        ("متحقق جزئياً", 2), ("غير متحقق", 1)]],
    "slevels": [["ممتاز", 10], ["جيد جداً", 8], ["جيد", 6], ["مقبول", 4], ["يحتاج لتحسين", 2]],
    "convert": S.CONVERT,
    "tulab": [fem(x) for x in Z.TULAB],
    "peerq": [fem(x) for x in ["ما الذي شاهدتُه وأنوي تطبيقه؟",
                               "كيف سأطبّقه في حصتي؟ وفي أي درس؟",
                               "ما الأثر الذي أتوقّعه على طلابي؟"]],
}

# ═════════ سِمةُ الألوان — من كليشتهم بالبكسل لا بالتخمين ═════════
# ⛔ استُخرج الفيروزيُّ #279B9A والكهرمانيُّ #B07A10 من «هوية/كليشة.jpg»
#    بعدّ البكسل، ومنهما اشتُقَّت اللوحةُ كلُّها. (٢٩ سبتمبر ٢٠٢٦)
# ⚠️ وطرفُ تدرّج الهيدر عُمِّق حتى بلغ تباينُه مع الأبيض ٤٫٧١:١ —
#    ولونُ الكليشة نفسُه يعطي ٣٫٣٦:١ ولا يكفي لنصٍّ أبيض.
THEME = {
    "navy": "#18605F",
    "navy2": "#104140",
    "teal": "#20807F",
    "teal2": "#1B6C6B",
    "tealbg": "#E9F5F4",
    "head": "#EFF8F7",
    "line": "#C6E5E4",
    "bg": "#F5FAFA",
    "gold": "#B07A10",
    "ans": "#18605F",
    "ftxt": "#CFD9D8",
    "fsub": "#A4B6B6",
}
THEME_CSS = "".join("--%s:%s;" % (k, v) for k, v in THEME.items())

CSS = """
:root{__THEME__
 --ink:#16202e;--grey:#6b7a8d;
 --ok:#1d6b35;--okbg:#e8f6ec;--bad:#a52018;--badbg:#fdeceb}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font-family:JZ,SK,"Geeza Pro",Tahoma,sans-serif;font-size:17px;line-height:1.7}
a{color:var(--teal2)}
.wrap{max-width:none;margin:0 auto;padding:0 14px}
.wrap.narrow{max-width:1100px}
.top{background:linear-gradient(105deg,var(--navy2),var(--navy) 45%,var(--teal));color:#fff;padding:14px 0}
.top .row{display:flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:space-between;
 max-width:1760px;margin:0 auto;width:100%}
/* ⛔ شعارُ المدرسة يُقرأ لا يُلمَح: رُفع من ٤٢ إلى ٦٠ بكسلاً وقُصَّ هامشُه
   الأبيضُ في المصدر، فصار المرئيُّ منه أكبرَ مرّتين. (٢٩ سبتمبر ٢٠٢٦) */
.top img{height:60px;border-radius:7px;background:#fff;padding:4px 9px}
@media(max-width:760px){.top img{height:46px;padding:3px 7px}}
.top h1{font-size:23px;font-weight:700}
.pnav{display:flex;align-items:center;gap:8px}
.pnav button{background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28);color:#fff;
 font:inherit;font-size:14.5px;font-weight:700;border-radius:9px;padding:6px 14px;cursor:pointer}
.pnav button:hover:not(.off){background:rgba(255,255,255,.3)}
.pnav button.off{opacity:.35;cursor:not-allowed}
.pnav i{font-style:normal;font-family:JZL,SK;font-size:13.5px;color:#d7eaf0;white-space:nowrap}
@media(max-width:820px){.pnav i{display:none}}
.top .me{font-family:JZL,SK;font-size:15px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);
 border-radius:20px;padding:5px 14px;display:flex;gap:10px;align-items:center}
.top .me button{background:transparent;border:0;color:#cfe3ea;font:inherit;font-size:14px;cursor:pointer;text-decoration:underline}
/* ───── الشريط الجانبي الأيمن ───── */
.body{display:grid;grid-template-columns:264px minmax(0,1fr);gap:14px;align-items:start;padding:14px 0 36px}
.body.wide{grid-template-columns:44px minmax(0,1fr)}
.body.wide .side nav button span,.body.wide .side .sh i,.body.wide .side .cw,
.body.wide .side .sf,.body.wide .side .stbox{display:none}
.body.wide .side .sh{padding:9px 6px;text-align:center}
.body.wide .side .sh b{font-size:0}
.body.wide .side .sh b::after{content:"☰";font-size:17px}
.body.wide .side nav{padding:5px}
.body.wide .side nav button{justify-content:center;padding:8px 4px}
.fold{position:absolute;inset-inline-start:8px;top:8px;border:0;background:rgba(255,255,255,.18);
 color:#fff;font:inherit;font-size:12.5px;border-radius:7px;padding:3px 10px;cursor:pointer}
.fold:hover{background:rgba(255,255,255,.3)}
.side{position:relative}
.side{position:sticky;top:14px;background:#fff;border:1px solid var(--line);border-radius:14px;
 overflow:hidden;box-shadow:0 3px 14px rgba(20,40,70,.07)}
.side .sh{background:linear-gradient(105deg,var(--navy2),var(--navy) 60%,var(--teal));color:#fff;padding:11px 14px}
.side .sh b{display:block;font-size:16px;font-weight:700}
.side .sh i{display:block;font-style:normal;font-family:JZL,SK;font-size:12.5px;color:#d7eaf0;margin-top:2px}
.side nav{padding:8px}
.side nav button{display:flex;gap:9px;align-items:flex-start;width:100%;text-align:start;border:0;
 background:transparent;color:var(--navy2);font:inherit;padding:9px 10px;border-radius:9px;cursor:pointer;margin-bottom:2px}
.side nav button:hover{background:var(--head)}
.side nav button.on{background:var(--navy);color:#fff}
.side nav button i{font-style:normal;font-family:SK;font-size:13.5px;width:23px;height:23px;flex:0 0 23px;
 border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--head);color:var(--navy);margin-top:1px}
.side nav button.on i{background:rgba(255,255,255,.22);color:#fff}
.side nav button b{display:block;font-size:15px;font-weight:700;line-height:1.35}
.side nav button small{display:block;font-family:JZL,SK;font-size:12px;line-height:1.4;opacity:.75;margin-top:1px}
.side .cw{border-top:1px solid var(--line);background:var(--tealbg);padding:11px 13px}
.side .cwh{font-size:12.5px;font-family:JZL,SK;color:var(--teal2)}
.side .cwt{font-weight:700;font-size:14.5px;color:var(--navy2);margin:2px 0}
.side .cws{font-family:JZL,SK;font-size:11.5px;color:var(--grey);line-height:1.5}
.side .cwg{display:flex;flex-wrap:wrap;gap:4px;margin:7px 0}
.stbox{border-top:1px solid var(--line);padding:11px 13px}
.stbox.local{background:#fff6e5}
.stbox.linked{background:var(--okbg)}
.stbox b{display:block;font-size:14px;line-height:1.4}
.stbox.linked{padding:8px 13px}
.okline{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.okline b{display:inline;font-size:13.5px;color:var(--ok)}
.okline b::before{content:"●";color:#2aa14a;margin-inline-end:5px;font-size:10px}
.lnk{border:0;background:transparent;color:var(--teal2);font:inherit;font-size:12.5px;
 font-family:JZL,SK;cursor:pointer;text-decoration:underline;padding:0}
.lnk:hover{color:var(--navy)}
.stbox.local b{color:#8a5a00}
.stbox.linked b{color:var(--ok)}
.stbox span{display:block;font-family:JZL,SK;font-size:12px;color:var(--grey);line-height:1.55;margin-top:3px}
.stb{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
#syn.oksyn{color:#bfe3c9}
#syn.warnsyn{color:#ffd9a0}
.side .sf{border-top:1px solid var(--line);padding:9px 13px;font-family:JZL,SK;font-size:12px;color:var(--grey);text-align:center}
.bst{font-family:SK;font-size:11.5px;color:var(--teal2);letter-spacing:.3px;background:var(--tealbg);border-radius:20px;padding:2px 10px;display:inline-block;margin-top:4px}
.b.sm{padding:4px 11px;font-size:13.5px}
main{min-width:0}
.mwrap{min-width:0}
/* ───── مصفوفة جدول الحصص الموحَّدة ───── */
.gwrap{overflow:auto;padding:0 2px 10px;max-height:calc(100vh - 210px)}
table.mx{table-layout:fixed;border-collapse:separate;border-spacing:0}
table.mx th{position:relative;background:var(--navy);color:#fff;font-size:13px;padding:5px 4px;
 text-align:center;border:1px solid var(--navy2);z-index:3;word-break:normal;overflow-wrap:anywhere}
table.mx thead tr:nth-child(1) th{top:0}
table.mx th.band{background:var(--teal2);border-color:var(--teal2);font-size:14.5px;font-weight:700}
table.mx th.band.off{background:#7f8c9b;border-color:#6d7a88}
table.mx th.corner{position:sticky;inset-inline-end:0;z-index:5;background:var(--navy2)}
table.mx th.sub3{background:#3c6193;font-family:JZL,SK;font-weight:400;font-size:11px;
 line-height:1.45;white-space:normal;padding:4px 5px}
table.mx th b{display:block;font-size:13.5px;white-space:normal}
table.mx th s{display:block;text-decoration:none;font-family:JZL,SK;font-size:10.5px;
 color:#ffe9c2;line-height:1.3}
table.mx th i{display:block;font-style:normal;font-family:SK;font-size:12px;color:#cfe4ea}
table.mx th.ext{background:var(--gold);border-color:#96701f}
table.mx td{border:1px solid var(--line);padding:0;vertical-align:top;background:#fff}
table.mx td.cw{position:sticky;inset-inline-end:0;z-index:2;background:var(--navy);color:#fff;width:112px;
 text-align:center;vertical-align:middle;padding:6px 4px}
table.mx td.cw b{display:block;font-size:13.5px;font-weight:700}
table.mx td.cw i,table.mx td.cw u{display:block;font-style:normal;text-decoration:none;
 font-family:SK;font-size:11px;color:#c6d8ea;line-height:1.5;margin-top:2px}
table.mx td.cd i,table.mx td.cd u{display:block;font-style:normal;text-decoration:none;
 font-family:SK;font-size:11px;color:var(--grey);line-height:1.45}
table.mx td.cd u{color:var(--teal2)}
table.mx2 th b{display:block}
table.mx2 th i{display:block;font-style:normal;font-family:SK;font-size:11px;color:#cfe4ea;font-weight:400}
table.mx td.cd{position:sticky;inset-inline-end:112px;z-index:2;background:var(--head);width:96px;
 text-align:center;padding:6px 4px;vertical-align:middle}
table.mx td.cd b{display:block;font-size:14px;color:var(--navy2)}
table.mx td.cs{position:sticky;inset-inline-end:220px;z-index:2;background:#fafcfe;width:106px;
 padding:6px 5px;font-size:13px;color:var(--teal2);font-weight:700;vertical-align:middle;text-align:center}
table.mx td.cs.hit{background:var(--tealbg)}
table.mx td.cs.nat{background:#f3ecfb;box-shadow:inset 3px 0 0 #6b4a9e}
table.mx td.cs .natmark{font-family:JZL,SK;font-size:10px;font-weight:400;color:#fff;
 background:#6b4a9e;border-radius:10px;padding:1px 7px;display:inline-block;margin-top:3px}
table.mx td.cs .mark{font-family:JZL,SK;font-size:10.5px;font-weight:400;color:#fff;background:var(--teal);
 border-radius:10px;padding:1px 7px;display:inline-block;margin-top:3px}
table.mx tr.sep td{border-top:2px solid var(--navy)}
.gsel{width:100%;margin-top:4px;font-family:JZL,SK;font-size:11px;padding:2px;border:1px solid var(--line);
 border-radius:5px;background:#fff;color:var(--grey)}
.gsel.ro2{border:0;background:transparent;text-align:center;color:var(--teal2);font-weight:700}
.cellbox{padding:4px;display:flex;flex-direction:column;gap:3px}
.cellbox.on{background:var(--okbg)}
.cellbox.other{background:#f4f6f9}
.cellbox.locked{background:#f7f9fb}
.cellbox.appr{background:var(--okbg);box-shadow:inset 0 0 0 2px #7fc494}
.cellbox.appr::before{content:"◆ معتمدة";display:block;font-size:10.5px;color:var(--ok);
 font-weight:700;text-align:center;margin-bottom:2px}
.cin{width:100%;font:inherit;font-size:12.5px;font-family:JZL,SK;padding:3px 5px;border:1px solid var(--line);
 border-radius:5px;background:#fff;color:var(--ink)}
.cin.nm{font-family:JZ,SK;font-size:13.5px;font-weight:700;color:var(--navy2)}
.cin.ro2{background:#f7fafc;color:var(--grey);min-height:24px;line-height:1.5;border-style:dashed}
.cin:focus{outline:2px solid var(--teal);border-color:var(--teal)}
.crow{display:grid;grid-template-columns:1fr 1fr;gap:3px}
.cin.sm{font-size:11.5px;padding:2px 4px}
.cme{border:1px dashed var(--teal);background:#fff;color:var(--teal2);font:inherit;font-size:11.5px;
 font-weight:700;padding:3px;border-radius:5px;cursor:pointer}
.cme:hover{background:var(--tealbg)}
.crow2{display:grid;grid-template-columns:1fr 30px;gap:3px}
.cst{border:0;background:var(--teal);color:#fff;font:inherit;font-size:12px;font-weight:700;
 padding:3px;border-radius:5px;cursor:pointer}
.cclr{border:1px solid #f0c8c4;background:#fdeceb;color:var(--bad);font:inherit;font-size:12px;
 font-weight:700;border-radius:5px;cursor:pointer;padding:0;line-height:1}
.cclr:hover{background:var(--bad);color:#fff;border-color:var(--bad)}
.cin option{font-family:JZL,SK}
.cst:hover{background:var(--teal2)}
.vday{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin:16px 0 8px;
 padding-bottom:6px;border-bottom:2px solid var(--navy)}
.vday b{font-size:17px;color:var(--navy2)}
.vday i{font-style:normal;font-family:SK;font-size:13.5px;color:var(--teal2)}
.vempty{font-family:JZL,SK;color:var(--grey);font-size:14.5px;padding:8px 2px 14px}
.filt{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-top:11px;
 padding:9px 12px;background:var(--head);border-radius:10px}
.filt input[type=text]{flex:1;min-width:190px;max-width:320px;font-size:15px;padding:6px 11px}
.filt select{max-width:190px;font-size:15px;padding:6px 11px}
table.mx td.cw.now{background:var(--gold)}
table.mx td.cw.now b::after{content:" ●";font-size:9px;vertical-align:middle}
table.mx td.cd.today{background:#fff4d6;box-shadow:inset 3px 0 0 var(--gold)}
table.mx td.cd.today b{color:#8a5a00}
.stpick{border:1px solid var(--line);border-radius:10px;padding:10px 13px;margin-top:11px;background:#fafcfe}
.stpick b{display:block;font-size:14.5px;color:var(--navy2);margin-bottom:7px}
.stpick small{display:block;font-family:JZL,SK;font-size:13px;color:var(--teal2);margin-top:7px}
table.mx2{margin-bottom:10px}
table.mx2 th{background:var(--navy);color:#fff;font-size:13.5px;padding:5px;border:1px solid var(--navy2)}
table.mx2 td{border:1px solid var(--line);padding:5px 8px;font-size:13.5px}
table.mx2 td.mid{text-align:center;font-weight:700;color:var(--navy2)}
table.mx2 td.mid.dim{color:#c3cbd6;font-weight:400}
table.mx2 td.cs{background:#fafcfe;color:var(--teal2);font-weight:700;font-size:13px;white-space:nowrap}
.wk{font-weight:700;color:var(--navy2);padding:9px 4px 4px;font-size:15px}
.wk.on{color:var(--teal2)}
.note div{color:var(--grey);font-family:JZL,SK;font-size:14px;line-height:1.6}
.srcbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:7px 16px;background:var(--tealbg);
 font-family:JZL,SK;font-size:13px;color:var(--teal2);border-bottom:1px solid var(--line)}
td.nar{width:150px}
td.nowrap{white-space:nowrap}
@media (max-width:900px){
 .body{grid-template-columns:minmax(0,1fr)}
 .side{position:static}
 .side nav{display:flex;gap:5px;overflow-x:auto;padding:7px}
 .side nav button{flex:0 0 auto;width:auto}
 .side nav button small{display:none}
 table.mx th{width:150px}
 table.mx td.cd,table.mx td.cs{position:static}
}
/* ⚠️ أهدافُ اللمس: خانةُ المصفوفة أربعةُ حقولٍ صغيرة، وعلى الإصبع لا تُصاب.
   فعلى الشاشات اللمسية والضيّقة تُكبَّر الحقولُ والمربّعاتُ والأزرار. */
@media (pointer:coarse), (max-width:900px){
 .cin{min-height:34px;font-size:14px;padding:6px 8px}
 .cin.sm{min-height:30px;font-size:13px}
 .cme,.cst{min-height:32px;font-size:13.5px}
 .cclr{min-height:32px;font-size:15px}
 .tk input{width:22px!important;height:22px!important}
 .hb{width:30px!important;height:30px!important;font-size:14px}
 .tk{font-size:15.5px;padding:3px 0}
 .ticks{gap:9px 18px}
 table input[type=radio]{width:22px!important;height:22px!important}
 .b.sm{min-height:34px}
 .lnk{min-height:30px;display:inline-flex;align-items:center}
 input,select,textarea{font-size:16px}        /* ١٦ فأكثرُ يمنع تكبيرَ iOS التلقائي */
 .g5,.g2{gap:9px}
 .g5 input,.g2 input{min-height:38px}
 table.mx th{font-size:12.5px}
 .pnav button{min-height:36px}
}
@media print{
 @page{size:A4 landscape;margin:8mm}
 .side,.srcbar,.cst,.cclr,.cme,.bar,.filt,.stpick,.pnav,.top .me{display:none!important}
 .body{display:block}.gwrap{max-height:none;overflow:visible}
 table.mx{font-size:9pt}table.mx th{font-size:9pt;padding:2px}
 .cin{border:0;padding:1px 2px;font-size:9pt;background:transparent}
 .cin.ro2{border:0}.card{break-inside:auto;border:0}
 .why{border:0;padding:0 0 6mm}.why .docs{display:none}
}
.why{background:#fff;border:1px solid var(--line);border-inline-start:6px solid var(--gold);
 border-radius:12px;padding:14px 18px;margin-bottom:14px}
.why h2{font-size:21px;color:var(--navy2);margin-bottom:5px}
.why p{font-family:JZL,SK;color:#33475f;font-size:16px;max-width:105ch}
.why ol{margin:9px 0 0;padding-inline-start:22px;font-size:16px;max-width:105ch}
.why li{margin:3px 0}
.docs{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}
.mdl{margin-top:12px;padding-top:11px;border-top:1px dashed var(--line)}
.mdl b{display:block;font-size:14.5px;color:var(--navy2);margin-bottom:7px}
.mrow{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin:5px 0}
.mrow i{font-style:normal;font-family:JZL,SK;font-size:13px;color:var(--teal2);
 min-width:74px;font-weight:700}
.docs a.mini{background:#fff;border-color:var(--line);color:var(--navy);font-weight:400;
 font-family:JZL,SK;font-size:13.5px;padding:4px 10px}
.docs a{background:var(--tealbg);border:1px solid #b6dbe4;color:var(--teal2);border-radius:8px;
 padding:5px 12px;font-size:14.5px;font-weight:700;text-decoration:none}
.card{background:#fff;border:1px solid var(--line);border-radius:12px;margin-bottom:14px;overflow:hidden}
.card>h3{background:var(--navy);color:#fff;font-size:16.5px;padding:9px 15px;display:flex;
 justify-content:space-between;align-items:center;gap:10px}
.card>h3 small{font-family:JZL,SK;font-weight:400;opacity:.9;font-size:14px}
.pad{padding:14px 16px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
label.f{display:flex;flex-direction:column;gap:4px;font-size:14.5px;color:var(--navy);font-weight:700}
input,select,textarea{border:1px solid var(--line);border-radius:8px;padding:8px 10px;font:inherit;
 font-size:16px;background:#fff;color:var(--ans);width:100%}
textarea{min-height:62px;resize:vertical}
input:focus,select:focus,textarea:focus{outline:2px solid var(--teal);border-color:var(--teal)}
button.b{background:var(--navy);color:#fff;border:0;border-radius:9px;padding:9px 18px;font:inherit;
 font-size:16px;font-weight:700;cursor:pointer}
button.b.alt{background:var(--teal)}
button.b.ghost{background:#fff;color:var(--navy);border:1px solid var(--navy)}
button.b.warn{background:var(--bad)}
button.b:disabled{opacity:.45;cursor:not-allowed}
.bar{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin-top:12px}
table{width:100%;border-collapse:collapse;font-size:15px}
th{background:var(--head);color:var(--navy);padding:8px;border:1px solid var(--line);font-size:14px;white-space:nowrap}
td{border:1px solid var(--line);padding:7px 9px;vertical-align:middle}
tr:nth-child(even) td{background:#fafcfe}
.tag{display:inline-block;border-radius:20px;padding:2px 10px;font-size:13px;font-weight:700}
.tag.ok{background:var(--okbg);color:var(--ok)}
.tag.no{background:var(--badbg);color:var(--bad)}
.tag.mid{background:#fff6e5;color:#8a5a00}
button.b.warn{background:var(--bad)}
.msg{padding:11px 15px;border-radius:10px;margin:10px 0;font-size:15.5px}
.msg.ok{background:var(--okbg);border:1px solid #bcdfc4;color:var(--ok)}
.msg.bad{background:var(--badbg);border:1px solid #f5c6cb;color:var(--bad)}
.msg ul{margin:6px 0 0;padding-inline-start:20px}
.login{max-width:720px;margin:44px auto;background:#fff;border:1px solid var(--line);border-radius:16px;padding:26px;text-align:center}
.login h2{font-size:27px;color:var(--navy2);margin-bottom:6px}
.login p{font-family:JZL,SK;color:var(--grey);margin-bottom:18px}
.roles{display:grid;gap:11px;margin-bottom:16px}
.role{border:2px solid var(--line);border-radius:12px;padding:13px 16px;cursor:pointer;text-align:start;transition:.15s}
.role:hover{border-color:var(--teal)}
.role.on{border-color:var(--navy);background:var(--head)}
.role b{display:block;font-size:17.5px;color:var(--navy2)}
.role span{font-family:JZL,SK;font-size:14.5px;color:var(--grey)}
.whois{font-family:JZL,SK;font-size:13.5px;min-height:20px;margin:5px 0 8px;color:var(--grey)}
.whois.ok{color:var(--ok);font-weight:700}
.whois.no{color:#8a5a00}
.login input{margin-bottom:8px}
.login input[readonly]{background:var(--okbg);border-color:#bcdfc4;font-weight:700;color:var(--ok)}
.ro{background:#f7fafc;border:1px solid var(--line);border-radius:8px;padding:7px 10px;color:var(--ans);
 min-height:36px;white-space:pre-wrap;font-size:15.5px}
.lab{background:var(--head);color:var(--navy);font-weight:700;font-size:14.5px;padding:7px 10px;border-radius:8px}
.row2{display:grid;grid-template-columns:170px 1fr;gap:10px;align-items:start;margin-bottom:9px}
.hint{background:var(--tealbg);border-inline-start:3px solid var(--teal);color:#14424f;font-size:14.5px;
 padding:6px 10px;margin-bottom:6px;border-radius:5px}
.hb{border:1px solid var(--teal);background:#fff;color:var(--teal);border-radius:50%;width:21px;height:21px;
 font-size:12px;cursor:pointer;line-height:1;padding:0}
.ticks{display:flex;flex-wrap:wrap;gap:6px 15px}
.tk{display:flex;align-items:center;gap:6px;font-size:15px;cursor:pointer}
.tk input{width:17px;height:17px;accent-color:var(--teal)}
.g5{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}
.g2{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;max-width:52%}
.g5 label,.g2 label{font-size:13px;text-align:center;display:block;color:var(--navy);font-weight:700}
.g5 input,.g2 input{text-align:center}
.g2 .care label{color:var(--teal2)}
.g2 .care input,.g2 .care .ro{background:var(--tealbg);border-color:#b6dbe4}
.tdiff{margin:12px 0 6px;font-family:JZL,SK;font-size:14px;color:var(--teal2);font-weight:700;
 border-top:1px dashed var(--line);padding-top:10px}
.g7{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.g5 label.auto::after,.g7 label.auto::after{content:" (يُحسب)";font-family:JZL,SK;font-weight:400;font-size:11px;color:var(--grey)}
/* الخانةُ قيد التعديل تُبرَز، والمعدَّلةُ تحمل أثراً خفيفاً يدلّ على أنها مُسَّت */
tr.m4 td{background:#e8f6ec}tr.m4 td:nth-child(2){box-shadow:inset 3px 0 0 #1d6b35}
tr.m3 td{background:#f2faf4}tr.m3 td:nth-child(2){box-shadow:inset 3px 0 0 #6aab7e}
tr.m2 td{background:#fff6e5}tr.m2 td:nth-child(2){box-shadow:inset 3px 0 0 #b8862b}
tr.m1 td{background:#fdeceb}tr.m1 td:nth-child(2){box-shadow:inset 3px 0 0 #a52018}
tr.mna td{background:#f2f2f2;color:#8a94a3}tr.mna td:nth-child(2){box-shadow:inset 3px 0 0 #b6bfca}
tr.editing td{outline:2px solid var(--gold);outline-offset:-2px}
.editing{background:#fff8e1!important;box-shadow:inset 0 0 0 2px var(--gold);border-radius:8px}
.row2.editing .lab{background:var(--gold);color:#fff}
input.touched,select.touched,textarea.touched{border-color:var(--teal);
 background:linear-gradient(180deg,#fff 88%,var(--tealbg))}
input:focus,select:focus,textarea:focus{outline:2px solid var(--teal);border-color:var(--teal);
 box-shadow:0 0 0 4px rgba(47,127,149,.14)}
td.cell:focus-within{box-shadow:inset 0 0 0 2px var(--gold)}
.ro.sum{text-align:center;font-family:SK;font-size:19px;font-weight:700;color:var(--navy2);
 background:var(--head);border-color:var(--navy)}
.ro.sum.good{background:var(--okbg);border-color:#7fc494;color:var(--ok)}
.ro.sum.bad{background:var(--badbg);border-color:#e8a9a4;color:var(--bad)}
.g7 input{text-align:center}
.stg{display:grid;grid-template-columns:120px 1fr 1fr 180px;gap:8px;border-top:1px solid var(--line);padding:8px 0}
.stg:first-child{border-top:0}
.stn{color:var(--navy);font-weight:700;font-size:14px;text-align:center}
.score{position:sticky;bottom:0;background:#fff;border-top:3px solid var(--navy);padding:9px 16px;
 display:flex;gap:14px;flex-wrap:wrap;align-items:center;font-weight:700;color:var(--navy);z-index:15}
.score .big{font-size:20px;color:var(--bad)}
.kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.kpi div{background:linear-gradient(150deg,var(--navy),var(--navy2));color:#fff;border-radius:11px;padding:13px;text-align:center}
.kpi b{display:block;font-family:SK;font-size:32px;font-weight:700;line-height:1.1}
.kpi span{font-family:JZL,SK;font-size:14.5px;opacity:.93}
.empty{text-align:center;color:var(--grey);font-family:JZL,SK;padding:26px}
.runrow{display:grid;grid-template-columns:160px 1fr;gap:10px;align-items:start;
 padding:7px 0;border-top:1px solid var(--line)}
.runrow:first-child{border-top:0}
.runrow b{color:var(--navy);font-size:14.5px}
.runrow div{font-size:15.5px;white-space:pre-wrap}
@media(max-width:700px){.runrow{grid-template-columns:1fr}}
footer{background:var(--navy2);color:var(--ftxt);margin-top:26px;padding:16px 0}
.frow{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
footer b{display:block;font-size:15.5px;color:#fff;font-weight:700}
footer span{display:block;font-family:JZL,SK;font-size:13.5px;color:var(--fsub);margin-top:3px;line-height:1.6}
footer .sig{text-align:start;border-inline-start:3px solid var(--teal);padding-inline-start:13px}
footer .sig b{font-size:14px;color:#cfe4ea;font-weight:400;font-family:JZL,SK}
footer .sig span{font-size:16px;color:#fff;font-weight:700;font-family:JZ,SK;margin-top:1px}
footer .sig i{display:block;font-style:normal;font-family:SK;font-size:11.5px;color:#7f97b3;margin-top:4px}
@media print{footer{background:#fff;color:var(--ink);border-top:1px solid var(--line)}
 footer b,footer .sig span{color:var(--navy2)}footer span{color:var(--grey)}}
@media(max-width:760px){.g5{grid-template-columns:repeat(2,1fr)}.g2{max-width:100%}
 .row2{grid-template-columns:1fr}.stg{grid-template-columns:1fr}.g7{grid-template-columns:repeat(2,1fr)}}
@media print{body{background:#fff}nav,.bar,.score,.noprint,.why .docs{display:none!important}
 .card{break-inside:avoid;border-radius:0}@page{size:A4;margin:12mm}}
"""

with open(os.path.join(HERE, "platform_app.js"), encoding="utf-8") as f:
    JS = f.read()


JS = fem_js(guard(JS), F)

HTML = """<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>__SCHOOL__</title>
<style>__FONTS____CSS__</style></head><body></body>
<script>__JS__</script></html>
"""

def build_stamp():
    """ختمُ الإصدار — به يُعرف أنَّ ما على الشاشة هو آخر بناءٍ لا نسخةً مخبوءة."""
    import subprocess
    from datetime import date
    try:
        h = subprocess.run(["git", "-C", ROOT, "rev-parse", "--short", "HEAD"],
                           capture_output=True, text=True, timeout=5).stdout.strip()
    except Exception:
        h = ""
    d = "".join("٠١٢٣٤٥٦٧٨٩"[int(c)] if c.isdigit() else c for c in date.today().isoformat())
    return f"إصدار {d}" + (f" · {h}" if h else "")


DATA["models"] = {k: [dict(m, u=SITE + quote(m["u"])) for m in v]
                  for k, v in {"أخرى": [{"t": "التربية البدنية — الثالث الابتدائي — التوازن الحركي", "stage": "الابتدائية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الابتدائية/بنين/التربية البدنية — الثالث الابتدائي — التوازن الحركي (للعرض والطباعة).pdf"}, {"t": "التربية الفنية — الرابع الابتدائي — الضوء والظل في الثمار", "stage": "الابتدائية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الابتدائية/بنين/التربية الفنية — الرابع الابتدائي — الضوء والظل في الثمار (للعرض والطباعة).pdf"}, {"t": "المهارات الحياتية والأسرية — الخامس الابتدائي — العلامات الحيوية", "stage": "الابتدائية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الابتدائية/بنين/المهارات الحياتية والأسرية — الخامس الابتدائي — العلامات الحيوية (للعرض والطباعة).pdf"}, {"t": "التربية البدنية — الأول المتوسط — التمرير بباطن القدم", "stage": "المتوسطة", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة المتوسطة/بنين/التربية البدنية — الأول المتوسط — التمرير بباطن القدم (للعرض والطباعة).pdf"}, {"t": "التربية الفنية — الثاني المتوسط — التوازن في التصميم", "stage": "المتوسطة", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة المتوسطة/بنين/التربية الفنية — الثاني المتوسط — التوازن في التصميم (للعرض والطباعة).pdf"}], "إسلامية": [{"t": "الدراسات الإسلامية — الثالث الابتدائي — أركان الإسلام", "stage": "الابتدائية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الابتدائية/بنين/الدراسات الإسلامية — الثالث الابتدائي — أركان الإسلام (للعرض والطباعة).pdf"}, {"t": "الدراسات الإسلامية — أول ثانوي — حديث إنما الأعمال بالنيات", "stage": "الثانوية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الثانوية/بنين/الدراسات الإسلامية — أول ثانوي — حديث إنما الأعمال بالنيات (للعرض والطباعة).pdf"}, {"t": "الدراسات الإسلامية — الأول المتوسط — صفة الوضوء ونواقضه", "stage": "المتوسطة", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة المتوسطة/بنين/الدراسات الإسلامية — الأول المتوسط — صفة الوضوء ونواقضه (للعرض والطباعة).pdf"}], "اجتماعيات": [{"t": "الدراسات الاجتماعية — السادس الابتدائي — قيام الدولة السعودية الأولى", "stage": "الابتدائية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الابتدائية/بنين/الدراسات الاجتماعية — السادس الابتدائي — قيام الدولة السعودية الأولى (للعرض والطباعة).pdf"}, {"t": "الدراسات الاجتماعية — أول ثانوي — التنمية المستدامة ورؤية ٢٠٣٠", "stage": "الثانوية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الثانوية/بنين/الدراسات الاجتماعية — أول ثانوي — التنمية المستدامة ورؤية ٢٠٣٠ (للعرض والطباعة).pdf"}, {"t": "الدراسات الاجتماعية — الثاني المتوسط — موقع المملكة وأثره", "stage": "المتوسطة", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة المتوسطة/بنين/الدراسات الاجتماعية — الثاني المتوسط — موقع المملكة وأثره (للعرض والطباعة).pdf"}], "رياضيات": [{"t": "الرياضيات — الرابع الابتدائي — القيمة المنزلية ضمن مئات الألوف", "stage": "الابتدائية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الابتدائية/بنين/الرياضيات — الرابع الابتدائي — القيمة المنزلية ضمن مئات الألوف (للعرض والطباعة).pdf"}, {"t": "الرياضيات — أول ثانوي — العلاقات والدوال", "stage": "الثانوية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الثانوية/بنين/الرياضيات — أول ثانوي — العلاقات والدوال (للعرض والطباعة).pdf"}, {"t": "الرياضيات — الأول المتوسط — القوى والأسس", "stage": "المتوسطة", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة المتوسطة/بنين/الرياضيات — الأول المتوسط — القوى والأسس (للعرض والطباعة).pdf"}], "علوم": [{"t": "العلوم — الخامس الابتدائي — تصنيف المخلوقات الحية", "stage": "الابتدائية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الابتدائية/بنين/العلوم — الخامس الابتدائي — تصنيف المخلوقات الحية (للعرض والطباعة).pdf"}, {"t": "الأحياء — أول ثانوي — نظرية الخلية ومكوناتها", "stage": "الثانوية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الثانوية/بنين/الأحياء — أول ثانوي — نظرية الخلية ومكوناتها (للعرض والطباعة).pdf"}, {"t": "الفيزياء — أول ثانوي — منحنى الموقع والزمن", "stage": "الثانوية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الثانوية/بنين/الفيزياء — أول ثانوي — منحنى الموقع والزمن (للعرض والطباعة).pdf"}, {"t": "الكيمياء — أول ثانوي — تركيب الذرة ونماذجها", "stage": "الثانوية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الثانوية/بنين/الكيمياء — أول ثانوي — تركيب الذرة ونماذجها (للعرض والطباعة).pdf"}, {"t": "العلوم — الأول المتوسط — خطوات الطريقة العلمية", "stage": "المتوسطة", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة المتوسطة/بنين/العلوم — الأول المتوسط — خطوات الطريقة العلمية (للعرض والطباعة).pdf"}], "E": [{"t": "اللغة الإنجليزية — الأول الابتدائي — My Friends", "stage": "الابتدائية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الابتدائية/بنين/اللغة الإنجليزية — الأول الابتدائي — My Friends (للعرض والطباعة).pdf"}, {"t": "اللغة الإنجليزية — أول ثانوي — Describing People", "stage": "الثانوية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الثانوية/بنين/اللغة الإنجليزية — أول ثانوي — Describing People (للعرض والطباعة).pdf"}, {"t": "اللغة الإنجليزية — الأول المتوسط — Daily Routines", "stage": "المتوسطة", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة المتوسطة/بنين/اللغة الإنجليزية — الأول المتوسط — Daily Routines (للعرض والطباعة).pdf"}], "لغتي": [{"t": "لغتي الجميلة — الخامس الابتدائي — أخلاق المؤمنين", "stage": "الابتدائية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الابتدائية/بنين/لغتي الجميلة — الخامس الابتدائي — أخلاق المؤمنين (للعرض والطباعة).pdf"}, {"t": "الكفايات اللغوية — أول ثانوي — الجملة الاسمية ونواسخها", "stage": "الثانوية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الثانوية/بنين/الكفايات اللغوية — أول ثانوي — الجملة الاسمية ونواسخها (للعرض والطباعة).pdf"}, {"t": "لغتي الخالدة — الأول المتوسط — الفهم القرائي في وحدة القيم", "stage": "المتوسطة", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة المتوسطة/بنين/لغتي الخالدة — الأول المتوسط — الفهم القرائي في وحدة القيم (للعرض والطباعة).pdf"}], "حاسب آلي": [{"t": "التقنية الرقمية — أول ثانوي — تحليل البيانات بالجداول", "stage": "الثانوية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الثانوية/بنين/التقنية الرقمية — أول ثانوي — تحليل البيانات بالجداول (للعرض والطباعة).pdf"}, {"t": "المهارات الرقمية — الثاني المتوسط — أمن المعلومات", "stage": "المتوسطة", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة المتوسطة/بنين/المهارات الرقمية — الثاني المتوسط — أمن المعلومات (للعرض والطباعة).pdf"}]}.items()} if GENDER == "m" else {k: [dict(m, u=SITE + quote(m["u"])) for m in v]
                  for k, v in {"أخرى": [{"t": "التربية البدنية — الثالث الابتدائي — التوازن الحركي (بنات)", "stage": "الابتدائية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الابتدائية/بنات/التربية البدنية — الثالث الابتدائي — التوازن الحركي (بنات) (للعرض والطباعة).pdf"}, {"t": "التربية الفنية — الرابع الابتدائي — الضوء والظل في الثمار (بنات)", "stage": "الابتدائية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الابتدائية/بنات/التربية الفنية — الرابع الابتدائي — الضوء والظل في الثمار (بنات) (للعرض والطباعة).pdf"}, {"t": "المهارات الحياتية والأسرية — الخامس الابتدائي — العلامات الحيوية (بنات)", "stage": "الابتدائية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الابتدائية/بنات/المهارات الحياتية والأسرية — الخامس الابتدائي — العلامات الحيوية (بنات) (للعرض والطباعة).pdf"}, {"t": "التربية البدنية — الأول المتوسط — التمرير بباطن القدم (بنات)", "stage": "المتوسطة", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة المتوسطة/بنات/التربية البدنية — الأول المتوسط — التمرير بباطن القدم (بنات) (للعرض والطباعة).pdf"}, {"t": "التربية الفنية — الثاني المتوسط — التوازن في التصميم (بنات)", "stage": "المتوسطة", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة المتوسطة/بنات/التربية الفنية — الثاني المتوسط — التوازن في التصميم (بنات) (للعرض والطباعة).pdf"}], "اجتماعيات": [{"t": "الدراسات الاجتماعية — السادس الابتدائي — قيام الدولة السعودية الأولى (بنات)", "stage": "الابتدائية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الابتدائية/بنات/الدراسات الاجتماعية — السادس الابتدائي — قيام الدولة السعودية الأولى (بنات) (للعرض والطباعة).pdf"}, {"t": "الدراسات الاجتماعية — أول ثانوي — التنمية المستدامة ورؤية ٢٠٣٠ (بنات)", "stage": "الثانوية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الثانوية/بنات/الدراسات الاجتماعية — أول ثانوي — التنمية المستدامة ورؤية ٢٠٣٠ (بنات) (للعرض والطباعة).pdf"}, {"t": "الدراسات الاجتماعية — الثاني المتوسط — موقع المملكة وأثره (بنات)", "stage": "المتوسطة", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة المتوسطة/بنات/الدراسات الاجتماعية — الثاني المتوسط — موقع المملكة وأثره (بنات) (للعرض والطباعة).pdf"}], "إسلامية": [{"t": "الدراسات الإسلامية — الثالث الابتدائي — أركان الإسلام (بنات)", "stage": "الابتدائية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الابتدائية/بنات/الدراسات الإسلامية — الثالث الابتدائي — أركان الإسلام (بنات) (للعرض والطباعة).pdf"}, {"t": "الدراسات الإسلامية — أول ثانوي — حديث إنما الأعمال بالنيات (بنات)", "stage": "الثانوية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الثانوية/بنات/الدراسات الإسلامية — أول ثانوي — حديث إنما الأعمال بالنيات (بنات) (للعرض والطباعة).pdf"}, {"t": "الدراسات الإسلامية — الأول المتوسط — صفة الوضوء ونواقضه (بنات)", "stage": "المتوسطة", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة المتوسطة/بنات/الدراسات الإسلامية — الأول المتوسط — صفة الوضوء ونواقضه (بنات) (للعرض والطباعة).pdf"}], "رياضيات": [{"t": "الرياضيات — الرابع الابتدائي — القيمة المنزلية ضمن مئات الألوف (بنات)", "stage": "الابتدائية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الابتدائية/بنات/الرياضيات — الرابع الابتدائي — القيمة المنزلية ضمن مئات الألوف (بنات) (للعرض والطباعة).pdf"}, {"t": "الرياضيات — أول ثانوي — العلاقات والدوال (بنات)", "stage": "الثانوية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الثانوية/بنات/الرياضيات — أول ثانوي — العلاقات والدوال (بنات) (للعرض والطباعة).pdf"}, {"t": "الرياضيات — الأول المتوسط — القوى والأسس (بنات)", "stage": "المتوسطة", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة المتوسطة/بنات/الرياضيات — الأول المتوسط — القوى والأسس (بنات) (للعرض والطباعة).pdf"}], "علوم": [{"t": "العلوم — الخامس الابتدائي — تصنيف المخلوقات الحية (بنات)", "stage": "الابتدائية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الابتدائية/بنات/العلوم — الخامس الابتدائي — تصنيف المخلوقات الحية (بنات) (للعرض والطباعة).pdf"}, {"t": "الأحياء — أول ثانوي — نظرية الخلية ومكوناتها (بنات)", "stage": "الثانوية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الثانوية/بنات/الأحياء — أول ثانوي — نظرية الخلية ومكوناتها (بنات) (للعرض والطباعة).pdf"}, {"t": "الفيزياء — أول ثانوي — منحنى الموقع والزمن (بنات)", "stage": "الثانوية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الثانوية/بنات/الفيزياء — أول ثانوي — منحنى الموقع والزمن (بنات) (للعرض والطباعة).pdf"}, {"t": "الكيمياء — أول ثانوي — تركيب الذرة ونماذجها (بنات)", "stage": "الثانوية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الثانوية/بنات/الكيمياء — أول ثانوي — تركيب الذرة ونماذجها (بنات) (للعرض والطباعة).pdf"}, {"t": "العلوم — الأول المتوسط — خطوات الطريقة العلمية (بنات)", "stage": "المتوسطة", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة المتوسطة/بنات/العلوم — الأول المتوسط — خطوات الطريقة العلمية (بنات) (للعرض والطباعة).pdf"}], "E": [{"t": "اللغة الإنجليزية — الأول الابتدائي — My Friends (بنات)", "stage": "الابتدائية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الابتدائية/بنات/اللغة الإنجليزية — الأول الابتدائي — My Friends (بنات) (للعرض والطباعة).pdf"}, {"t": "اللغة الإنجليزية — أول ثانوي — Describing People (بنات)", "stage": "الثانوية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الثانوية/بنات/اللغة الإنجليزية — أول ثانوي — Describing People (بنات) (للعرض والطباعة).pdf"}, {"t": "اللغة الإنجليزية — الأول المتوسط — Daily Routines (بنات)", "stage": "المتوسطة", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة المتوسطة/بنات/اللغة الإنجليزية — الأول المتوسط — Daily Routines (بنات) (للعرض والطباعة).pdf"}], "لغتي": [{"t": "لغتي الجميلة — الخامس الابتدائي — أخلاق المؤمنين (بنات)", "stage": "الابتدائية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الابتدائية/بنات/لغتي الجميلة — الخامس الابتدائي — أخلاق المؤمنين (بنات) (للعرض والطباعة).pdf"}, {"t": "الكفايات اللغوية — أول ثانوي — الجملة الاسمية ونواسخها (بنات)", "stage": "الثانوية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الثانوية/بنات/الكفايات اللغوية — أول ثانوي — الجملة الاسمية ونواسخها (بنات) (للعرض والطباعة).pdf"}, {"t": "لغتي الخالدة — الأول المتوسط — الفهم القرائي في وحدة القيم (بنات)", "stage": "المتوسطة", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة المتوسطة/بنات/لغتي الخالدة — الأول المتوسط — الفهم القرائي في وحدة القيم (بنات) (للعرض والطباعة).pdf"}], "حاسب آلي": [{"t": "التقنية الرقمية — أول ثانوي — تحليل البيانات بالجداول (بنات)", "stage": "الثانوية", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة الثانوية/بنات/التقنية الرقمية — أول ثانوي — تحليل البيانات بالجداول (بنات) (للعرض والطباعة).pdf"}, {"t": "المهارات الرقمية — الثاني المتوسط — أمن المعلومات (بنات)", "stage": "المتوسطة", "u": "١ - نموذج تحضير الحصة/نماذج معبّأة استرشادية/المرحلة المتوسطة/بنات/المهارات الرقمية — الثاني المتوسط — أمن المعلومات (بنات) (للعرض والطباعة).pdf"}]}.items()}
# ⛔ الروستر للبنين وحدهم — كشفُ البنات غيرُ متوفّر، فتبقى الكتابةُ اليدوية فيها.
#    والرقمُ الوظيفي هو الهوية: به يزول التباسُ الأسماء المتشابهة.
import json as _json
# ⛔ كشفُ معلميهم من هيكلتهم — لا كشفَ مدرسةٍ أخرى.
DATA["roster"] = {k: {"n": v["n"], "s": v["s"], "c": Q.SCHOOL, "g": "", "k": Q.SECTOR}
                  for k, v in Q.ROSTER.items()}
DATA["sysname"] = "نظام الحصة الموحَّدة"
DATA["stagelabel"] = "المرحلة الابتدائية"
# التوقيعُ شخصيٌّ حصريّ — لا يُنسب العملُ إلى جهةٍ ولا إلى أداة
# ⛔ تذييلُ منصتهم لا يحمل بياناتِ المستشار الشخصية — قرارُه ٢٩ سبتمبر ٢٠٢٦.
#    ولا يحمل صفتَه في مدرسةٍ أخرى، فذلك تسرُّبُ هويةٍ من بابٍ آخر.
DATA["owner_role"] = "منصة جدارة للتميز بالإدارة"
DATA["owner"] = "Jadarah.com"
DATA["owner_url"] = "https://jadarah.com"
# ومن يُراجَع لطلب الرابط أو ترقية الخادم — بلا نسبةٍ إلى جهةٍ أخرى
# ⛔ مفتاحُ مدرستهم في المخزن المشترك — يختلف عن مفتاح أي مدرسةٍ أخرى، فلو
#    شاركتا خادماً واحداً بقيت البياناتُ منفصلةً ولم تندمج.
# ⛔ مسمّياتُ الواجهة تتبع بنيتَهم: لا «مجمع» ولا «قطاع» في مدرسةٍ واحدة.
DATA["lab_complex"] = "المدرسة"
DATA["lab_schooltab"] = "جدول المدرسة"
DATA["lab_gridsub"] = ("صفوفُها: الأسبوعُ واليومُ ونطاقُ الإشراف · "
                       "وأعمدتُها: حصصُ المدرسة الستُّ بأوقات بدئها")
DATA["onesector"] = True
DATA["dbid"] = "qadat-primary-boys"
DATA["adminref"] = "مشرف المنصة"
DATA["adminname"] = "مشرف المنصة"
# ⛔ لا رابطَ للدليل: المستودعُ عامّ، ودليلُ الربط يُعلِّم الغريبَ كيف يبني
#    منظومةً موازيةً. فالخانةُ تبقى فارغةً ويختفي زرُّ «كيف؟» من نافذة الربط،
#    ويأخذ الرابطَ من المستشار وحدَه. (٢٩ سبتمبر ٢٠٢٦)
DATA["guide"] = ""
# ⛔ حارسُ النداءات المعلَّقة: دالّةٌ تُنادى ولا تُعرَّف تمرّ من node --check
#    ومن البناء، ولا تسقط إلا عند أول استدعاءٍ عند المستخدم. (٢٩ سبتمبر ٢٠٢٦)
import guard_js as _GJS
_GJS.main([os.path.join(HERE, "platform_app.js")])
guard_specmap(DATA["roster"])          # ⛔ يفشل البناءُ عند قيمةٍ بلا مطابقة
DATA["specmap"] = SPECMAP
DATA["adminrole"] = "مستشارٌ ومديرُ المنصة"
# ═════════ بوّابةُ المستشار ═════════
# ⚠️ لا كلمةَ سرٍّ هنا ولا بريد — **بصمتان** فقط: بصمةُ البريد (SHA-256) وبصمةُ
#    الكلمة (PBKDF2-HMAC-SHA256 بـ١٥٠٬٠٠٠ دورةٍ وملحٍ عشوائي). فمن يفتح مصدرَ
#    الصفحة لا يستخرج منهما شيئاً عملياً. ولو أراد المستشارُ تغييرَ الكلمة،
#    تُولَّد بصمةٌ جديدةٌ ويُستبدل هذا المقطع — ولا تُكتب الكلمةُ في أي ملف.
DATA["admin"] = {"u": "60ba67a29247c2d23db354fb53132064a9937270b2b92bcc8bee897e3b792828",
                 "s": "bc8f52a95735d3eaaf46e028cc709e30",
                 "h": "ecfade548d2db3c1eed72cfb7b7f13c8de9bd42c483673abce08c429b2d94fa4",
                 "it": 150000}
DATA["build"] = build_stamp()
DATA["evalroles"] = EVAL_ROLES
DATA["tulab_t"] = fem("ما قاله الطلاب — يُسأل ثلاثة من مستويات مختلفة")
DATA["lab_t"] = fem("ما يفعله المعلم")
DATA["lab_l"] = fem("ما يفعله المتعلم — فعلٌ يُرى")


def bidi(t):
    return re.sub(r"([٠-٩]+٪?)", r"\1" + RLM, t) if isinstance(t, str) else t


logo = ""
lp = os.path.join(os.path.dirname(HERE), "هوية", "شعار.jpg")
if os.path.exists(lp):
    logo = b64(lp)

out = sys.argv[1] if len(sys.argv) > 1 else "platform.html"
page = (HTML.replace("__SCHOOL__", "منصة الحصة الموحَّدة — " + Q.SCHOOL)
            .replace("__FONTS__", FONTCSS).replace("__CSS__", CSS.replace("__THEME__", THEME_CSS))
            .replace("__JS__", JS.replace("__DATA__", json.dumps(DATA, ensure_ascii=False))
                                 .replace("__LOGO__", logo)))
with open(out, "w", encoding="utf-8") as f:
    f.write(page)
print("حُفظ:", os.path.basename(out), "|", len(DATA["phases"]), "مراحل |", len(DATA["roles"]), "أدوار |",
      len(DATA["sched"]), "حقل جدولة |", sum(len(d["inds"]) for d in DATA["domains"]), "مؤشراً |",
      len(DATA["bank"]), "إستراتيجية |", round(len(page) / 1048576, 2), "م.ب")
