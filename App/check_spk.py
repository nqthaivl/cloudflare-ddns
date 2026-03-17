import tarfile
from PIL import Image
import io

spk = tarfile.open('dist/CfDDNSManager_1.0-0017.spk', 'r:')
for m in spk.getmembers():
    if m.name == 'INFO':
        data = spk.extractfile(m).read().decode()
        for line in data.splitlines():
            if any(k in line for k in ['adminport','adminurl','adminprotocol','checkport','dsmuidir','dsmappname','startable']):
                print(f'  INFO: {line}')
    if m.name in ['PACKAGE_ICON.PNG', 'PACKAGE_ICON_256.PNG']:
        data = spk.extractfile(m).read()
        img = Image.open(io.BytesIO(data))
        print(f'  {m.name}: {img.size[0]}x{img.size[1]} ({len(data)//1024}KB)')
    if 'ui/config' in m.name:
        data = spk.extractfile(m).read().decode()
        print(f'  ui/config type: {"embedded" if "embedded" in data else "url"}')
spk.close()
