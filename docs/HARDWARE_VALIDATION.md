# Hardware Validation Status

This document records the current status of hardware support based on the project code and actual validation evidence available during Phase 11.

## Validation matrix

| Hardware | Software support | Physical validation | Notes |
| --- | --- | --- | --- |
| USB Barcode Scanner | Implemented | Pending | Keyboard-emulation scanner pattern is supported in the abstraction layer, but no scanner was physically connected for validation. |
| ESC/POS Thermal Printer | Implemented | Pending | Printer service supports configuration-based printing and test print flow; no physical printer was available during validation. |
| Cash Drawer | Implemented | Pending | Drawer access is triggered by hardware configuration and printer integration, but no actual drawer was connected and tested. |
| Customer Display | Implemented | Pending | Display support is abstracted for serial/USB integration and returns a clear limitation if not configured for supported hardware. |
| Label Printer | Architecture present | Pending | No direct label printer validation was completed in this environment. |

## Hardware details

### USB Barcode Scanner
Software Support:
- Scanner interaction is handled as an abstracted POS hardware capability.
- No direct device driver layer is claimed beyond the software abstraction.
Physical Validation:
- Pending.
Known Limitation:
- No scanner was connected during Phase 11 validation.
Expected Configuration:
- Keyboard-emulation USB scanner or compatible HID-style device.
Troubleshooting:
- Confirm the scanner is configured as a standard USB keyboard input device and test with the POS input flow.

### ESC/POS Thermal Printer
Software Support:
- Receipt print flow is implemented through the hardware printer service.
- Printer configuration can store connection details and test print actions.
Physical Validation:
- Pending.
Known Limitation:
- No physical receipt printer was available for testing.
Expected Configuration:
- Compatible ESC/POS thermal printer over USB or LAN depending the configured connection.
Troubleshooting:
- Verify printer connection, IP/port values, and test print function before production use.

### Cash Drawer
Software Support:
- Drawer open logic is implemented and is tied to hardware settings and printer flow.
Physical Validation:
- Pending.
Known Limitation:
- Access is conditional on the configured device and printer integration; no physical cash drawer was connected.
Expected Configuration:
- Cash drawer attached to the supported printer or a compatible controller.
Troubleshooting:
- Confirm that the drawer is correctly wired and enabled in the hardware settings.

### Customer Display
Software Support:
- Display is implemented as an abstracted hardware capability.
- Physical serial integration is intentionally not treated as a guaranteed universal capability.
Physical Validation:
- Pending.
Known Limitation:
- The code returns a limitation message when native serial integration is unavailable.
Expected Configuration:
- A supported serial/USB customer display device with a compatible driver or OS integration.
Troubleshooting:
- Check hardware enablement flags and connection type before attempting display operations.

### Label Printer
Software Support:
- Architecture exists for label-printer-style hardware integration, but no full commercial device contract is claimed.
Physical Validation:
- Pending.
Known Limitation:
- No physical label printer was available during validation.
Expected Configuration:
- A supported label printer using a compatible protocol and OS driver.
Troubleshooting:
- Validate protocol support and printer configuration before use with production inventory or shipping workflows.

## Important rule

The existence of software support does not equal physical validation. No hardware is marked as physically tested unless a real device was available and tested in this environment.
