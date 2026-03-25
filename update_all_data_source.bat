@echo off
REM Exit on error
setlocal enabledelayedexpansion

REM Set script directory
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM Define repositories as name|url pairs
set "repos[0]=FluSight-forecast-hub|https://github.com/cdcepi/FluSight-forecast-hub.git"
set "repos[1]=rsv-forecast-hub|https://github.com/CDCgov/rsv-forecast-hub.git"
set "repos[2]=covid19-forecast-hub|https://github.com/CDCgov/covid19-forecast-hub.git"
set "repos[3]=flu-metrocast|https://github.com/reichlab/flu-metrocast.git"

REM Process each repository
for /L %%i in (0,1,3) do (
  set "entry=!repos[%%i]!"
  
  REM Split entry by pipe delimiter
  for /f "tokens=1,2 delims=|" %%a in ("!entry!") do (
    set "repo_dir=%%a"
    set "repo_url=%%b"
    
    echo Processing: !repo_dir! from !repo_url!
    
    REM Check if git repo exists
    if exist "!repo_dir!\.git" (
      echo Pulling !repo_dir!...
      git -C "!repo_dir!" pull --ff-only
      if !errorlevel! neq 0 (
        echo Error pulling !repo_dir!
        exit /b 1
      )
    ) else if exist "!repo_dir!" (
      echo Error: Directory !repo_dir! exists but is not a git repository. Aborting.
      exit /b 1
    ) else (
      echo Cloning !repo_dir!...
      git clone "!repo_url!" "!repo_dir!"
      if !errorlevel! neq 0 (
        echo Error cloning !repo_dir!
        exit /b 1
      )
    )
  )
)

REM Create output directory
if not exist "app\public\processed_data" (
  mkdir "app\public\processed_data"
)

REM Run Python script
echo Running data processing script...
python scripts/process_RespiLens_data.py ^
  --output-path "%SCRIPT_DIR%app\public\processed_data" ^
  --flusight-hub-path "%SCRIPT_DIR%FluSight-forecast-hub" ^
  --rsv-hub-path "%SCRIPT_DIR%rsv-forecast-hub" ^
  --covid-hub-path "%SCRIPT_DIR%covid19-forecast-hub" ^
  --flu-metrocast-hub-path "%SCRIPT_DIR%flu-metrocast" ^
  --NHSN

if !errorlevel! neq 0 (
  echo Error running data processing script
  exit /b 1
)

echo All data sources updated successfully!
endlocal
