@ECHO OFF

ECHO Deleting existing archives...
DEL /P *.7z *.zip
ECHO Done.

SET title="HLAE-CamIO-To-AE-Cam"
SET sevzip="C:\Program Files\7-Zip\7z.exe"
SET /P versionMajor="Version Major: "
SET /P versionMinor="Version Minor: "
SET filelist=%title%_%versionMajor%_%versionMinor%.jsx INSTALLATION.txt
SET archName="%title%_%versionMajor%_%versionMinor%"

COPY %title%.jsx %title%_%versionMajor%_%versionMinor%.jsx

%sevzip% a -t7z %archName%.7z %filelist%
%sevzip% a -tzip %archName%.zip %filelist%

DEL %title%_%versionMajor%_%versionMinor%.jsx

ECHO.
ECHO Packaged.