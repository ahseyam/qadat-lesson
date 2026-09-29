# -*- coding: utf-8 -*-
"""⛔ حارسُ النداءات المعلَّقة في جافاسكربت المنصة.

الحادثة (٢٩ سبتمبر ٢٠٢٦): أُعيدت كتابةُ طبقة المزامنة فحُذف تعريفُ `setSyn`
وبقيت نداءاتُه السبعة. فكان كلُّ `save()` يسقط بـReferenceError **بعد** أن
يكتب في التخزين المحلي و**قبل** أن يُزامن — فالمنصةُ تحفظ على الجهاز ولا تُرسل
شيئاً إلى المخزن المشترك. ولم يكشفه شيء:

  · `node --check` يفحص الصياغةَ لا المعاني، فيمرّ.
  · والصفحةُ تُبنى وتُفتح وتبدو سليمة، لأن العطلَ لا يظهر إلا عند أول حفظ.
  · واختباراتُ الواجهة التي تضبط الحالةَ وترسم لا تمرّ بـ`save()`.

فصار الفحصُ حارساً: يُجمع كلُّ معرّفٍ يُنادى `NAME(` ويُطرح منه ما عُرِّف في
الملف وما هو معروفٌ في المتصفح — فما بقي نداءٌ معلَّق.

الاستعمال: python3 guard_js.py [ملف.js …]   (الافتراضي platform_app.js)
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

# معروفاتُ المتصفح ولغةِ جافاسكربت — ما عداها يجب أن يُعرَّف في الملف
KNOWN = set("""
alert confirm prompt fetch setTimeout clearTimeout setInterval clearInterval
addEventListener removeEventListener dispatchEvent Int8Array Uint8Array
Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array
Float64Array BigInt64Array ArrayBuffer DataView Proxy Reflect Function
localStorage sessionStorage navigator location history document window console
performance crypto
parseInt parseFloat isNaN isFinite encodeURIComponent decodeURIComponent
encodeURI decodeURI String Number Boolean Array Object Date Math JSON Map Set
Promise Error TypeError RegExp Symbol WeakMap WeakSet Intl Blob File FileReader
FormData URL URLSearchParams TextEncoder TextDecoder AbortController Image
requestAnimationFrame cancelAnimationFrame queueMicrotask structuredClone
btoa atob eval print open close focus blur scrollTo matchMedia getComputedStyle
""".split())

# كلماتٌ مفتاحيةٌ يتبعها قوسٌ فتبدو نداءً وليست كذلك
KEYWORDS = set("""
if for while switch catch return function typeof instanceof new delete void
do else try finally throw case in of let const var class extends super this
await async yield import export default break continue with debugger
""".split())

CALL = re.compile(r'(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(')
DEFS = [
    re.compile(r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\('),          # function f(){}
    re.compile(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*='),  # const f = …
    re.compile(r'\bclass\s+([A-Za-z_$][\w$]*)'),                  # class F {}
]


PARAMS = [
    re.compile(r'\bfunction\s*[A-Za-z_$][\w$]*\s*\(([^)]*)\)'),
    re.compile(r'\bfunction\s*\(([^)]*)\)'),
    re.compile(r'\(([^)]*)\)\s*=>'),
    re.compile(r'\bcatch\s*\(([^)]*)\)'),
]


def _params(raw):
    """أسماءُ وسائط الدوالّ — تُعدُّ معرَّفةً في نطاقها."""
    out = set()
    for rx in PARAMS:
        for grp in rx.findall(raw):
            for piece in grp.split(","):
                nm = piece.strip().lstrip(".").split("=")[0].strip()
                if re.fullmatch(r'[A-Za-z_$][\w$]*', nm or ""):
                    out.add(nm)
    # والوسيطُ المفردُ بلا قوسين: `x => …`
    out |= set(re.findall(r'(?<![.\w$])([A-Za-z_$][\w$]*)\s*=>', raw))
    return out


def _is_regex_start(out):
    """`/` تبدأ تعبيراً نمطياً إن سبقها مُعامِلٌ أو فاتحةٌ لا قيمة."""
    k = len(out) - 1
    while k >= 0 and out[k] in " \t\n\r":
        k -= 1
    if k < 0:
        return True
    return out[k] in "(,=:[!&|?{};+-*%~^<>"


def strip_noise(src):
    """يُزال ما ليس شفرةً: التعليقاتُ والنصوص — فلا يُحسب ما فيها نداءً."""
    out, i, n = [], 0, len(src)
    while i < n:
        c = src[i]
        if c == "/" and i + 1 < n and src[i + 1] == "/":
            j = src.find("\n", i)
            i = n if j < 0 else j
        elif c == "/" and i + 1 < n and src[i + 1] == "*":
            j = src.find("*/", i + 2)
            i = n if j < 0 else j + 2
        elif c == "/" and _is_regex_start(out):
            j = i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == "[":                      # صنفٌ قد يحوي «/»
                    while j < n and src[j] != "]":
                        j += 2 if src[j] == "\\" else 1
                if src[j] == "/":
                    break
                if src[j] == "\n":
                    break
                j += 1
            i = j + 1
        elif c in "\"'`":
            q, j = c, i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == q:
                    break
                j += 1
            i = j + 1
        else:
            out.append(c)
            i += 1
    return "".join(out)


def scan(path):
    raw = open(path, encoding="utf-8").read()
    src = strip_noise(raw)
    # ⚠️ التعاريفُ من المصدر **الخام**: لو أخطأ المُزيلُ فابتلع مقطعاً ضاع تعريفٌ
    #    فظهر بلاغٌ كاذب. وزيادةُ تعريفٍ من داخل نصٍّ لا تضرّ (تُسكِت لا تُنبّه خطأً).
    defined = set()
    for rx in DEFS:
        defined |= set(rx.findall(raw))
    # أسماءُ الدوالّ المسنَدة داخل الكائنات
    defined |= set(re.findall(r'\b([A-Za-z_$][\w$]*)\s*:\s*(?:async\s*)?function', raw))
    defined |= set(re.findall(r'\b([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(?[\w$,\s]*\)?\s*=>', raw))
    # ⚠️ ووسائطُ الدوالّ: `fld(type, val, onch, …)` ثم `onch(e.value)` بداخلها —
    #    نداءٌ سليمٌ على وسيطٍ لا دالّةٍ عامّة. وبدونها يُبلّغ الحارسُ كاذباً.
    defined |= _params(raw)
    called = set(CALL.findall(src)) - KEYWORDS - KNOWN
    return sorted(called - defined)


def main(paths):
    bad = {}
    for p in paths:
        miss = scan(p)
        if miss:
            bad[p] = miss
    if bad:
        lines = []
        for p, m in bad.items():
            lines.append("  ⛔ %s" % os.path.basename(p))
            for x in m:
                lines.append("      %s( … )  — تُنادى ولا تُعرَّف" % x)
        raise SystemExit(
            "⛔ نداءاتٌ معلَّقةٌ في جافاسكربت — تسقط عند أول استدعاء.\n"
            + "\n".join(lines)
            + "\n\n  عرِّفها أو احذف نداءَها. و`node --check` لا يكشف هذا،"
              "\n  لأن الصياغةَ سليمةٌ والعطلَ لا يظهر إلا وقتَ التشغيل.")
    return True


if __name__ == "__main__":
    args = sys.argv[1:] or [os.path.join(HERE, "platform_app.js")]
    main(args)
    print("  ✓ لا نداءَ معلَّقاً في %s" % " · ".join(os.path.basename(a) for a in args))
