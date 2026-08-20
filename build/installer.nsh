; 覆盖 electron-builder 的默认占用检测钩子。
; 直接留空，完全跳过默认的“无法关闭/重试”弹窗。
; customInit 仍负责在安装初始化阶段结束旧实例。
!macro customCheckAppRunning
!macroend

!macro customInit
  ; 安装初始化阶段结束旧实例，避免旧程序占用文件。
  nsExec::ExecToLog '%SYSTEMROOT%\\System32\\cmd.exe /c taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"'
  Sleep 500
!macroend

; 旧版本卸载失败时，跳过 electron-builder 默认的重试弹窗。
; 这是“NewAPI监控无法关闭”提示的实际来源。
!macro customUnInstallCheck
  nsExec::ExecToLog '%SYSTEMROOT%\\System32\\cmd.exe /c taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"'
  Sleep 500
!macroend

!macro customUnInstallCheckCurrentUser
  nsExec::ExecToLog '%SYSTEMROOT%\\System32\\cmd.exe /c taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"'
  Sleep 500
!macroend
