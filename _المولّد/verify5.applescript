on run argv
  set inPath to item 1 of argv
  set outPath to item 2 of argv
  tell application "Microsoft Word"
    activate
    -- ⚠️ لا مطابقةَ بالاسم: وورد يعيد الهمزات بتطبيعٍ مختلف فتفشل المقارنة الحرفية.
    --    ولا حفظَ بالترتيب: محادثةٌ موازية قد تفتح مستنداً. فالمرجع من الفتح نفسه.
    set d to open file name POSIX file inPath
    delay 3
    save as d file format format PDF file name POSIX file outPath
    delay 3
    try
      close d saving no
    end try
    return "OK"
  end tell
end run
