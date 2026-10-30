"""Tests for Zengge / Magic Hue BT-SPI protocol and frame builder."""

import pytest
from equipment.protocol import (
    calc_checksum,
    wrap_command,
    rgb_to_hsv,
    pack_hue_saturation,
    build_power_packet,
    build_color_packet,
    build_config_packet,
    build_query_packet,
    is_zengge_device,
    LedType,
    ColorOrder,
    WRITE_UUID,
)


def test_calc_checksum():
    assert calc_checksum([0x71, 0x23, 0x0F]) == 0xA3
    assert calc_checksum([0x71, 0x24, 0x0F]) == 0xA4
    assert calc_checksum([0xFF, 0x02]) == 0x01


def test_wrap_command():
    payload = bytes([0x81, 0x8A, 0x8B, 0x96])
    wrapped = wrap_command(payload, cmd_family=0x0A, seq=1)
    assert len(wrapped) == 8 + len(payload)
    assert wrapped[0] == 0x00
    assert wrapped[1] == 0x01
    assert wrapped[2:4] == bytes([0x80, 0x00])
    assert wrapped[4:6] == bytes([0x00, 0x04])
    assert wrapped[6] == 0x05
    assert wrapped[7] == 0x0A
    assert wrapped[8:] == payload


def test_pack_hue_saturation():
    hi, lo = pack_hue_saturation(0, 100)
    assert (hi, lo) == (0, 100)

    hi, lo = pack_hue_saturation(240, 100)
    assert (hi, lo) == (0x78, 0x64)


def test_power_packet():
    on_pkt = build_power_packet(True, seq=1)
    assert len(on_pkt) == 21
    assert on_pkt[0] == 0x00
    assert on_pkt[7] == 0x0B
    assert on_pkt[8] == 0x3B
    assert on_pkt[9] == 0x23

    off_pkt = build_power_packet(False, seq=1)
    assert len(off_pkt) == 21
    assert off_pkt[9] == 0x24


def test_color_packet_valid():
    pkt = build_color_packet(0, 0, 255, brightness=100, seq=1)
    assert len(pkt) == 21
    assert pkt[8] == 0x3B
    assert pkt[9] == 0xA1
    assert pkt[10] == 0x78
    assert pkt[11] == 0x64
    assert pkt[12] == 100
    assert pkt[15:18] == bytes([0, 0, 255])


def test_color_packet_bounds():
    with pytest.raises(ValueError):
        build_color_packet(-1, 0, 0)
    with pytest.raises(ValueError):
        build_color_packet(0, 256, 0)
    with pytest.raises(ValueError):
        build_color_packet(0, 0, 0, brightness=-1)
    with pytest.raises(ValueError):
        build_color_packet(0, 0, 0, brightness=101)


def test_config_packet():
    pkt = build_config_packet(
        led_count=100,
        segments=1,
        led_type=LedType.WS2812B,
        color_order=ColorOrder.GRB,
        seq=1,
    )
    assert len(pkt) == 19
    assert pkt[8] == 0x62
    assert pkt[9:11] == bytes([0x00, 0x64])
    assert pkt[11:13] == bytes([0x00, 0x01])
    assert pkt[13] == int(LedType.WS2812B)
    assert pkt[14] == int(ColorOrder.GRB)
    assert pkt[17] == 0xF0


def test_query_packet():
    pkt = build_query_packet(seq=1)
    assert len(pkt) == 12
    assert pkt[7] == 0x0A
    assert pkt[8:] == bytes([0x81, 0x8A, 0x8B, 0x96])


def test_is_zengge_device():
    assert is_zengge_device("LEDnetWF123456", {}) is True
    assert is_zengge_device("ZJ-MBL-RGBW", {}) is True
    assert is_zengge_device("AK001-ZJ2101", {}) is True
    assert is_zengge_device("IOTBT-SP1", {}) is True
    assert is_zengge_device("Triones-1234", {}) is True
    assert is_zengge_device("RandomSpeaker", {}) is False
    assert is_zengge_device(None, {}) is False

    assert is_zengge_device(None, {0x5A00: b"\x01\x02"}) is True
    assert is_zengge_device(None, {0x5A50: b"\x01\x02"}) is True
    assert is_zengge_device("Unknown", {0x004C: b"\x02\x15"}) is False
