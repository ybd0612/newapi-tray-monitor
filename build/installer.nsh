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

; 解压到临时目录完成后、覆盖安装目录前再次结束进程。
; NSIS 的默认占用检测发生在这个阶段，customInit 仍不够靠后。
!macro customFiles_x64
  nsExec::ExecToLog '%SYSTEMROOT%\\System32\\cmd.exe /c taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"'
  Sleep 1000
!macroend

!macro customFiles_ia32
  nsExec::ExecToLog '%SYSTEMROOT%\\System32\\cmd.exe /c taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"'
  Sleep 1000
!macroend

!macro customFiles_arm64
  nsExec::ExecToLog '%SYSTEMROOT%\\System32\\cmd.exe /c taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"'
  Sleep 1000
!macroend
