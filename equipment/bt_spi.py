"""CLI tool for discovering and controlling Zengge / Magic Hue BT-SPI LED controllers."""

from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path
import sys
from typing import Any, Sequence

from bleak import BleakClient, BleakScanner
from bleak.backends.characteristic import BleakGATTCharacteristic

try:
    from .protocol import (
        ColorOrder,
        LedType,
        LEGACY_WRITE_UUID,
        NOTIFY_UUID,
        WRITE_UUID,
        build_color_packet,
        build_config_packet,
        build_led_settings_query,
        build_power_packet,
        build_query_packet,
        is_zengge_device,
    )
except ImportError:
    from protocol import (
        ColorOrder,
        LedType,
        LEGACY_WRITE_UUID,
        NOTIFY_UUID,
        WRITE_UUID,
        build_color_packet,
        build_config_packet,
        build_led_settings_query,
        build_power_packet,
        build_query_packet,
        is_zengge_device,
    )


CONFIG_PATH = Path(__file__).parent / "config.json"


def load_config() -> dict[str, Any]:
    """Load default equipment configuration."""
    if CONFIG_PATH.is_file():
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def find_write_characteristic(
    client: Any,
    preferred_uuid: str | None = None,
) -> str:
    """Resolve write characteristic UUID from device services."""
    if preferred_uuid:
        return preferred_uuid

    fallback_uuid: str | None = None

    for service in getattr(client, "services", []):
        for char in getattr(service, "characteristics", []):
            uuid_str = str(getattr(char, "uuid", "")).lower()
            props = getattr(char, "properties", [])
            has_write = "write" in props or "write-without-response" in props

            if uuid_str == WRITE_UUID.lower() and has_write:
                return WRITE_UUID
            if uuid_str == LEGACY_WRITE_UUID.lower() and has_write:
                fallback_uuid = LEGACY_WRITE_UUID
            elif has_write and not fallback_uuid:
                fallback_uuid = str(char.uuid)

    return fallback_uuid or WRITE_UUID


def parse_args(args: Sequence[str] | None = None) -> argparse.Namespace:
    """Parse command line arguments with config.json defaults."""
    cfg = load_config()
    default_addr = cfg.get("default_address")
    default_ic = cfg.get("default_ic", "ws2812b")
    default_order = cfg.get("default_order", "grb")
    default_pixels = cfg.get("default_pixels", 100)
    default_segments = cfg.get("default_segments", 1)

    parser = argparse.ArgumentParser(
        prog="bt_spi",
        description="Bluetooth Zengge / Magic Hue BT-SPI LED Controller Tool",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # scan
    scan_parser = subparsers.add_parser("scan", help="Scan for BLE LED controllers")
    scan_parser.add_argument(
        "--timeout",
        type=float,
        default=5.0,
        help="Scanning timeout in seconds (default: 5.0)",
    )
    scan_parser.add_argument(
        "--all",
        action="store_true",
        help="Show all discovered BLE devices, not just Zengge matches",
    )

    # inspect
    inspect_parser = subparsers.add_parser(
        "inspect",
        help="Inspect GATT services and characteristics",
    )
    inspect_parser.add_argument(
        "--address",
        default=default_addr,
        required=default_addr is None,
        help=f"BLE address (default: {default_addr})",
    )

    # status
    status_parser = subparsers.add_parser("status", help="Query live power, color, and IC settings")
    status_parser.add_argument(
        "--address",
        default=default_addr,
        required=default_addr is None,
        help=f"BLE address (default: {default_addr})",
    )

    # power
    power_parser = subparsers.add_parser("power", help="Turn controller ON or OFF")
    power_parser.add_argument(
        "--address",
        default=default_addr,
        required=default_addr is None,
        help=f"BLE address (default: {default_addr})",
    )
    power_parser.add_argument(
        "--state",
        choices=["on", "off"],
        required=True,
        help="Desired power state",
    )
    power_parser.add_argument(
        "--char-uuid",
        default=None,
        help="Override write characteristic UUID",
    )

    # color
    color_parser = subparsers.add_parser("color", help="Set solid RGB color")
    color_parser.add_argument(
        "--address",
        default=default_addr,
        required=default_addr is None,
        help=f"BLE address (default: {default_addr})",
    )
    color_parser.add_argument(
        "--rgb",
        nargs=3,
        type=int,
        required=True,
        metavar=("R", "G", "B"),
        help="RGB color values (0-255 each)",
    )
    color_parser.add_argument(
        "--brightness",
        type=int,
        default=100,
        help="Brightness level 0-100 (default: 100)",
    )
    color_parser.add_argument(
        "--char-uuid",
        default=None,
        help="Override write characteristic UUID",
    )

    # config
    config_parser = subparsers.add_parser("config", help="Configure SPI IC & pixels")
    config_parser.add_argument(
        "--address",
        default=default_addr,
        required=default_addr is None,
        help=f"BLE address (default: {default_addr})",
    )
    config_parser.add_argument(
        "--ic",
        type=str,
        default=default_ic,
        choices=[e.name.lower() for e in LedType],
        help=f"SPI LED IC type (default: {default_ic})",
    )
    config_parser.add_argument(
        "--order",
        type=str,
        default=default_order,
        choices=[e.name.lower() for e in ColorOrder],
        help=f"Color channel order (default: {default_order})",
    )
    config_parser.add_argument(
        "--pixels",
        type=int,
        default=default_pixels,
        help=f"Total number of pixel ICs (default: {default_pixels})",
    )
    config_parser.add_argument(
        "--segments",
        type=int,
        default=default_segments,
        help=f"Number of strip segments (default: {default_segments})",
    )
    config_parser.add_argument(
        "--char-uuid",
        default=None,
        help="Override write characteristic UUID",
    )

    return parser.parse_args(args)


async def send_packet(
    address: str,
    packet: bytes,
    preferred_uuid: str | None = None,
) -> None:
    """Connect to BLE device and send packet."""
    print(f"Connecting to {address}...")
    async with BleakClient(address) as client:
        char_uuid = find_write_characteristic(client, preferred_uuid)
        print(f"Connected. Writing {len(packet)} bytes to {char_uuid}: {packet.hex(' ')}")

        char: BleakGATTCharacteristic | None = client.services.get_characteristic(char_uuid)
        use_response = True
        if char and "write-without-response" in char.properties and "write" not in char.properties:
            use_response = False

        await client.write_gatt_char(char_uuid, packet, response=use_response)
        print("Packet transmitted successfully.")


async def run_scan(timeout: float, show_all: bool) -> None:
    """Scan for BLE devices in range."""
    print(f"Scanning for BLE devices ({timeout:.1f}s)...")
    discovered = await BleakScanner.discover(timeout=timeout, return_adv=True)

    matches: list[tuple[str, str, int, bool]] = []
    for address, (device, adv) in discovered.items():
        name = device.name or adv.local_name or "Unknown"
        is_match = is_zengge_device(name, adv.manufacturer_data)
        if show_all or is_match:
            matches.append((address, name, adv.rssi, is_match))

    if not matches:
        print("No matching devices found.")
        if not show_all:
            print("Tip: Run with --all to inspect all nearby BLE devices.")
        return

    print("\nDiscovered Devices:")
    print(f"{'Address':<20} {'RSSI':<8} {'Match':<8} {'Name'}")
    print("-" * 60)
    for addr, name, rssi, is_match in sorted(matches, key=lambda x: x[2], reverse=True):
        match_str = "YES" if is_match else "no"
        print(f"{addr:<20} {rssi:<8} {match_str:<8} {name}")


async def run_inspect(address: str) -> None:
    """Inspect GATT services of a device."""
    print(f"Connecting to {address} to inspect GATT table...")
    async with BleakClient(address) as client:
        print(f"Connected to {address}. Enumerating services:\n")
        for service in client.services:
            print(f"Service: {service.uuid} ({service.description})")
            for char in service.characteristics:
                props = ", ".join(char.properties)
                print(f"  |-- Char: {char.uuid} [{props}] ({char.description})")
        print("\nTarget Write Characteristic:")
        print(f"  {find_write_characteristic(client)}")


async def run_status(address: str) -> None:
    """Query state and LED configuration via notifications."""
    print(f"Connecting to {address}...")
    responses: dict[str, bytes] = {}

    def on_notification(sender: Any, data: bytearray) -> None:
        raw = bytes(data)
        if len(raw) >= 9:
            payload = raw[8:]
            if payload[0] == 0x81:
                responses["state"] = payload
            elif len(payload) >= 2 and payload[1] == 0x63:
                responses["settings"] = payload

    async with BleakClient(address) as client:
        await client.start_notify(NOTIFY_UUID, on_notification)

        # 1. Query device state (power & current color)
        await client.write_gatt_char(WRITE_UUID, build_query_packet(), response=False)
        await asyncio.sleep(0.6)

        # 2. Query LED configuration (pixels & IC)
        await client.write_gatt_char(WRITE_UUID, build_led_settings_query(), response=False)
        await asyncio.sleep(0.6)

    print(f"\nDevice Status for {address}:")
    print("-" * 45)

    if "state" in responses:
        payload = responses["state"]
        is_on = payload[2] == 0x23 if len(payload) > 2 else False
        r = payload[6] if len(payload) > 6 else 0
        g = payload[7] if len(payload) > 7 else 0
        b = payload[8] if len(payload) > 8 else 0
        print(f"Power State   : {'ON' if is_on else 'OFF'}")
        print(f"Current Color : RGB({r}, {g}, {b})")
    else:
        print("Power / Color : No response received")

    if "settings" in responses:
        p = responses["settings"]
        if len(p) >= 8:
            led_count = (p[2] << 8) | p[3]
            segments = (p[4] << 8) | p[5]
            ic_int = p[6]
            order_int = p[7]
            try:
                ic_name = LedType(ic_int).name
            except ValueError:
                ic_name = f"Unknown ({ic_int})"
            try:
                order_name = ColorOrder(order_int).name
            except ValueError:
                order_name = f"Unknown ({order_int})"

            print(f"LED Count     : {led_count} pixels")
            print(f"Segments      : {segments}")
            print(f"Driver IC     : {ic_name}")
            print(f"Color Order   : {order_name}")
    else:
        print("LED Settings  : No response received")


async def main_async(args: argparse.Namespace) -> None:
    """Route command execution."""
    if args.command == "scan":
        await run_scan(timeout=args.timeout, show_all=args.all)
        return

    if args.command == "inspect":
        await run_inspect(address=args.address)
        return

    if args.command == "status":
        await run_status(address=args.address)
        return

    if args.command == "power":
        pkt = build_power_packet(args.state == "on")
        await send_packet(args.address, pkt, args.char_uuid)
        return

    if args.command == "color":
        r, g, b = args.rgb
        pkt = build_color_packet(r, g, b, brightness=args.brightness)
        await send_packet(args.address, pkt, args.char_uuid)
        return

    if args.command == "config":
        ic_type = LedType[args.ic.upper()]
        order = ColorOrder[args.order.upper()]
        pkt = build_config_packet(
            led_count=args.pixels,
            segments=args.segments,
            led_type=ic_type,
            color_order=order,
        )
        await send_packet(args.address, pkt, args.char_uuid)
        return


def main() -> None:
    """Entry point."""
    args = parse_args(sys.argv[1:])
    try:
        asyncio.run(main_async(args))
    except KeyboardInterrupt:
        print("\nAborted by user.")
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
