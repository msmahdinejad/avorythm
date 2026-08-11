#define MyAppName "LingoDub"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "Mohammad Saleh Mahdinejad"
#define MyAppURL "https://github.com/msmahdinejad/lingodub"

[Setup]
AppId={{AFCD98B9-7323-4FE9-BCCF-C105D2148BB1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={localappdata}\Programs\LingoDub
DefaultGroupName=LingoDub
PrivilegesRequired=lowest
OutputDir=dist
OutputBaseFilename=LingoDub-Setup-x64
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupIconFile=extension\icons\LingoDub.ico
UninstallDisplayIcon={app}\LingoDub.exe
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Files]
Source: "dist\LingoDub\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "extension\*"; DestDir: "{app}\extension"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "scripts\install-extension.ps1"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\LingoDub"; Filename: "{app}\LingoDub.exe"
Name: "{group}\Install browser extension"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\install-extension.ps1"""
Name: "{autodesktop}\LingoDub"; Filename: "{app}\LingoDub.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"; Flags: checkedonce

[Run]
Filename: "{app}\LingoDub.exe"; Description: "Launch LingoDub"; Flags: nowait postinstall skipifsilent
