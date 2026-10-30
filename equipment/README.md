# MadGear Equipment & LED Control

Bluetooth Low Energy (BLE) tools to control club lighting and addressable SPI LED strips (WS2812B/WS2811) over Bluetooth.

## Verified Hardware
- **Controller**: Zengge / Magic Hue Bluetooth SPI Controller (`LEDnetWF0200A346BE98`)
- **Default MAC**: `08:65:F0:46:BE:98` (saved in `config.json`)
- **Model ID**: `0xA3` (Symphony addressable SPI strip)
- **Driver IC**: `WS2812B`
- **Color Order**: `GRB`
- **Default Pixels**: 100

---

## Quick Setup

Needs Python 3.10+ on the stream/local PC:

```powershell
pip install -r equipment/requirements.txt
```

---

## Usage

All commands automatically use `config.json` for `--address` if omitted.

### 1. Check Status
```powershell
python equipment/bt_spi.py status
```
Outputs live power state, current color, driver IC, and pixel count.

### 2. Set Color
```powershell
# Red
python equipment/bt_spi.py color --rgb 255 0 0

# Blue
python equipment/bt_spi.py color --rgb 0 0 255

# Yellow
python equipment/bt_spi.py color --rgb 255 255 0

# Brightness (0-100%)
python equipment/bt_spi.py color --rgb 255 0 0 --brightness 50
```

### 3. Power Control
```powershell
python equipment/bt_spi.py power --state on
python equipment/bt_spi.py power --state off
```

### 4. Reconfigure LED Strip (IC & Pixel Count)
```powershell
# Set 150 WS2812B pixels, GRB ordering
python equipment/bt_spi.py config --ic ws2812b --order grb --pixels 150
```

### 5. Scan Nearby BLE Devices
```powershell
python equipment/bt_spi.py scan
```

---

## Notes & Gotchas
- **Exclusivity**: Only one device (PC or phone app) can connect over BLE at a time. If the official Magic Hue / Zengge mobile app is open, close/disconnect it before controlling from PC.
- **Factory Settings**: The controller factory default was set to `UCS2904B` (IC Type 11) with 30 pixels. It must be configured to `WS2812B` (Type 1) for WS2812 strips to receive data.
