Unicode true
!include "MUI2.nsh"
!include "x64.nsh"
Name "tuzi-magpie"
OutFile "${OUTPUT}"
InstallDir "$LOCALAPPDATA\Programs\tuzi-magpie"
RequestExecutionLevel user
SetCompressor /SOLID lzma
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "${SOURCE}\LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "SimpChinese"
Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_OK "tuzi-magpie requires 64-bit Windows."
    Abort
  ${EndIf}
FunctionEnd
Section "tuzi-magpie"
  SetShellVarContext current
  SetOutPath "$INSTDIR"
  File /oname=tuzi-magpie.exe "${SOURCE}\dist\tuzi-magpie-windows-amd64.exe"
  File "${SOURCE}\LICENSE"
  File "${SOURCE}\THIRD_PARTY_NOTICES"
  File /oname=INSTALL.md "${SOURCE}\docs\tuzi-magpie\unsigned-install.md"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateShortcut "$SMPROGRAMS\tuzi-magpie.lnk" "$INSTDIR\tuzi-magpie.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\tuzi-magpie" "DisplayName" "tuzi-magpie"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\tuzi-magpie" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\tuzi-magpie" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\tuzi-magpie" "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\tuzi-magpie" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\tuzi-magpie" "NoRepair" 1
SectionEnd
Section "Uninstall"
  SetShellVarContext current
  ClearErrors
  Delete "$INSTDIR\tuzi-magpie.exe"
  IfErrors 0 +3
    MessageBox MB_OK "Close tuzi-magpie before uninstalling."
    Abort
  Delete "$INSTDIR\tuzi-magpie.com"
  Delete "$INSTDIR\LICENSE"
  Delete "$INSTDIR\THIRD_PARTY_NOTICES"
  Delete "$INSTDIR\INSTALL.md"
  Delete "$INSTDIR\Uninstall.exe"
  Delete "$SMPROGRAMS\tuzi-magpie.lnk"
  ReadRegStr $0 HKCU "Software\Classes\tuzimagpie\shell\open\command" ""
  StrCmp $0 '"$INSTDIR\tuzi-magpie.exe" "%1"' 0 keep_scheme
    DeleteRegKey HKCU "Software\Classes\tuzimagpie"
  keep_scheme:
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\tuzi-magpie"
  ; Preserve accounts, settings, and any files the user added.
  RMDir "$INSTDIR"
SectionEnd
