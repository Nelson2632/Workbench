"""Launch the actual .app executable; check process survival and retain a screen capture.
This is a packaging/startup smoke, not a substitute for WebView interaction tests.
"""
from pathlib import Path
import plistlib
import subprocess
import time
apps = list(Path('src-tauri/target/release/bundle/macos').glob('*.app'))
assert len(apps) == 1, apps
app = apps[0]
with (app / 'Contents/Info.plist').open('rb') as stream:
    info = plistlib.load(stream)
assert info['CFBundleShortVersionString'].startswith('1.1.0'), info
binary = app / 'Contents/MacOS' / info['CFBundleExecutable']
with open('native-smoke.log', 'w') as log:
    process = subprocess.Popen([str(binary.resolve())], stdout=log, stderr=log)
    try:
        for _ in range(20):
            if process.poll() is not None:
                raise RuntimeError(f'app exited early: {process.returncode}')
            time.sleep(1)
        # System Events requires accessibility on hosted runner; query application
        # process existence only (not UI scripting) and retain screenshot for review.
        result = subprocess.check_output(['osascript', '-e', f'tell application "System Events" to exists (processes whose unix id is {process.pid})'], text=True)
        assert result.strip() == 'true', result
        subprocess.run(['screencapture', '-x', 'native-smoke.png'], check=True)
        print(f'PASS: {binary.name}, pid={process.pid}, alive after 20s; screenshot retained')
    finally:
        process.terminate()
        process.wait(timeout=15)
