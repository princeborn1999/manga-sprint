Unicode true
RequestExecutionLevel user
Name "${PRODUCT_NAME}"
!ifndef OUTPUT_DIR
  !define OUTPUT_DIR "${PROJECT_DIR}\release"
!endif
OutFile "${OUTPUT_DIR}\MangaSprint-${VERSION}-x64.exe"
InstallDir "$LOCALAPPDATA\Programs\MangaSprint"
InstallDirRegKey HKCU "Software\MangaSprint" "InstallLocation"

!include "MUI2.nsh"
!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\orange-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\orange-uninstall.ico"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "TradChinese"
!insertmacro MUI_LANGUAGE "English"

Section "MangaSprint" SEC_MAIN
  SetOutPath "$INSTDIR"
  File /r "${PROJECT_DIR}\release\win-unpacked\*.*"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateDirectory "$SMPROGRAMS\MangaSprint"
  CreateShortcut "$SMPROGRAMS\MangaSprint\MangaSprint.lnk" "$INSTDIR\MangaSprint.exe"
  CreateShortcut "$SMPROGRAMS\MangaSprint\解除安裝.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\MangaSprint.lnk" "$INSTDIR\MangaSprint.exe"
  WriteRegStr HKCU "Software\MangaSprint" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MangaSprint" "DisplayName" "MangaSprint"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MangaSprint" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MangaSprint" "Publisher" "MangaSprint"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MangaSprint" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MangaSprint" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MangaSprint" "NoRepair" 1
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\MangaSprint.lnk"
  RMDir /r "$SMPROGRAMS\MangaSprint"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MangaSprint"
  DeleteRegKey HKCU "Software\MangaSprint"
  RMDir /r "$INSTDIR"
SectionEnd
