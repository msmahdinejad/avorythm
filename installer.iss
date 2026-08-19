#define MyAppName "Avorythm"
#define MyAppProductName "Avorythm Live Translator"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Mohammad Saleh Mahdinejad"
#define MyAppURL "https://github.com/msmahdinejad/avorythm"

[Setup]
AppId={{AFCD98B9-7323-4FE9-BCCF-C105D2148BB1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}/issues
AppUpdatesURL={#MyAppURL}/releases
LicenseFile=LICENSE
InfoBeforeFile=PRIVACY.md
DefaultDirName={localappdata}\Programs\Avorythm
DefaultGroupName=Avorythm
UsePreviousAppDir=no
PrivilegesRequired=lowest
OutputDir=dist
OutputBaseFilename=Avorythm-Setup-x64
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupIconFile=extension\icons\Avorythm.ico
UninstallDisplayIcon={app}\Avorythm.exe
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
VersionInfoCompany={#MyAppPublisher}
VersionInfoCopyright=Copyright (c) 2026 {#MyAppPublisher}
VersionInfoDescription=Avorythm multilingual live translation installer
VersionInfoProductName={#MyAppProductName}
VersionInfoProductVersion={#MyAppVersion}
VersionInfoVersion={#MyAppVersion}.0

[Files]
Source: "dist\Avorythm\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[InstallDelete]
Type: filesandordirs; Name: "{localappdata}\Programs\Voxilyra"
Type: filesandordirs; Name: "{localappdata}\Programs\LingoDub"
Type: filesandordirs; Name: "{localappdata}\Programs\Dubira"
Type: filesandordirs; Name: "{localappdata}\Programs\Lingora"
Type: filesandordirs; Name: "{localappdata}\Programs\Avorythm"

[Icons]
Name: "{group}\Avorythm"; Filename: "{app}\Avorythm.exe"
Name: "{autodesktop}\Avorythm"; Filename: "{app}\Avorythm.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"; Flags: checkedonce

[Run]
Filename: "{app}\Avorythm.exe"; Description: "Launch Avorythm"; Flags: nowait postinstall skipifsilent
