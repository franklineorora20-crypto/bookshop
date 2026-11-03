# Offline Administrator Password Recovery

KitabuPOS password recovery works locally and does not use email, cloud services, or an internet connection. Recovery is available only for the designated administrator account (user ID 1). A recovery code is not a sign-in password.

## Initial setup

During first-run setup, KitabuPOS generates a 160-bit code using the device's cryptographic random-number generator. It displays the code once, with options to copy or print it. Save the code somewhere secure and separate from the computer, then confirm that it has been saved before completing setup. KitabuPOS does not keep a readable copy.

## Configure or replace a code later

An authenticated designated administrator can open **Settings → Security & Audits → Administrator Recovery**. Re-enter the administrator password to configure or regenerate the code. Regeneration immediately invalidates the previous code. Copy or print the new code and acknowledge saving it; the code is not shown again afterward.

## Recover access

1. On the sign-in screen, choose **Forgot Administrator Password?**
2. Enter the administrator username, recovery code, new password, and password confirmation.
3. After successful recovery, save the replacement recovery code shown on screen and acknowledge it.
4. Sign in normally with the new password.

Recovery codes are checked against bcrypt hashes stored in the local database. Failed attempts are persisted; the fifth failed attempt locks recovery for five minutes, with later lock periods increasing up to 24 hours. Successful recovery creates and verifies a pre-recovery database copy, replaces the administrator password, rotates the recovery code, increments the account's authentication version, and writes a security audit event. Existing login sessions are invalidated. Books, inventory, sales, purchases, expenses, staff, settings, and prior audit history are not deleted.

The emergency copy is stored in IndexedDB and, in the Electron desktop app, also written and read-back-verified as a separate `.sqlite` file under the app's existing `Backups` directory. It does not change the app ID, user-data directory, database engine, or live database location.

## Existing installations and migration

Existing installations are not forced to change passwords or configure recovery during upgrade. A non-destructive schema migration adds the authentication-version field and a recovery-metadata table; existing accounts, password hashes, and business records are retained. The migration does not add a recovery code. An administrator can configure one later in Settings.

Backups created before this migration remain supported. When restored, a valid earlier KitabuPOS database is checked and safely migrated before it becomes active. Recovery metadata contains only bcrypt hashes; the recovery code is never stored in local or session storage or written to application logs.

## Forgotten password without a recovery code

There is no universal password or hidden bypass. If an administrator has forgotten the password and no recovery code was configured:

1. Do not clear application data, reset the database, reinstall over the profile, or edit the database file.
2. Close KitabuPOS and make a complete copy of the app's existing user-data directory to separate storage. Preserve the original profile untouched. On Windows this is commonly beneath `%APPDATA%\KitabuPOS`, but use the actual directory for the installed app.
3. If a valid `.sqlite` backup is available, retain a separate copy of it too.
4. Ask the KitabuPOS owner or authorized support provider for a supervised, offline recovery procedure performed on a duplicate of the data.

This owner-controlled procedure is intentionally separate from the in-app recovery flow and does not provide an unauthenticated password-reset feature.
