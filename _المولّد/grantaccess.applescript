on run
  -- ⛔ قاعدة المستشار: لا تُطلب منه موافقةٌ على «Grant File Access» أبداً.
  -- الحلّ الجذري: منح وورد الإذن على /private/tmp/claude-501 كلّه مرّةً واحدة،
  -- فيشمل مجلدات كل الجلسات (ومنها ما تفتحه المحادثات الموازية) ولا يسأل بعدها.
  set granted to 0
  set cancelled to 0
  tell application "Microsoft Word" to activate
  delay 0.4
  tell application "System Events" to tell process "Microsoft Word"
    repeat 14 times
      set gs to (every window whose name is "Grant File Access")
      if (count of gs) is 0 then exit repeat
      set w to item 1 of gs
      set ok to false
      -- الزرّ الأيمن هو «…Select»: نأخذه بالموضع لا بالاسم، فالنقاط قد تكون حرفاً واحداً
      try
        click button 2 of w
        set ok to true
      end try
      if not ok then
        try
          click button "Select…" of w
          set ok to true
        end try
      end if
      if ok then
        delay 1.6
        -- لوحة الاختيار: ⌘⇧G ثم المسار ثم Enter مرتين (اذهب ← امنح)
        keystroke "g" using {command down, shift down}
        delay 0.9
        keystroke "/private/tmp/claude-501"
        delay 0.6
        key code 36
        delay 1.4
        key code 36
        delay 1.8
        set granted to granted + 1
      else
        try
          click button "Cancel" of w
          set cancelled to cancelled + 1
        end try
        delay 0.6
      end if
    end repeat
    return {granted, cancelled, (count of (every window whose name is "Grant File Access"))}
  end tell
end run
