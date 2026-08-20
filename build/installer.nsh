; 覆盖 electron-builder 的默认占用检测钩子。
; 直接留空，完全跳过默认的“无法关闭/重试”弹窗。
; customInit 仍负责在安装初始化阶段结束旧实例。
!macro customCheckAppRunning
!macroend

!macro customInit
  ; 再执行一次兜底关闭，处理安装器启动后才出现的残留进程。
  nsExec::ExecToLog '%SYSTEMROOT%\\System32\\cmd.exe /c taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"'
  Sleep 300
!macroend
