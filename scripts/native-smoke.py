"""Run the real bundle and require per-WebView React/IPC/DB evidence plus normal exit.
Only use on disposable CI runners. No arbitrary sleeps can satisfy this gate.
"""
import json
import os
from pathlib import Path
import subprocess
import sys
import time

# Keep Chinese/emoji evidence readable on Windows runners with a legacy console code page.
sys.stdout.reconfigure(encoding='utf-8')
reserve_toggle = '--reserve-toggle' in sys.argv[3:]
user32 = None
if reserve_toggle:
    import ctypes
    user32 = ctypes.windll.user32
    if not user32.RegisterHotKey(None, 713, 0x0001 | 0x0002, 0x42):
        raise RuntimeError('Cannot reserve Ctrl+Alt+B for the conflict test')

binary = Path(sys.argv[1]).resolve()
report = Path(sys.argv[2]).resolve()
report.unlink(missing_ok=True)
env = dict(os.environ, CI='true', WORKBENCH_NATIVE_SMOKE=str(report))
with report.with_suffix('.log').open('w', encoding='utf-8') as log:
    process = subprocess.Popen([str(binary)], env=env, stdout=log, stderr=log)
    try:
        deadline = time.monotonic() + 120
        while process.poll() is None and time.monotonic() < deadline:
            time.sleep(0.25)
        if process.poll() is None:
            raise RuntimeError('No completed WebView handshake / normal exit within 120 seconds')
        assert process.returncode == 0, f'app exit code {process.returncode}'
        result = json.loads(report.read_text(encoding='utf-8'))
        assert result['ok'], result
        assert set(result['webviews']) == {'main', 'quick-memo', 'pomodoro-float'}, result
        for value in result['webviews'].values():
            assert value['ok'] and value['checks']['rendered'] and not value['errors'], value
        assert result['webviews']['main']['checks']['backupRoundtrip'], result
        if reserve_toggle:
            assert 'Ctrl+Alt+B' in result['webviews']['main']['checks']['shortcutWarnings'], result
            assert result['webviews']['main']['checks']['shortcutWarningVisible'], result
        print(json.dumps(result, ensure_ascii=False, indent=2))
        print('PASS: 3 rendered WebViews, IPC, IndexedDB/schema, backup boundary, native APIs, normal exit')
    finally:
        if process.poll() is None:
            process.kill()
            process.wait(timeout=15)

        if user32 is not None:
            user32.UnregisterHotKey(None, 713)
