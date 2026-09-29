# -*- coding: utf-8 -*-
"""أدوات بناء DOCX عربي — تلتزم مصائد الذاكرة (szCs/bCs · bidiVisual · ترتيب pPr و trPr ·
tblGrid بالنسب · compat 15 · لا تكرار خصائص الجدول)."""
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

FONT = "Dubai"

import os as _os
import re as _re
GENDER = _os.environ.get("CLS_GENDER", "m")
# طقم «js»: العناوين والتسميات بالجزيرة Bold (بالاسم الصريح — ملفاته معلَّمة كلها عريضة)،
# والنصوص بـ Sakkal Majalla مكبَّراً (يُرسم أصغر من غيره بالمقاس نفسه). طلب المستشار 2026-09-21.
FONTSET = _os.environ.get("CLS_FONTSET", "")
SAKKAL_K = 1.25   # f = نسخة مدارس البنات

# ترتيب أبناء w:pPr حسب المخطط (ملزم)
PPR_ORDER = ["pStyle","keepNext","keepLines","pageBreakBefore","framePr","widowControl",
             "numPr","suppressLineNumbers","pBdr","shd","tabs","suppressAutoHyphens",
             "kinsoku","wordWrap","overflowPunct","topLinePunct","autoSpaceDE","autoSpaceDN",
             "bidi","adjustRightInd","snapToGrid","spacing","ind","contextualSpacing",
             "mirrorIndents","suppressOverlap","jc","textDirection","textAlignment",
             "textboxTightWrap","outlineLvl","divId","cnfStyle","rPr","sectPr","pPrChange"]

TRPR_ORDER = ["cnfStyle","divId","gridBefore","gridAfter","wBefore","wAfter","cantSplit",
              "trHeight","tblHeader","tblCellSpacing","jc","hidden"]

TCPR_ORDER = ["cnfStyle","tcW","gridSpan","hMerge","vMerge","tcBorders","shd","noWrap",
              "tcMar","textDirection","tcFitText","vAlign","hideMark"]

TBLPR_ORDER = ["tblStyle","tblpPr","tblOverlap","bidiVisual","tblStyleRowBandSize",
               "tblStyleColBandSize","tblW","jc","tblCellSpacing","tblInd","tblBorders",
               "shd","tblLayout","tblCellMar","tblLook","tblCaption","tblDescription"]


def _insert_ordered(parent, el, order):
    tag = el.tag.split('}')[1]
    idx = order.index(tag)
    for child in parent:
        ctag = child.tag.split('}')[1]
        if ctag in order and order.index(ctag) > idx:
            child.addprevious(el)
            return
    parent.append(el)


def _pPr(p):
    pPr = p._p.get_or_add_pPr()
    return pPr


def _add_pPr_el(p, tag, attrs=None):
    pPr = _pPr(p)
    # إزالة المكرر ثم الإدراج المرتب
    for old in pPr.findall(qn('w:' + tag)):
        pPr.remove(old)
    el = OxmlElement('w:' + tag)
    for k, v in (attrs or {}).items():
        el.set(qn('w:' + k), v)
    _insert_ordered(pPr, el, PPR_ORDER)
    return el


def rtl_par(p):
    """يجعل الفقرة عربية الاتجاه. لا نضبط jc إلا صراحةً (الافتراضي مع bidi = اليمين)."""
    _add_pPr_el(p, 'bidi')
    return p


LINE_K = 1.32   # ارتفاع السطر = المقاس × هذا المعامل (مقيس بصرياً لخط الجزيرة بلا قصّ)


def par_space(p, before=0, after=0, line=None, rule=None):
    if rule is None:
        rule = 'exact'
    if FONTSET == "js" and line:
        # Sakkal المكبَّر ×1.25 يلزمه سطر = 1.2 من مقاسه المكبَّر (مقيس بالتكبير بلا قصّ)؛ والسطر
        # الممرَّر محسوب على المقاس الأصلي ×1.32 ⇒ المعامل 1.25×1.2÷1.32 ≈ 1.14
        line = round(line * 1.14, 1)
    a = {'before': str(int(before * 20)), 'after': str(int(after * 20))}
    if line:
        a['line'] = str(int(line * 20))
        a['lineRule'] = rule
    _add_pPr_el(p, 'spacing', a)


def par_shd(p, fill):
    _add_pPr_el(p, 'shd', {'val': 'clear', 'color': 'auto', 'fill': fill})


def par_keep(p):
    _add_pPr_el(p, 'keepNext')


def par_break_before(p):
    _add_pPr_el(p, 'pageBreakBefore')


def par_border_bottom(p, color="BFBFBF", sz="6"):
    pPr = _pPr(p)
    for old in pPr.findall(qn('w:pBdr')):
        pPr.remove(old)
    b = OxmlElement('w:pBdr')
    bot = OxmlElement('w:bottom')
    bot.set(qn('w:val'), 'single'); bot.set(qn('w:sz'), sz)
    bot.set(qn('w:space'), '1'); bot.set(qn('w:color'), color)
    b.append(bot)
    _insert_ordered(pPr, b, PPR_ORDER)


def run(p, text, size=11, bold=False, color=None, font=FONT, latin=False, light=False, _fem=True):
    """مقطع نصّي عربي: يلزم rtl + szCs + bCs وإلا تجاهلها وورد بصمت.

    ⚠️ ملفات خط الجزيرة الثلاثة معلَّمة كلها «عريضة» في fsSelection، فيعجز وورد عن ربط
    وزن Bold بالعائلة ويصطنعه. الحل: تسمية الوزن صراحةً — ولا يُضاف b فوقه وإلا تضاعف."""
    if FONTSET == "js" and font == FONT and bold and _re.search("[٠-٩]", text or ""):
        # ⚠️ الجزيرة يرسم الأرقام الهندية (U+0660–0669) بأشكال غربية؛ فتُفصل الأرقام في مقاطع
        # بـ Sakkal Majalla عريض. يُؤنَّث النص كاملاً قبل الفصل كي لا تنكسر عبارات المعجم.
        if GENDER == "f":
            from gender import feminize
            text = feminize(text)
        r = None
        for seg in _re.split("([٠-٩][٠-٩٫,.]*)", text):
            if not seg: continue
            if _re.match("[٠-٩]", seg):
                r = run(p, seg, round(size * SAKKAL_K, 1), True, color, "Sakkal Majalla", latin, light, _fem=False)
            else:
                r = run(p, seg, size, True, color, font, latin, light, _fem=False)
        return r
    if FONTSET == "js" and font == FONT:
        if bold:
            font, bold = "Al-Jazeera-Arabic-Bold", False
        else:
            font, size = "Sakkal Majalla", round(size * SAKKAL_K, 1)
    elif font == FONT and FONT == "Al-Jazeera-Arabic":
        if bold:
            font, bold = FONT + "-Bold", False
        elif light:
            font = FONT + "-Light"
    elif font == FONT and FONT == "Dubai" and light and not bold:
        font = "Dubai Light"
    if GENDER == "f" and text and _fem:
        from gender import feminize
        text = feminize(text)
    r = p.add_run(text)
    r.font.name = font
    r.font.size = Pt(size)
    r.font.bold = bold
    if color:
        r.font.color.rgb = RGBColor.from_string(color)
    rPr = r._r.get_or_add_rPr()
    rf = rPr.find(qn('w:rFonts'))
    if rf is None:
        rf = OxmlElement('w:rFonts'); rPr.insert(0, rf)
    rf.set(qn('w:ascii'), font); rf.set(qn('w:hAnsi'), font)
    rf.set(qn('w:cs'), font); rf.set(qn('w:eastAsia'), font)
    # szCs / bCs
    for tag, val in (('szCs', str(int(size * 2))),):
        for old in rPr.findall(qn('w:' + tag)):
            rPr.remove(old)
        el = OxmlElement('w:' + tag); el.set(qn('w:val'), val); rPr.append(el)
    if bold:
        for old in rPr.findall(qn('w:bCs')):
            rPr.remove(old)
        el = OxmlElement('w:bCs'); rPr.append(el)
    if not latin:
        for old in rPr.findall(qn('w:rtl')):
            rPr.remove(old)
        el = OxmlElement('w:rtl'); rPr.append(el)
    else:
        el = OxmlElement('w:rtl'); el.set(qn('w:val'), '0'); rPr.append(el)
    return r


# ---------- الجداول ----------

def _tblPr_set(tbl, tag, attrs=None, children=None):
    tblPr = tbl._tbl.tblPr
    for old in tblPr.findall(qn('w:' + tag)):
        tblPr.remove(old)
    el = OxmlElement('w:' + tag)
    for k, v in (attrs or {}).items():
        el.set(qn('w:' + k), v)
    for c in (children or []):
        el.append(c)
    _insert_ordered(tblPr, el, TBLPR_ORDER)
    return el


def make_table(doc, rows, widths_cm, borders_color="9DB2C6", header_rows=1):
    """جدول عربي بعرض أعمدة ثابت. widths_cm بالسنتيمتر، وترتيبها من اليمين لليسار."""
    t = doc.add_table(rows=rows, cols=len(widths_cm))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    _tblPr_set(t, 'bidiVisual')
    total = sum(widths_cm)
    _tblPr_set(t, 'tblW', {'w': '5000', 'type': 'pct'})
    _tblPr_set(t, 'tblLayout', {'type': 'fixed'})
    # الحدود
    bd = OxmlElement('w:tblBorders')
    for side in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        e = OxmlElement('w:' + side)
        e.set(qn('w:val'), 'single'); e.set(qn('w:sz'), '6')
        e.set(qn('w:space'), '0'); e.set(qn('w:color'), borders_color)
        bd.append(e)
    tblPr = t._tbl.tblPr
    for old in tblPr.findall(qn('w:tblBorders')):
        tblPr.remove(old)
    _insert_ordered(tblPr, bd, TBLPR_ORDER)
    # هوامش الخلية مرة واحدة
    cm_ = OxmlElement('w:tblCellMar')
    for side, v in (('top', '14'), ('left', '70'), ('bottom', '14'), ('right', '70')):
        e = OxmlElement('w:' + side); e.set(qn('w:w'), v); e.set(qn('w:type'), 'dxa')
        cm_.append(e)
    for old in tblPr.findall(qn('w:tblCellMar')):
        tblPr.remove(old)
    _insert_ordered(tblPr, cm_, TBLPR_ORDER)
    # الشبكة بالنسب الحقيقية
    grid = t._tbl.find(qn('w:tblGrid'))
    for gc in list(grid):
        grid.remove(gc)
    for w in widths_cm:
        gc = OxmlElement('w:gridCol')
        gc.set(qn('w:w'), str(int(w * 566.9)))
        grid.append(gc)
    for r in t.rows:
        for i, c in enumerate(r.cells):
            _tcPr_set(c, 'tcW', {'w': str(int(widths_cm[i] / total * 5000)), 'type': 'pct'})
    if header_rows:
        for i in range(header_rows):
            _trPr_set(t.rows[i], 'tblHeader')
    return t


def _tcPr_set(cell, tag, attrs=None):
    tcPr = cell._tc.get_or_add_tcPr()
    for old in tcPr.findall(qn('w:' + tag)):
        tcPr.remove(old)
    el = OxmlElement('w:' + tag)
    for k, v in (attrs or {}).items():
        el.set(qn('w:' + k), v)
    _insert_ordered(tcPr, el, TCPR_ORDER)
    return el


def _trPr_set(row, tag, attrs=None):
    trPr = row._tr.get_or_add_trPr()
    for old in trPr.findall(qn('w:' + tag)):
        trPr.remove(old)
    el = OxmlElement('w:' + tag)
    for k, v in (attrs or {}).items():
        el.set(qn('w:' + k), v)
    _insert_ordered(trPr, el, TRPR_ORDER)
    return el


def row_height(row, cm, rule='atLeast'):
    _trPr_set(row, 'trHeight', {'val': str(int(cm * 566.9)), 'hRule': rule})


def row_nosplit(row):
    _trPr_set(row, 'cantSplit')


def cell_shd(cell, fill):
    _tcPr_set(cell, 'shd', {'val': 'clear', 'color': 'auto', 'fill': fill})


def cell_valign(cell, val='center'):
    _tcPr_set(cell, 'vAlign', {'val': val})


def cell_text(cell, text, size=10, bold=False, color=None, align=None,
              shd=None, valign='center', space_after=0, line=None):
    cell.text = ""
    p = cell.paragraphs[0]
    rtl_par(p)
    par_space(p, 0, space_after, line or round(size * LINE_K, 1))
    if align == 'center':
        _add_pPr_el(p, 'jc', {'val': 'center'})
    elif align == 'both':
        _add_pPr_el(p, 'jc', {'val': 'both'})
    elif align == 'end':        # نهاية السطر العربي = اليسار
        _add_pPr_el(p, 'jc', {'val': 'end'})
    if text:
        run(p, text, size=size, bold=bold, color=color)
    if shd:
        cell_shd(cell, shd)
    cell_valign(cell, valign)
    return p


def cell_lines(cell, lines, size=10, bold=False, color=None, shd=None,
               valign='top', space=1.5, line=None, align=None):
    """عدة أسطر داخل خلية واحدة."""
    cell.text = ""
    first = True
    for i, ln in enumerate(lines):
        p = cell.paragraphs[0] if first else cell.add_paragraph()
        first = False
        rtl_par(p)
        par_space(p, 0, space if i < len(lines) - 1 else 0, line or round(size * LINE_K, 1))
        if align == 'center':
            _add_pPr_el(p, 'jc', {'val': 'center'})
        if isinstance(ln, tuple):
            txt, b = ln[0], ln[1]
            c = ln[2] if len(ln) > 2 else color
            run(p, txt, size=size, bold=b, color=c)
        elif ln:
            run(p, ln, size=size, bold=bold, color=color)
    if shd:
        cell_shd(cell, shd)
    cell_valign(cell, valign)


def normalize_tables(doc):
    """حارس: عنصر واحد من كل نوع في tblPr، ولا شبكة متساوية لما صُمّم غير متساوٍ."""
    n = 0
    for tbl in doc.element.body.iter(qn('w:tbl')):
        tblPr = tbl.find(qn('w:tblPr'))
        if tblPr is None:
            continue
        seen = {}
        for child in list(tblPr):
            tag = child.tag.split('}')[1]
            if tag in seen:
                tblPr.remove(seen[tag])
                n += 1
            seen[tag] = child
    return n


def set_compat15(doc):
    settings = doc.settings.element
    compat = settings.find(qn('w:compat'))
    if compat is None:
        compat = OxmlElement('w:compat')
        settings.append(compat)
    for old in compat.findall(qn('w:compatSetting')):
        compat.remove(old)
    cs = OxmlElement('w:compatSetting')
    cs.set(qn('w:name'), 'compatibilityMode')
    cs.set(qn('w:uri'), 'http://schemas.microsoft.com/office/word')
    cs.set(qn('w:val'), '15')
    compat.append(cs)
    # المستند كله RTL
    for tag in ('bidi',):
        el = settings.find(qn('w:' + tag))
        if el is None:
            el = OxmlElement('w:' + tag)
            settings.append(el)


def set_doc_defaults(doc):
    st = doc.styles['Normal']
    st.font.name = FONT
    st.font.size = Pt(11)
    rpr = st.element.get_or_add_rPr()
    rf = rpr.find(qn('w:rFonts'))
    if rf is None:
        rf = OxmlElement('w:rFonts'); rpr.insert(0, rf)
    for a in ('ascii', 'hAnsi', 'cs', 'eastAsia'):
        rf.set(qn('w:' + a), FONT)
    for tag, val in (('szCs', '22'),):
        for old in rpr.findall(qn('w:' + tag)):
            rpr.remove(old)
        e = OxmlElement('w:' + tag); e.set(qn('w:val'), val); rpr.append(e)
