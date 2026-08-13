#define MyAppName "Lingora"
#define MyAppVersion "0.9.1"
#define MyAppPublisher "Mohammad Saleh Mahdinejad"
#define MyAppURL "https://github.com/msmahdinejad/lingora"

[Setup]
AppId={{AFCD98B9-7323-4FE9-BCCF-C105D2148BB1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={localappdata}\Programs\Lingora
DefaultGroupName=Lingora
UsePreviousAppDir=no
PrivilegesRequired=lowest
OutputDir=dist
OutputBaseFilename=Lingora-Setup-x64
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupIconFile=extension\icons\Lingora.ico
UninstallDisplayIcon={app}\Lingora.exe
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Files]
Source: "dist\Lingora\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[InstallDelete]
Type: filesandordirs; Name: "{localappdata}\Programs\Voxilyra"
Type: filesandordirs; Name: "{localappdata}\Programs\LingoDub"
Type: filesandordirs; Name: "{localappdata}\Programs\Dubira"
Type: filesandordirs; Name: "{localappdata}\Programs\Lingora"

[Icons]
Name: "{group}\Lingora"; Filename: "{app}\Lingora.exe"
Name: "{autodesktop}\Lingora"; Filename: "{app}\Lingora.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"; Flags: checkedonce
Name: "ffmpeg"; Description: "Install FFmpeg for uploaded audio/video processing (recommended)"; GroupDescription: "Optional components:"; Flags: checkedonce

[Run]
Filename: "{cmd}"; Parameters: "/c winget install --id Gyan.FFmpeg --exact --silent --accept-package-agreements --accept-source-agreements --scope user"; StatusMsg: "Installing FFmpeg for media processing..."; Tasks: ffmpeg; Check: WingetAvailable; Flags: runhidden waituntilterminated
Filename: "{app}\Lingora.exe"; Description: "Launch Lingora"; Flags: nowait postinstall skipifsilent

[Code]
function WingetAvailable: Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec(ExpandConstant('{cmd}'), '/c where winget >nul 2>&1', '', SW_HIDE,
    ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;
