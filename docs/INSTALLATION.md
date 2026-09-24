# IR POS Installation Guide

## Supported environment

- Primary target: Windows desktop installation
- Development/verification host: macOS for this Phase 11 validation
- Tauri app version: 1.0.0
- Bundle identifier: com.irfusions.irpos

## Installation process

1. Download the release artifact intended for the target workstation.
2. Run the installer for the target platform.
3. Accept the standard OS security prompts.
4. Complete the first-run setup flow.

## First launch

On first launch, IR POS checks whether the local application database already exists.

- If no business data exists, the app shows the setup flow.
- If the database already exists, the app starts normally and does not reset historical data.

The first-run workflow is intended to collect:

- business details
- branch details
- terminal details
- administrator account
- localization settings

## Application data location

IR POS stores its persistent database outside the installed application directory.

The current architecture resolves the app-data path through Tauri and then uses a local persistent directory structure similar to:

- AppData / Application Support / IR POS
  - database/
  - backups/
  - logs/

This keeps the SQLite database separate from the installed application files and helps preserve business data across updates and restarts.

## Uninstall behavior

Normal uninstall removes the application files but should not silently delete the persistent business database.

Important:

- Application files may be removed during uninstall.
- Business data, sales records, inventory, customers, suppliers, and backups remain in the persistent application-data location unless a separate explicit data-removal action is chosen by the user and confirmed.
- Do not run a silent destructive data purge during normal uninstall.

## Backup recommendation

Before a major version change or schema migration, create a backup from the application and save it to a secure local folder.

The project includes database backup and restore logic based on SQLite and validates backup integrity before restore.

## Troubleshooting

- If the application does not start, check the log file in the app-data logs directory.
- If the database is missing or appears corrupted, restore from a valid backup.
- If a hardware device is configured but not operating, use the hardware test flow and review the log file.

## Known limitation in this environment

The Windows installer configuration is prepared for the project, but this current environment only produced the macOS application and DMG bundle during validation. A clean Windows installation test is not claimed here.
