# -*- coding: utf-8 -*-
"""⛔ حارسُ هوية قادة الأمة — يُفشل البناءَ عند أول تسرُّبٍ لهوية جهةٍ أخرى.

**لماذا حارسٌ لا تنبيه:** تكرّر تسرُّبُ «ابن خلدون» و«معارف» إلى مطبوعات قادة
**أربعَ مرّات** في مشروعهم الآخر، وسمّاه المستشارُ «فضيحةً تخطيطية». والتسرُّبُ
لا يأتي من البيانات بل من ثلاثة مواضعَ لا يكشفها مسحُ البيانات:

1. **قيمٌ احتياطيةٌ في الشفرة** — نطاقٌ افتراضيٌّ أو هويةٌ عند غياب السجل.
2. **أصولٌ مثبَّتةٌ نصّاً** — كليشةٌ أو شعارٌ مكتوبُ المسار في سكربت البناء.
3. **جملُ نسبةٍ** — «النموذجُ الرسميُّ لمدارس ابن خلدون»: حذفُ الاسم وحدَه
   يُخلّف ركاكةً، فتُحذف الجملةُ بتمامها.

**والمطابقةُ تُجرَّد من التشكيل وتُوحَّد الألفُ والهمزة** — وإلا سقطت
«ابنِ خَلدون» من الشبكة.

**ولفظُ «معارف» مجرَّداً لا يُمنع**: عربيٌّ بمعنى المعرفة ويرد في النصوص
التربوية. المُنع هو «شركة معارف» و«مدارس معارف» و«معارف للتعليم».

الاستعمال: python3 qadat_guard.py <ملف…>      (أو استورده: guard(paths))
"""
import os
import re
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))

# ═════════ ما يُمنع ═════════
# تُكتب مقطَّعةً كي لا يكشف الحارسُ نفسَه فيُفشل كلَّ بناء.
BAN = [
    ("ابن" + " خلدون", "اسمُ مدرسةٍ أخرى"),
    ("ابنِ" + " خلدون", "اسمُ مدرسةٍ أخرى"),
    ("شركة " + "معارف", "اسمُ شركةٍ أخرى"),
    ("مدارس " + "معارف", "اسمُ شركةٍ أخرى"),
    ("معارف " + "للتعليم", "اسمُ شركةٍ أخرى"),
    ("ibn" + "khaldun", "نطاقٌ أو ملفٌّ لجهةٍ أخرى"),
    ("ibn-" + "khaldun", "نطاقٌ أو ملفٌّ لجهةٍ أخرى"),
    ("maarif", "نطاقٌ أو ملفٌّ لجهةٍ أخرى"),
    ("unified-" + "lesson", "مستودعُ مدرسةٍ أخرى"),
    ("kl_" + "portrait", "كليشةُ جهةٍ أخرى"),
    ("hub_" + "logo", "شعارُ جهةٍ أخرى"),
]

# مجمعاتُ ابن خلدون — أسماءُ أحياءَ قد تُنسخ سهواً مع البنية
BAN += [(x, "مجمعُ مدرسةٍ أخرى") for x in ("النفل", "عرقه", "الياسمين")]

# ⚠️ «المنار» اسمُ حيٍّ ومدرسةٍ لغيرهم، لكنه أيضاً لفظٌ عربيٌّ شائع — يُمنع
#    مقروناً بـ«مجمع» وحدها.
PAIRED = [("مجمع " + "المنار", "مجمعُ مدرسةٍ أخرى")]

TEXT_EXT = (".html", ".js", ".py", ".json", ".md", ".txt", ".css", ".svg")


def norm(t):
    """تجريدٌ من التشكيل وتوحيدٌ للألف والهمزة — وإلا نجا «ابنِ خَلدون»."""
    t = unicodedata.normalize("NFKD", t)
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r"[ـ​-‏‪-‮]", "", t)     # تطويلٌ وعلاماتُ اتجاه
    t = re.sub(r"[أإآٱ]", "ا", t).replace("ة", "ه").replace("ى", "ي")
    return re.sub(r"\s+", " ", t)


def scan_text(t):
    n = norm(t)
    hits = []
    for w, why in BAN:
        if norm(w) in n:
            hits.append((w, why))
    for w, why in PAIRED:
        if norm(w) in n:
            hits.append((w, why))
    return hits


SELF = os.path.basename(__file__)


def scan_file(p):
    # ⚠️ الحارسُ يحمل قائمةَ الممنوعات، فلو فحص نفسَه أفشل كلَّ بناء
    if os.path.basename(p) == SELF:
        return []
    if p.lower().endswith(TEXT_EXT):
        try:
            return scan_text(open(p, encoding="utf-8", errors="ignore").read())
        except Exception:
            return []
    return []


def scan_tree(root, skip=(".git", "__pycache__")):
    out = {}
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in skip]
        for fn in fns:
            fp = os.path.join(dp, fn)
            rp = os.path.relpath(fp, root)
            hits = scan_file(fp) + scan_text(rp)          # الاسمُ نفسُه يُفحص
            if hits:
                out[rp] = sorted(set(hits))
    return out


def guard(paths=None, root=None):
    bad = scan_tree(root) if root else {}
    for p in (paths or []):
        h = scan_file(p) + scan_text(os.path.basename(p))
        if h:
            bad[p] = sorted(set(h))
    if bad:
        lines = []
        for p, hs in sorted(bad.items()):
            lines.append("  ⛔ %s" % p)
            for w, why in hs:
                lines.append("      «%s» — %s" % (w, why))
        raise SystemExit(
            "⛔ تسرُّبُ هويةٍ في مخرَجِ قادة الأمة.\n" + "\n".join(lines) +
            "\n\n  الهويةُ **بيانات** لا شفرة: كلُّ قيمةٍ احتياطيةٍ تأخذ اسمَ المدرسة\n"
            "  من qadatdata.py، وكلُّ أصلٍ من مجلد «هوية». ولا تُحذف الكلمةُ وحدَها\n"
            "  من جملة نسبةٍ — تُحذف الجملةُ بتمامها وإلا بقيت ركيكة.")
    return True


if __name__ == "__main__":
    args = sys.argv[1:]
    if args:
        guard(paths=args)
        print("  ✓ لا تسرُّبَ في %d ملفاً" % len(args))
    else:
        root = os.path.dirname(HERE)
        guard(root=root)
        print("  ✓ لا تسرُّبَ في شجرة «%s»" % os.path.basename(root))
