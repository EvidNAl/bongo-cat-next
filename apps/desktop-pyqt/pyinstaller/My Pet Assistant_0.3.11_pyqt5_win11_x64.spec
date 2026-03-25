# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['E:\\Onedrive\\Desktop\\Bongo\\apps\\desktop-pyqt\\main.py'],
    pathex=[],
    binaries=[],
    datas=[('E:\\Onedrive\\Desktop\\Bongo\\apps\\desktop\\src-tauri\\icons\\icon.ico', 'assets'), ('E:\\Onedrive\\Desktop\\Bongo\\apps\\desktop\\src-tauri\\assets\\tray.png', 'assets'), ('E:\\Onedrive\\Desktop\\Bongo\\apps\\desktop-pyqt\\assets', 'assets')],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='My Pet Assistant_0.3.11_pyqt5_win11_x64',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['E:\\Onedrive\\Desktop\\Bongo\\apps\\desktop\\src-tauri\\icons\\icon.ico'],
)
