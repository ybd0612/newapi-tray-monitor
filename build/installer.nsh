; 覆盖 electron-builder 的默认占用检测钩子。
; 该宏会在内置 CHECK_APP_RUNNING 之前执行，避免先弹出“无法关闭”提示。
!macro customCheckAppRunning
  ; 仅匹配当前应用的实际进程名，不影响其他程序。
  nsExec::ExecToLog '%SYSTEMROOT%\\System32\\cmd.exe /c taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"'
  Sleep 800
!macroend

!macro customInit
  ; 再执行一次兜底关闭，处理安装器启动后才出现的残留进程。
  nsExec::ExecToLog '%SYSTEMROOT%\\System32\\cmd.exe /c taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"'
  Sleep 300
!macroend
