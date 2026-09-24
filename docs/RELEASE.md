# IR POS Release Notes

## Product identity

- Product name: IR POS
- Publisher: IR Fusions
- Package identifier: com.irfusions.irpos
- Version: 1.0.0
- Source of truth: package.json and src-tauri/tauri.conf.json

## Build command

```bash
npm run tauri build
```

## Build status

The build was executed in this environment and completed successfully for the current host platform.

## Actual artifacts generated in this environment

- src-tauri/target/release/bundle/macos/IR POS.app
- src-tauri/target/release/bundle/dmg/IR POS_1.0.0_aarch64.dmg

No Windows .exe installer was generated in this current machine environment because the build host is macOS and not a Windows packaging host.

## Validation performed

- npm run build: PASS
- cargo check: PASS
- npm run tauri build: PASS on the current macOS host

## Known limitations

- Windows installer execution was not run in this environment.
- Physical hardware was not connected or validated in this environment.
- Database, POS, and backup flows were not fully installation-tested in a clean customer machine setup.

## Hardware validation status

See docs/HARDWARE_VALIDATION.md for the current matrix.

## Release readiness note

This release is production-configured and build-validated for the current host platform. It is not claimed to be fully physical-device tested on a customer machine or on a Windows target installation.
