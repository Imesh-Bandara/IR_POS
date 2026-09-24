# IR POS Windows Installation Guide

## Introduction

This guide is intended for a non-technical shop owner or customer installing IR POS on a Windows PC.

> This document describes the intended customer installation flow. The Windows installer itself was not generated in the current macOS validation environment, so a real installer file is not yet distributed here.

## Before installation

Make sure:

- You are installing on a Windows 10 or Windows 11 PC.
- You have the IR POS installer file from the official vendor.
- You do not need Node.js, Rust, Git, or developer tools.
- You are installing on a normal office or retail workstation.

## Installation steps

1. Download the IR POS installer provided by IR Fusions.
2. Double-click the installer file.
3. Accept the Windows security prompt if shown.
4. Follow the installation wizard.
5. Choose the default installation location unless instructed otherwise.
6. Complete the installation process.
7. Launch IR POS from the Start Menu or Desktop shortcut.

## First launch

On first run, IR POS checks whether business data already exists.

- If no database exists, the first-run setup screen appears.
- If a previous installation is detected, the application continues normally and does not reset the business data.

The setup flow normally requests:

- business details
- branch details
- terminal details
- admin username and password
- language or regional settings

## Login

After setup, log in with the admin account created during first-run setup.

## Data safety

IR POS stores its business database in the operating system application-data directory rather than in the installation folder.

This helps keep sales, inventory, products, suppliers, and settings safe across restarts and updates.

## Backup recommendation

Before updating or migrating the application, create a backup from within IR POS and save it to a safe local folder.

## Uninstall

Uninstall IR POS through the standard Windows uninstall process. The application should not silently delete the business database as part of normal uninstall behavior.

## Important note

This installation guide is prepared for the Windows distribution process, but an actual Windows clean installation was not executed in the current environment. This guide reflects the intended production flow, not a verified customer installation result.
