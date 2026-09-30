# -*- coding: utf-8 -*-
"""فحصُ نشرات المنصة — المحتوى من الـDOCX والشكلُ من الـPDF.

⛔ لا يُقاس المحتوى من نصِّ الـPDF: خطُّ الجزيرة يربط حروفَه، وجدولُ ToUnicode
   فيه يُخرج «کل» بكافٍ فارسية و«'ي» بدل «في» و«-.» بدل «تر». فالمطابقةُ
   الحرفيةُ تفشل على مستندٍ سليم. المحتوى يُقرأ من الـDOCX حيث النصُّ حقيقي.

⛔ ولا يُقاس الشكلُ من الـDOCX: عددُ الصفحات وموضعُ النصِّ والكليشةُ لا تُعرف
   إلا بعد الإخراج. فالشكلُ من الـPDF بالبكسل.

الاستعمال: python3 nshcheck.py <الملف.docx>
"""
import os
import sys

import fitz
from docx import Document

MM = 72 / 25.4
BAND = 24 * MM            # شريطُ الكليشة — عنوانُ المستند فيه قصداً
# ⚠️ هامشُ الصفحة ١٠ مم، وصندوقُ الكتلة الذي يُبلّغ عنه PyMuPDF يتّسع عليه
#    مليمترين فيبدأ عند ٨. فحدُّ الإنذار ٧ مم — أضيقُ منه تجاوزٌ حقيقي.
SIDE = 7 * MM
FOOT = 24 * MM


def docx_text(p):
    d = Document(p)
    out = [x.text for x in d.paragraphs]
    for t in d.tables:
        for r in t.rows:
            for c in r.cells:
                out.append(c.text)
    return "\n".join(out)


def check(docx, pdf=None):
    """⚠️ الـPDF يُمرَّر صريحاً: المسلَّمُ اسمُه اسمُ الدليل، والـDOCX مسوّدةٌ
       باسمٍ آخر — فاشتقاقُ الاسم يفحص ملفّاً غيرَ المنشور أو لا يجده."""
    pdf = pdf or docx[:-5] + ".pdf"
    name = os.path.basename(docx)
    res, ok = [], True

    txt = docx_text(docx).replace(" ", "")
    d = fitz.open(pdf)
    W, H = d[0].rect.width, d[0].rect.height

    def col(pg, r):
        px = pg.get_pixmap(clip=fitz.Rect(*r), dpi=60)
        s, n = px.samples, px.n
        idx = range(0, len(s) // n, 7)
        return round(sum(1 for j in idx
                         if max(s[j*n:j*n+3]) - min(s[j*n:j*n+3]) > 18
                         or max(s[j*n:j*n+3]) < 200) / len(idx) * 100)

    def say(label, good, extra=""):
        nonlocal ok
        ok &= bool(good)
        res.append("  %s %-34s %s" % ("✓" if good else "⛔", label, extra))

    say("القياس A4", abs(W/MM - 210) < 1 and abs(H/MM - 297) < 1,
        "%.0f×%.0f مم" % (W/MM, H/MM))
    say("عددُ الصفحات ٣ فأكثر", d.page_count >= 3, "%d صفحة" % d.page_count)

    heads = [col(pg, (15*MM, 3*MM, 195*MM, 22*MM)) for pg in d]
    foots = [col(pg, (15*MM, 280*MM, 195*MM, 294*MM)) for pg in d]
    say("الكليشةُ في كل صفحة", min(heads) > 20 and min(foots) > 20,
        "ترويسة %d–%d٪ · تذييل %d–%d٪" % (min(heads), max(heads), min(foots), max(foots)))

    over = 0
    for pg in d:
        for b in pg.get_text("blocks"):
            if not (b[4] or "").strip():
                continue
            if b[3] <= BAND:            # داخل شريط الكليشة
                continue
            if b[0] < SIDE - 2 or b[2] > W - SIDE + 2 or b[1] < BAND - 2 or b[3] > H - FOOT + 2:
                over += 1
    say("لا نصَّ يتجاوز الهوامش", over == 0, "%d كتلة" % over)

    shots = sum(len(pg.get_images()) for pg in d) - d.page_count   # عدا الكليشة
    say("اللقطاتُ مُدرَجة", shots >= 4, "%d صورة" % shots)

    # ── المحتوى من الـDOCX ──
    need = [("الرابط", "ahseyam.github.io/qadat-lesson"),
            ("التوقيع", "منصةجدارةللتميزبالإدارة"),
            ("قبل أن تبدأ", "قبلأنتبد"),
            ("خطوةً خطوة", "خطوةًخطوة"),
            ("ما يقع فيه الخطأ", "يقعفيهالخطأ"),
            ("أسئلةٌ متكرّرة", "أسئلةٌمتكرّرة"),
            ("بمن تتصل", "بمنتتصل"),
            ("شاهدُ اللقطة", "لقطةٌمنالمنصةنفسِها")]
    for label, v in need:
        say(label, v in txt)
    say("لا ذكرَ للبرنامج السابق", "الحصصالتطبيقية" not in txt)
    say("لا كلمةَ سرٍّ ولا بريد", "1121986" not in txt and "ahmed.mahmud" not in txt)
    say("اسمُ المدرسة حاضر", "قادةالأمة" in txt)
    # ⛔ مدرسةٌ واحدةٌ: لا «مجمع» ولا مرحلتان في جدولها
    say("لا «مجمع»", "المجمع" not in txt)
    # ⛔ وهويةُ جهةٍ أخرى تُفشل الفحصَ لا تُنبّه فحسب
    import qadat_guard as QG
    _lk = QG.scan_text(txt)
    say("لا تسرُّبَ هوية", not _lk, "، ".join(w for w, _ in _lk))

    print("── %s ──" % name)
    print("\n".join(res))
    return ok


if __name__ == "__main__":
    good = True
    args = sys.argv[1:]
    pairs = ([(args[i], args[i + 1]) for i in range(0, len(args), 2)]
             if len(args) > 1 and args[1].lower().endswith(".pdf")
             else [(a, None) for a in args])
    for dx, pf in pairs:
        good &= check(dx, pf)
        print()
    raise SystemExit(0 if good else 1)
