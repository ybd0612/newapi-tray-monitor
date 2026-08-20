!macro customInit
  ; 安装前静默关闭已运行的本程序，避免用户手动退出或出现文件占用提示。
  ; 仅匹配当前应用的实际进程名，不影响其他程序。
  nsExec::ExecToLog 'taskkill /F /T /IM "NewAPI监控.exe"'
!macroend
