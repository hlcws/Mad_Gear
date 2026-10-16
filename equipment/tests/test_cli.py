"""Tests for CLI argument parsing, config loading, and characteristic resolution."""

from unittest.mock import MagicMock
import pytest
from equipment.bt_spi import find_write_characteristic, parse_args
from equipment.protocol import WRITE_UUID, LEGACY_WRITE_UUID


def test_find_write_characteristic_exact_match():
    mock_char = MagicMock()
    mock_char.uuid = WRITE_UUID
    mock_char.properties = ["write", "write-without-response"]

    mock_service = MagicMock()
    mock_service.characteristics = [mock_char]

    mock_client = MagicMock()
    mock_client.services = [mock_service]

    found = find_write_characteristic(mock_client)
    assert found == WRITE_UUID


def test_find_write_characteristic_legacy_match():
    mock_char = MagicMock()
    mock_char.uuid = LEGACY_WRITE_UUID
    mock_char.properties = ["write"]

    mock_service = MagicMock()
    mock_service.characteristics = [mock_char]

    mock_client = MagicMock()
    mock_client.services = [mock_service]

    found = find_write_characteristic(mock_client)
    assert found == LEGACY_WRITE_UUID


def test_find_write_characteristic_custom_override():
    mock_client = MagicMock()
    custom_uuid = "00001234-0000-1000-8000-00805f9b34fb"
    found = find_write_characteristic(mock_client, preferred_uuid=custom_uuid)
    assert found == custom_uuid


def test_parse_args_scan():
    args = parse_args(["scan", "--timeout", "10", "--all"])
    assert args.command == "scan"
    assert args.timeout == 10
    assert args.all is True


def test_parse_args_power_with_default_address():
    args = parse_args(["power", "--state", "on"])
    assert args.command == "power"
    assert args.address == "08:65:F0:46:BE:98"
    assert args.state == "on"


def test_parse_args_color_with_default_address():
    args = parse_args([
        "color",
        "--rgb", "255", "128", "0",
        "--brightness", "80",
    ])
    assert args.command == "color"
    assert args.address == "08:65:F0:46:BE:98"
    assert args.rgb == [255, 128, 0]
    assert args.brightness == 80


def test_parse_args_config_with_defaults():
    args = parse_args(["config"])
    assert args.command == "config"
    assert args.address == "08:65:F0:46:BE:98"
    assert args.ic == "ws2812b"
    assert args.order == "grb"
    assert args.pixels == 100
    assert args.segments == 1


def test_parse_args_status_with_default_address():
    args = parse_args(["status"])
    assert args.command == "status"
    assert args.address == "08:65:F0:46:BE:98"
