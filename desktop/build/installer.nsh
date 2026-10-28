; Pantalla de bienvenida del asistente (con la imagen lateral de la marca).
!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Bienvenido a AndromedaVideoCut Beta ${VERSION}"
  !define MUI_WELCOMEPAGE_TEXT "Este asistente instalará AndromedaVideoCut Beta ${VERSION} (versión de prueba) de Andromeda Music Inc.$\r$\n$\r$\nEditor de video para Reels, TikTok, Shorts y YouTube.$\r$\n$\r$\nCierra la app si está abierta y pulsa Siguiente para continuar."
  !insertmacro MUI_PAGE_WELCOME
!macroend

; 0.0.6 · Quien tiene una prueba 1.0.x (1.0.0/1.0.1, renumeradas como betas 0.0.0/0.0.1) no recibe las betas 0.0.x
; por actualización automática (la app no baja de versión). Si instala esta beta a mano, el instalador lo detecta,
; avisa y reemplaza la 1.0.x (electron-builder desinstala la anterior); los proyectos de %APPDATA% se conservan.
!macro customInit
  ReadRegStr $0 HKCU "${UNINSTALL_REGISTRY_KEY}" "DisplayVersion"
  StrCmp $0 "" 0 +2
    ReadRegStr $0 HKLM "${UNINSTALL_REGISTRY_KEY}" "DisplayVersion"
  StrCpy $1 $0 4
  StrCmp $1 "1.0." 0 avc_no_old
    IfSilent avc_no_old
    MessageBox MB_OKCANCEL|MB_ICONINFORMATION "Tienes instalada la versión de prueba $0.$\r$\n$\r$\nSe reemplazará por AndromedaVideoCut Beta ${VERSION}. Tus proyectos se conservan.$\r$\n$\r$\nA partir de ahora recibirás las actualizaciones automáticas." IDOK avc_no_old
    Abort
  avc_no_old:
!macroend
