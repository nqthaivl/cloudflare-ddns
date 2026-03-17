"""
build_spk.py - Build Synology SPK Package
Uses USTAR tar format for maximum Synology compatibility
"""
import os, sys, io, tarfile, shutil, re, time
from pathlib import Path

PACKAGE_NAME = "CfDDNSManager"

BASE_DIR = Path(__file__).parent.resolve()
SPK_DIR  = BASE_DIR / "spk"
DIST_DIR = BASE_DIR / "dist"
BUILD_DIR = BASE_DIR / "build_temp"

def get_next_version():
    """Read current version from INFO, increment build number, save back."""
    info_path = SPK_DIR / "INFO"
    info_text = info_path.read_text(encoding="utf-8")
    match = re.search(r'version="([^"]+)"', info_text)
    if not match:
        return "1.0-0001"
    
    current = match.group(1)  # e.g. "1.0-0012"
    parts = current.split("-")
    if len(parts) == 2 and parts[1].isdigit():
        major = parts[0]
        build_num = int(parts[1]) + 1
        new_version = f"{major}-{build_num:04d}"
    else:
        new_version = current + "-0001"
    
    # Update INFO file
    new_info = re.sub(r'version="[^"]*"', f'version="{new_version}"', info_text)
    info_path.write_text(new_info, encoding="utf-8")
    print(f"  Version: {current} -> {new_version}")
    return new_version

VERSION = sys.argv[1] if len(sys.argv) > 1 else None
SPK_NAME = None  # Set in build()

APP_FILES = ["app.py", "auth.py", "cloudflare_api.py", "ddns_service.py", "requirements.txt"]
APP_DIRS = ["templates", "static"]

def to_lf(data: bytes) -> bytes:
    return data.replace(b"\r\n", b"\n").replace(b"\r", b"\n")

def tar_add_bytes(tar, name, data, mode=0o644, is_dir=False):
    info = tarfile.TarInfo(name=name)
    if is_dir:
        info.type = tarfile.DIRTYPE
        info.mode = 0o755
        info.size = 0
        tar.addfile(info)
    else:
        info.size = len(data)
        info.mode = mode
        info.mtime = int(time.time())
        info.uid = 0
        info.gid = 0
        info.uname = "root"
        info.gname = "root"
        tar.addfile(info, io.BytesIO(data))

def build():
    global VERSION, SPK_NAME
    
    if VERSION is None:
        VERSION = get_next_version()
    SPK_NAME = f"{PACKAGE_NAME}_{VERSION}.spk"
    
    print("=" * 50)
    print(f" CF DDNS Manager - Build SPK (v{VERSION})")
    print("=" * 50)

    if BUILD_DIR.exists(): shutil.rmtree(BUILD_DIR)
    BUILD_DIR.mkdir()
    DIST_DIR.mkdir(exist_ok=True)

    # -- 1. Create package.tgz --
    print("\n[1/3] Creating package.tgz ...")
    pkg_buf = io.BytesIO()
    with tarfile.open(fileobj=pkg_buf, mode="w:gz", format=tarfile.USTAR_FORMAT) as pkg:
        for fname in APP_FILES:
            src = BASE_DIR / fname
            if src.exists():
                data = to_lf(src.read_bytes())
                tar_add_bytes(pkg, fname, data)
                print(f"  + {fname} ({len(data)}b)")

        for dname in APP_DIRS:
            src_dir = BASE_DIR / dname
            if not src_dir.exists(): continue
            tar_add_bytes(pkg, dname + "/", b"", is_dir=True)
            for f in sorted(src_dir.rglob("*")):
                arc = f.relative_to(BASE_DIR).as_posix()
                if f.is_dir():
                    tar_add_bytes(pkg, arc + "/", b"", is_dir=True)
                else:
                    data = f.read_bytes()
                    tar_add_bytes(pkg, arc, data)
            print(f"  + {dname}/")

    pkg_bytes = pkg_buf.getvalue()
    print(f"  OK ({len(pkg_bytes)} bytes)")

    # -- 2. Prepare SPK components --
    print("\n[2/3] Preparing SPK components ...")

    info_raw = to_lf((SPK_DIR / "INFO").read_bytes())
    info_text = info_raw.decode("utf-8")
    info_text = re.sub(r'version="[^"]*"', f'version="{VERSION}"', info_text)
    info_text = "\n".join(line.rstrip() for line in info_text.strip().split("\n")) + "\n"
    info_bytes = info_text.encode("utf-8")
    print(f"  + INFO ({len(info_bytes)}b)")

    script_names = ["start-stop-status", "preinst", "postinst", "preuninst"]
    scripts = {}
    for sn in script_names:
        sp = SPK_DIR / "scripts" / sn
        if sp.exists():
            scripts[sn] = to_lf(sp.read_bytes())
            print(f"  + scripts/{sn} ({len(scripts[sn])}b)")

    priv_path = SPK_DIR / "conf" / "privilege"
    priv_bytes = to_lf(priv_path.read_bytes()) if priv_path.exists() else \
        b'{\n    "defaults": {\n        "run-as": "package"\n    }\n}\n'
    print(f"  + conf/privilege ({len(priv_bytes)}b)")

    icons = {}
    for iname in ["PACKAGE_ICON.PNG", "PACKAGE_ICON_256.PNG"]:
        ip = SPK_DIR / iname
        if ip.exists():
            icons[iname] = ip.read_bytes()
            print(f"  + {iname} ({len(icons[iname])}b)")

    # -- 3. Build .spk --
    print(f"\n[3/3] Building {SPK_NAME} ...")
    spk_path = DIST_DIR / SPK_NAME

    with tarfile.open(str(spk_path), "w:", format=tarfile.USTAR_FORMAT) as spk:
        tar_add_bytes(spk, "INFO", info_bytes)
        tar_add_bytes(spk, "package.tgz", pkg_bytes)

        tar_add_bytes(spk, "scripts/", b"", is_dir=True)
        for sn, sd in scripts.items():
            tar_add_bytes(spk, f"scripts/{sn}", sd, mode=0o755)

        tar_add_bytes(spk, "conf/", b"", is_dir=True)
        tar_add_bytes(spk, "conf/privilege", priv_bytes)

        for iname, idata in icons.items():
            tar_add_bytes(spk, iname, idata)

        ui_dir = SPK_DIR / "ui"
        if ui_dir.exists():
            tar_add_bytes(spk, "ui/", b"", is_dir=True)
            for f in sorted(ui_dir.rglob("*")):
                arc = "ui/" + f.relative_to(ui_dir).as_posix()
                if f.is_dir():
                    tar_add_bytes(spk, arc + "/", b"", is_dir=True)
                else:
                    data = f.read_bytes()
                    if f.name == "config":
                        data = to_lf(data)
                    tar_add_bytes(spk, arc, data)
                    print(f"  + {arc} ({len(data)}b)")

    shutil.rmtree(BUILD_DIR)

    sz = round(spk_path.stat().st_size / 1024, 1)
    print(f"\n{'='*50}")
    print(f" BUILD OK!  {SPK_NAME}  ({sz} KB)")
    print(f" Path: {DIST_DIR}")
    print(f"{'='*50}")
    print(f"\n DSM -> Package Center -> Manual Install -> Upload")

    os.startfile(str(DIST_DIR))

if __name__ == "__main__":
    build()
