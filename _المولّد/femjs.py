# -*- coding: utf-8 -*-
"""تأنيث نصوص الجافاسكربت وحراستها — مشتركٌ بين مولّدات الصفحات.

⛔ القاعدة: نصوص الجافاسكربت تُؤنَّث كنصوص المحتوى، وإلا تسرّب المذكَّر إلى شاشات
   البنات من أزرارها ورسائلها (وهي نصوصٌ لا تمرّ على `fem` لأنها مكتوبةٌ في الكود).
⚠️ والخطر المقابل: نصٌّ عربيٌّ يُستعمل مفتاحاً أو طرفَ مقارنةٍ ينكسر بالتأنيث صامتاً،
   فـ`guard` يوقف البناء ويسمّيه قبل أن يُنشر.
"""
import re

_AR = r"[؀-ۿ]"
_LIT = r'"((?:[^"\\\n]|\\.)*)"|\'((?:[^\'\\\n]|\\.)*)\''
_KEYRX = re.compile(r'(?:===|!==|==|!=)\s*"([^"]*[؀-ۿ][^"]*)"'
                    r'|\[\s*"([^"]*[؀-ۿ][^"]*)"\s*\]')


def fem_of(t):
    from gender import feminize
    from lfem import lfem
    return feminize(lfem(t))


def guard(js, where="الجافاسكربت"):
    """يوقف البناء إن كان نصٌّ عربيٌّ مفتاحاً أو طرفَ مقارنةٍ يقلبه التأنيث."""
    bad = [t for m in _KEYRX.finditer(js) for t in [m.group(1) or m.group(2)]
           if t and fem_of(t) != t]
    if bad:
        raise SystemExit(f"⛔ مفاتيحُ عربية في {where} يقلبها التأنيث: " + " · ".join(bad))
    return js


def fem_js(js, female):
    """يؤنّث النصّ المقتبس الذي فيه حرفٌ عربي وحده — فلا تتأذّى المفاتيح ولا الأصناف."""
    if not female:
        return js

    def one(m):
        q = m.group(0)[0]
        t = m.group(1) if m.group(1) is not None else m.group(2)
        if not re.search(_AR, t):
            return m.group(0)
        return q + fem_of(t) + q

    return re.sub(_LIT, one, js)


def fem_scripts(html, female):
    """يؤنّث ما بين <script> و</script> فقط، ويترك سائر الصفحة لـ`fem` المحتوى."""
    if not female:
        return html
    return re.sub(r"(<script[^>]*>)(.*?)(</script>)",
                  lambda m: m.group(1) + fem_js(guard(m.group(2)), True) + m.group(3),
                  html, flags=re.S)
