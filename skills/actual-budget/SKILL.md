---
name: actual-budget
description: Read and update an Actual Budget through the `actual` CLI. Use for accounts, balances, transactions, payees, categories, budgets, and remote sync checks.
compatibility: Requires the Actual Budget CLI (`actual`) and configured ACTUAL_SERVER_URL, credentials, and ACTUAL_SYNC_ID.
---

# Actual Budget

Use `actual` to inspect and update the configured remote budget. Consult the official Actual documentation at <https://actualbudget.org/docs/> when behavior, data concepts, or synchronization details are unclear.

## Safety and synchronization

- Run all `actual` commands serially. Never run them concurrently against one data directory. Concurrent refreshes can cause SQLite timestamp conflicts and `out-of-sync` errors.
- For several reads, sync once and then use the cache instead of adding `--refresh` to each call.
- Confirm remote access with `actual --refresh accounts list >/dev/null`. Calling `actual` without a subcommand only prints help.
- Before a write, inspect the relevant account, date range, payees, categories, and similar transactions.
- Treat amounts as integer cents. Expenses are negative: `-695` means `-6.95`.
- Check duplicates by at least date, amount, account, and payee. Preserve the user's established payee, category, note, and cleared-state conventions.
- After a write, refresh and read the affected date range to verify the remote result.

If the normal cache remains out of sync, do not keep retrying it. Create a fresh temporary directory, set `ACTUAL_DATA_DIR` to it for every subsequent serial command, let Actual download a clean synchronized copy, perform and verify the operation, and then remove only that temporary directory. This uses Actual's normal change synchronization; it does not replace the remote database.

## Useful commands

```sh
actual accounts list
actual payees list
actual categories list --include-hidden
actual transactions list --account <account-id> --start YYYY-MM-DD --end YYYY-MM-DD
actual transactions add --account <account-id> --data \
  '[{"date":"2026-08-11","amount":-695,"payee":"<payee-id>","category":"<category-id>","notes":"Example","cleared":true}]'
```

Use `actual <command> --help` before an unfamiliar operation. Do not expose credential environment variables in output.
