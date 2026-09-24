# IR POS Windows Validation Matrix

## Validation status legend

- PASS: executed and confirmed
- FAIL: executed and failed
- NOT TESTED: not executed in this environment
- BLOCKED: cannot proceed because the required environment is unavailable

## Test matrix

| Test ID | Test | Expected | Actual | Status |
| --- | --- | --- | --- | --- |
| WIN-001 | Installer starts | Installer opens normally | Not generated in this environment | NOT TESTED |
| WIN-002 | Application installs | Installation succeeds | Not executed on Windows | NOT TESTED |
| WIN-003 | First launch | First-run setup appears | Not executed on Windows | NOT TESTED |
| WIN-004 | Login | Admin can log in | Not executed on Windows | NOT TESTED |
| WIN-005 | Product creation | Product saves successfully | Not executed on Windows | NOT TESTED |
| WIN-006 | POS sale | Sale completes and updates inventory | Not executed on Windows | NOT TESTED |
| WIN-007 | Restart persistence | Data remains after app reopen | Not executed on Windows | NOT TESTED |
| WIN-008 | Backup | Backup is created successfully | Not executed on Windows | NOT TESTED |
| WIN-009 | Uninstall | App removed without deleting database | Not executed on Windows | NOT TESTED |
| WIN-010 | Barcode scanner | Device works with application | Software exists, hardware not tested | NOT TESTED |
| WIN-011 | Thermal printer | Receipt prints successfully | Software exists, hardware not tested | NOT TESTED |
| WIN-012 | Cash drawer | Drawer opens correctly | Software exists, hardware not tested | NOT TESTED |

## Actual build verification executed

| ID | Check | Result |
| --- | --- | --- |
| BUILD-001 | npm run build | PASS |
| BUILD-002 | cargo check --manifest-path src-tauri/Cargo.toml | PASS |
| BUILD-003 | npm run tauri build | PASS on current macOS host |
| BUILD-004 | Windows .exe generation | NOT GENERATED |

## Notes

- The project is configured for a Windows installer through Tauri NSIS packaging.
- The current validation host is macOS and therefore cannot actually generate a native Windows installer or test Windows installation behavior.
- Because of this limitation, no Windows installation, restart persistence, or hardware validation claims are made.
