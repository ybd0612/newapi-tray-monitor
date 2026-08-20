; 覆盖 electron-builder 的默认占用检测钩子。
; 直接留空，完全跳过默认的“无法关闭/重试”弹窗。
; customInit 仍负责在安装初始化阶段结束旧实例。
!macro customCheckAppRunning
!macroend

!macro customInit
  ; 安装初始化阶段结束旧实例，避免旧程序占用文件。
  nsExec::ExecToLog '%SYSTEMROOT%\\System32\\cmd.exe /c taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"'
  Sleep 500

  ; 清理旧版本卸载注册表项，阻止 electron-builder 调用旧卸载器并弹出重试提示。
  ; 新版本安装完成后会重新写入当前版本的卸载信息。
  DeleteRegKey SHELL_CONTEXT "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${APP_ID}"
  DeleteRegKey HKEY_CURRENT_USER "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${APP_ID}"
!macroend
