# Miyoushe Auto Daily Check In (CN Server)

[如何使用（中文）](Usage_Guide-cn.md)

Automated daily check-in for Miyoushe (CN Server) games using GitHub Actions.

**Supported Games:**
- Zenless Zone Zero (nap)
- Genshin Impact (hk4e)
- Honkai: Star Rail (hkrpg)
- Honkai Impact 3rd (bh3)
- Tears of Themis (nxx)
- Honkai Gakuen 2 (bh2)

## Table of Contents

- [Getting your cookie](#getting-your-cookie)
- [Usage](#usage)
- [Multiple Accounts](#multiple-accounts)
- [Discord Webhook](#discord-webhook)
- [Credits](#credits)

## Getting your cookie

For the CN server, you need `cookie_token` and `account_id` (or `ltoken` and `ltuid`).

**Recommended Method (iOS Shortcut):**
1. Download and run this shortcut: [Get Miyoushe Token](https://www.icloud.com/shortcuts/881fd76f17ef431893660d3324ea19c2)
2. Follow the instructions to get your cookie string.
3. The cookie string should look like: `account_mid_v2=REDACTED; account_id_v2=REDACTED; ltmid_v2=REDACTED; ltuid_v2=REDACTED; account_id=REDACTED; ltuid=REDACTED; _MHYUUID=REDACTED; DEVICEFP=REDACTED; MIHOYO_LOGIN_PLATFORM_LIFECYCLE_ID=REDACTED; cookie_token=REDACTED; ltoken=REDACTED` (The cookie_token and ltoken are most important, but it's recommended that you copy everything, the script will try all possible auth methords to ensure better compatibility

**Alternative Method (Browser):**
1. Log in to [Miyoushe](https://www.miyoushe.com/ys/).
2. Open Developer Tools (F12) -> Console.
3. Enter the following: `document.cookie`
4. Right click and select "Copy as String"

## Usage

1. **Fork this repository**.
2. Go to **Settings > Secrets and variables > Actions**.
3. Add a **New repository secret** named `COOKIE` with your cookie string.
4. Add a **New repository variable** named `GAMES` with the game codes you want to check in, separated by space (e.g., `zzz gi hsr`).
   - Codes: `zzz`, `gi`, `hsr`, `hi3`, `tot`, `bh2`
5. Go to the **Actions** tab, select **Miyoushe Daily Check-in**, and click **Run workflow** to test it.
6. The workflow will run automatically every day at 06:00 (UTC+8).

## Multiple Accounts

To add multiple accounts, separate their cookies with a newline in the `COOKIE` secret.

## Discord Webhook

To receive notifications on Discord:
1. Create a webhook in your Discord channel settings.
2. Add a **New repository secret** named `DISCORD_WEBHOOK` with the webhook URL.
3. (Optional) Add a **New repository secret** named `DISCORD_USER` with your Discord User ID to get pinged.

## Credits

- Original Global Server Repo: [sglkc/hoyolab-auto-daily](https://github.com/sglkc/hoyolab-auto-daily)
- API Reference: [starudream/miyoushe-task](https://github.com/starudream/miyoushe-task)
