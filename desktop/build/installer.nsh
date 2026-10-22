; Pantalla de bienvenida del asistente (con la imagen lateral de la marca).
!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Bienvenido a AndromedaVideoCut"
  !define MUI_WELCOMEPAGE_TEXT "Este asistente instalará AndromedaVideoCut ${VERSION} de Andromeda Music Inc.$\r$\n$\r$\nEditor de video para Reels, TikTok, Shorts y YouTube.$\r$\n$\r$\nCierra la app si está abierta y pulsa Siguiente para continuar."
  !insertmacro MUI_PAGE_WELCOME
!macroend
