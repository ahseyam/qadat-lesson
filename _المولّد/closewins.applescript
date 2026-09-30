on run
  tell application "System Events" to tell process "Microsoft Word"
    set out to {}
    repeat with w in windows
      try
        set t to name of w
        if t does not contain "models_ik_boys_primary" and t does not contain "chk1632424538" then
          click (first button of w whose subrole is "AXCloseButton")
          delay 0.6
          set end of out to t
        end if
      end try
    end repeat
    return out
  end tell
end run
