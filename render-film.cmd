@echo off
rem Render "Going Exponential" (1080p60) with a live progress bar.
rem Extra options are passed through, e.g.:  render-film.cmd --jobs 8 --samples 6
rem   --jobs N      parallel headless-Chrome workers (default 6)
rem   --samples N   motion-blur sub-frames per frame (default 4)
rem   --cq N        NVENC constant quality, lower = better (default 21)
rem   --encoder x264  use the CPU encoder instead of NVENC
rem   --fresh       discard finished chunks and start over
cd /d "%~dp0app"
node scripts\render-film.mjs %*
pause
