# -*- coding: utf-8 -*-
"""عنوانُ المستند داخل شريط الكليشة الذهبيِّ لقادة الأمة.

الشريطُ جزءٌ من صورة الكليشة، فيُكتب العنوانُ في إطارٍ نصّيٍّ (framePr) مثبَّتٍ
بإحداثيات الصفحة داخل الترويسة، فيظهر في الشريط على كل صفحة.

⚠️ **قِيست بالبكسل من «هوية/كليشة.jpg» (2392×3100 ↔ 21×29.7 سم) لا نُقلت:**
   الكليشةُ شريطان لا شريطٌ واحد — تِيلٌ أعلى (0.10–1.05 سم) **مشغولٌ بمحتوى
   الهوية** (٣٠٪ حبراً في نطاق العنوان)، وذهبيٌّ تحته (1.19–2.15 سم) **فارغٌ
   تماماً** (٠٪) وهو موضعُ الكتابة. وحافتُه اليسرى مائلةٌ من 12.41 سم أعلاه
   إلى 11.71 سم أسفله، ويمتدُّ يميناً إلى 20.95 سم.

⛔ فلا يُنقل صندوقُ عنوانٍ من كليشةٍ أخرى ولو تطابقت النسبة: النسبةُ ٠٫٧٧١٦
   في الكليشتين، وموضعُ الشريط مختلفٌ فيهما.
"""
import os
from dox import run, rtl_par, par_space, _add_pPr_el

HERE = os.path.dirname(os.path.abspath(__file__))
JAZ_BOLD = os.path.expanduser("~/Library/Fonts/ArbFONTS-Al-Jazeera-Arabic-Bold.ttf")

# صندوقُ الكتابة الآمنُ داخل الشريط الذهبي (سم من أعلى الصفحة ويسارِها)
# — بعيداً عن الحافة المائلة يساراً وعن حدِّ الصفحة يميناً
TITLE_BAND = dict(x=12.75, y=1.19, w=7.85, h=0.96)


def _fit_size(text, max_pt, box_w_cm):
    """أكبر مقاس لا يتجاوز فيه العنوان عرض الصندوق. PIL يقيس الحروف منفصلة (أعرض من المتصلة)
    فالتقدير متحفّظ؛ ويُترك 8٪ هامشاً."""
    try:
        from PIL import ImageFont
    except ImportError:
        return max_pt
    size = max_pt
    while size > 9:
        f = ImageFont.truetype(JAZ_BOLD, int(size * 10))
        w_pt = f.getlength(text) / 10
        if w_pt / 72 * 2.54 <= box_w_cm * 0.92:
            break
        size -= 0.5
    return size


def band_title(section, text, band=TITLE_BAND, max_pt=16, color="FFFFFF"):
    """يضع العنوان أبيض بخط الجزيرة العريض في منتصف الشريط، أفقياً وعمودياً."""
    size = _fit_size(text, max_pt, band["w"])
    p = section.header.add_paragraph()
    rtl_par(p)
    tw = lambda cm: str(int(round(cm * 566.93)))
    _add_pPr_el(p, 'framePr', {'w': tw(band["w"]), 'h': tw(band["h"]), 'hRule': 'exact',
                               'x': tw(band["x"]), 'y': tw(band["y"]),
                               'hAnchor': 'page', 'vAnchor': 'page', 'wrap': 'notBeside'})
    line = size * 1.25                      # سطر الجزيرة بلا قصّ
    before = max(0.0, (band["h"] / 2.54 * 72 - line) / 2)
    _add_pPr_el(p, 'spacing', {'before': str(int(before * 20)), 'after': '0',
                               'line': str(int(line * 20)), 'lineRule': 'exact'})
    _add_pPr_el(p, 'jc', {'val': 'center'})
    run(p, text, size=size, bold=True, color=color)
    return size
