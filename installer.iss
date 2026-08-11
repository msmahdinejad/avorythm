#define MyAppName "LingoDub"
#define MyAppVersion "0.3.0"
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

[Icons]
Name: "{group}\LingoDub"; Filename: "{app}\LingoDub.exe"
Name: "{autodesktop}\LingoDub"; Filename: "{app}\LingoDub.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"; Flags: checkedonce

[Run]
Filename: "{app}\LingoDub.exe"; Description: "Launch LingoDub"; Flags: nowait postinstall skipifsilent
