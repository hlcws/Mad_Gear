"""Protocol definitions, frame builders, and packet validators for Zengge BT-SPI controllers."""

from __future__ import annotations

import colorsys
from enum import IntEnum
from typing import Final, Mapping, Sequence


WRITE_UUID: Final[str] = "0000ff01-0000-1000-8000-00805f9b34fb"
NOTIFY_UUID: Final[str] = "0000ff02-0000-1000-8000-00805f9b34fb"
LEGACY_WRITE_UUID: Final[str] = "0000ffe1-0000-1000-8000-00805f9b34fb"

# Known Zengge manufacturer IDs: 0x5A00 - 0x5A8F (23040 - 23183)
ZENGGE_MFR_ID_MIN: Final[int] = 0x5A00
ZENGGE_MFR_ID_MAX: Final[int] = 0x5A8F

KNOWN_NAME_PREFIXES: Final[tuple[str, ...]] = (
    "LEDnet",
    "ZJ-",
    "AK001",
    "IOTBT",
    "Triones",
    "BLE-LED",
)


class LedType(IntEnum):
    """Supported SPI LED driver IC types."""
    SM16703 = 0
    WS2812B = 1
    SM16716 = 2
    SK6812 = 3
    INK1003 = 4
    WS2811 = 5
    WS2801 = 6
    WS2815 = 7
    SK6812_RGBW = 8
    TM1914 = 9
    UCS1903 = 10
    UCS2904B = 11


class ColorOrder(IntEnum):
    """Color order sequence for SPI LED strip."""
    RGB = 0
    RBG = 1
    GRB = 2
    GBR = 3
    BRG = 4
    BGR = 5


def calc_checksum(data: Sequence[int]) -> int:
    """Calculate 8-bit sum modulo 256 checksum."""
    return sum(data) & 0xFF


def wrap_command(
    raw_payload: Sequence[int] | bytes | bytearray,
    cmd_family: int = 0x0B,
    seq: int = 0,
) -> bytes:
    """Wrap a raw command in the 8-byte Zengge BLE transport layer header."""
    payload_len = len(raw_payload)
    pkt = bytearray(8 + payload_len)
    pkt[0] = 0x00                       # Version 0, unsegmented
    pkt[1] = seq & 0xFF                 # Sequence number
    pkt[2] = 0x80                       # Frag control high
    pkt[3] = 0x00                       # Frag control low
    pkt[4] = (payload_len >> 8) & 0xFF  # Total payload length high
    pkt[5] = payload_len & 0xFF         # Total payload length low
    pkt[6] = (payload_len + 1) & 0xFF   # Payload length + 1 (cmdId included)
    pkt[7] = cmd_family & 0xFF          # 0x0A (query) or 0x0B (command)
    pkt[8:] = bytes(raw_payload)
    return bytes(pkt)


def rgb_to_hsv(r: int, g: int, b: int) -> tuple[int, int, int]:
    """Convert RGB (0-255) to HSV (hue 0-360, sat 0-100, val 0-100)."""
    h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
    return (int(h * 360), int(s * 100), int(v * 100))


def pack_hue_saturation(h: int, s: int) -> tuple[int, int]:
    """Pack hue (0-360) and saturation (0-100) into 2 bytes."""
    packed = (h << 7) | s
    return (packed >> 8) & 0xFF, packed & 0xFF


def build_power_packet(turn_on: bool, seq: int = 0) -> bytes:
    """Build power ON/OFF packet using 0x3B format wrapped in transport header."""
    mode = 0x23 if turn_on else 0x24
    raw = bytearray([0x3B, mode, 0, 0, 0, 0, 0, 0, 0, 0x32, 0, 0])
    raw.append(calc_checksum(raw))
    return wrap_command(raw, cmd_family=0x0B, seq=seq)


def build_color_packet(
    r: int,
    g: int,
    b: int,
    brightness: int = 100,
    seq: int = 0,
) -> bytes:
    """Build solid color packet in 0x3B format wrapped in transport header."""
    for name, val in (("r", r), ("g", g), ("b", b)):
        if not (0 <= val <= 255):
            raise ValueError(f"{name} must be between 0 and 255, got {val}")
    if not (0 <= brightness <= 100):
        raise ValueError(f"brightness must be between 0 and 100, got {brightness}")

    h, s, _ = rgb_to_hsv(r, g, b)
    hs_hi, hs_lo = pack_hue_saturation(h, s)

    raw = bytearray([
        0x3B,
        0xA1,  # Solid color mode
        hs_hi,
        hs_lo,
        brightness & 0xFF,
        0x00,
        0x00,
        r & 0xFF,
        g & 0xFF,
        b & 0xFF,
        0x00,
        0x00,
    ])
    raw.append(calc_checksum(raw))
    return wrap_command(raw, cmd_family=0x0B, seq=seq)


def build_config_packet(
    led_count: int,
    segments: int,
    led_type: LedType,
    color_order: ColorOrder,
    music_led_count: int = 30,
    music_segments: int = 10,
    seq: int = 0,
) -> bytes:
    """Build SPI IC type, segment, and pixel configuration packet (0x62 A3+ format)."""
    if not (1 <= led_count <= 2048):
        raise ValueError(f"led_count must be between 1 and 2048, got {led_count}")
    if not (1 <= segments <= 100):
        raise ValueError(f"segments must be between 1 and 100, got {segments}")

    raw = bytearray([
        0x62,
        (led_count >> 8) & 0xFF,
        led_count & 0xFF,
        (segments >> 8) & 0xFF,
        segments & 0xFF,
        int(led_type) & 0xFF,
        int(color_order) & 0xFF,
        music_led_count & 0xFF,
        music_segments & 0xFF,
        0xF0,  # Persist flag
    ])
    raw.append(calc_checksum(raw))
    return wrap_command(raw, cmd_family=0x0B, seq=seq)


def build_query_packet(seq: int = 0) -> bytes:
    """Build device state query packet (0x81)."""
    raw = bytes([0x81, 0x8A, 0x8B, 0x96])
    return wrap_command(raw, cmd_family=0x0A, seq=seq)


def build_led_settings_query(seq: int = 0) -> bytes:
    """Build LED settings query packet (0x63)."""
    raw = bytearray([0x63, 0x12, 0x21, 0xF0])
    raw.append(calc_checksum(raw))
    return wrap_command(raw, cmd_family=0x0A, seq=seq)


def is_zengge_device(
    name: str | None,
    manufacturer_data: Mapping[int, bytes] | None = None,
) -> bool:
    """Detect if advertisement belongs to a Zengge / Magic Hue controller."""
    if name:
        for prefix in KNOWN_NAME_PREFIXES:
            if name.startswith(prefix):
                return True

    if manufacturer_data:
        for mfr_id in manufacturer_data.keys():
            if ZENGGE_MFR_ID_MIN <= mfr_id <= ZENGGE_MFR_ID_MAX:
                return True

    return False
