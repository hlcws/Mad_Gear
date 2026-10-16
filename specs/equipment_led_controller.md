# Specification: Port BT-SPI LED Controller into Mad_Gear/equipment

## 1. Goal
Integrate the tested Zengge / Magic Hue BT-SPI LED controller tool into `C:\GIT PRIV\Mad_Gear\equipment\` as a standalone CLI package for managing club and stream lighting hardware.

---

## 2. Assumptions & Architecture
- **Location**: `C:\GIT PRIV\Mad_Gear\equipment\`
- **Branch**: `stream-overlays` (current working branch of `Mad_Gear`).
- **Target Hardware**: Zengge / Magic Hue BT-SPI / Symphony controller (`08:65:F0:46:BE:98`, Product ID `0xA3`, WS2812B strips).
- **Default Controller**: The CLI should support an optional `--address` or fall back to a saved config/constant for the club's controller (`08:65:F0:46:BE:98`), reducing friction during streams.
- **Integration Scope**: Standalone CLI inside `equipment/` for this session; HTTP API hooks in `stream/server.mjs` deferred to a future session.

---

## 3. Directory Layout
```
Mad_Gear/
├── equipment/
│   ├── README.md               # Hardware setup, wiring, and CLI usage guide
│   ├── requirements.txt        # bleak, pytest
│   ├── config.json             # Default controller address & strip settings
│   ├── bt_spi.py               # CLI tool (scan, status, power, color, config)
│   ├── protocol.py             # Zengge A3+ framing, checksum, 8-byte transport header
│   └── tests/
│       ├── __init__.py
│       ├── test_protocol.py    # Unit tests for framing, checksum, HSV packing
│       └── test_cli.py         # Unit tests for CLI parsing & char resolution
├── specs/
│   └── equipment_led_controller.md
└── progress.md                 # Updated with equipment section & status
```

---

## 4. Interface & Behaviour

### CLI Usage
```powershell
# In Mad_Gear root:
python equipment/bt_spi.py status
python equipment/bt_spi.py color --rgb 255 0 0        # Red (defaults to saved address)
python equipment/bt_spi.py color --rgb 0 0 255        # Blue
python equipment/bt_spi.py color --rgb 255 255 0      # Yellow
python equipment/bt_spi.py power --state off
python equipment/bt_spi.py scan                       # Scan nearby devices
```

---

## 5. Acceptance Checks

### Automated Tests (`pytest`)
- [ ] All 17 unit tests pass for protocol framing, transport header, and CLI resolution.
- [ ] Config loading falls back to `config.json` default address when `--address` is omitted.

### Verification & Documentation
- [ ] Git status clean after atomic commit.
- [ ] `progress.md` updated with equipment state, verified hardware, and gotchas.

---

## 6. Effort & Next Steps
- **T-Shirt Size**: **XS** (< 30 minutes, 1 session).
- **What I (Agent) will do**:
  - Write files into `C:\GIT PRIV\Mad_Gear\equipment\`.
  - Run test suite to verify 100% pass rate.
  - Update `progress.md` and commit to `stream-overlays`.
- **What You (User) will do**:
  - Test setting color from within `Mad_Gear` directory.
