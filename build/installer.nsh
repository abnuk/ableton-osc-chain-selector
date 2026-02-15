!macro customInit
  ; Check if the application is running and close it
  nsExec::ExecToLog 'taskkill /F /IM "Ableton Chain Selector.exe"'
!macroend

!macro customInstall
  ; Additional custom install steps if needed
!macroend

!macro customUnInstall
  ; Make sure app is closed before uninstall
  nsExec::ExecToLog 'taskkill /F /IM "Ableton Chain Selector.exe"'
!macroend
