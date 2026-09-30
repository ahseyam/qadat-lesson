on run
  tell application "Microsoft Word" to activate
  delay 0.5
  tell application "System Events" to tell process "Microsoft Word"
    set killed to 0
    repeat 12 times
      set gs to (every window whose name is "Grant File Access")
      if (count of gs) is 0 then exit repeat
      set w to item 1 of gs
      try
        click button "Cancel" of w
      on error
        try
          click (first button of w whose subrole is "AXCloseButton")
        end try
      end try
      set killed to killed + 1
      delay 0.8
    end repeat
    return {killed, (count of windows)}
  end tell
end run
