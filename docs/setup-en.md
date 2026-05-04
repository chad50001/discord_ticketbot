# MSK Ticket Bot – Transcript Service Setup (English)

This document explains how to set up the MSK Transcript Service.  
The service stores ticket transcripts as publicly accessible links  
instead of sending them as file attachments via DM.

---

## Table of Contents

1. [What is the Transcript Service?](#1-what-is-the-transcript-service)
2. [Subscription Tiers](#2-subscription-tiers)
3. [Step 1 – Create a GitHub OAuth App](#3-step-1--create-a-github-oauth-app)
4. [Step 2 – Create a Discord OAuth App](#4-step-2--create-a-discord-oauth-app)
5. [Step 3 – Verify on the Website](#5-step-3--verify-on-the-website)
6. [Step 4 – Add the API Key to the Bot](#6-step-4--add-the-api-key-to-the-bot)
7. [Console Output on Startup](#7-console-output-on-startup)
8. [FAQ](#8-faq)

---

## 1. What is the Transcript Service?

When a ticket is closed, the bot generates a complete HTML transcript of all messages.  
This transcript is stored on **www.msk-scripts.de** and can be accessed via a link –  
no download required.

**Without an API Key**, the bot continues to work normally and sends the transcript  
as an HTML file attachment via DM (as before).

---

## 2. Subscription Tiers

| Feature | Basic (free) | Premium (€5/month) | Premium+ (€10/month) |
|---|---|---|---|
| Transcript as link | ✅ | ✅ | ✅ |
| Max. transcript size | 10 MB | 100 MB | 250 MB |
| File attachments in transcript | ❌ | ✅ | ✅ |
| Max. attachment size per ticket | – | 150 MB | 500 MB |
| Custom domain | ❌ | ✅ | ✅ |
| Storage duration | 30 days | 60 days | 90 days |

> Premium and Premium+ are unlocked via **GitHub Sponsors**.  
> Link: [github.com/sponsors/MSK-Scripts](https://github.com/sponsors/MSK-Scripts)

---

## 3. Step 1 – Create a GitHub OAuth App

> **Purpose:** The website needs to verify your GitHub account  
> to check your sponsorship status.

### Instructions

1. Open [github.com/settings/developer settings](https://github.com/settings/developers)
2. Click **"OAuth Apps"** in the left sidebar
3. Click **"New OAuth App"**
4. Fill in the fields:

   | Field | Value |
   |---|---|
   | **Application name** | `MSK Ticket Bot` (or any name you like) |
   | **Homepage URL** | `https://www.msk-scripts.de` |
   | **Authorization callback URL** | `https://www.msk-scripts.de/api/auth/github/callback` |

5. Click **"Register application"**
6. Copy the **Client ID** and generate a **Client Secret** by clicking **"Generate a new client secret"**

### Where to add these?

These values go into the `.env.local` on the **server** (not in the bot's `.env`):

```env
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
```

---

## 4. Step 2 – Create a Discord OAuth App

> **Purpose:** The website needs access to your Discord server list  
> so you can choose which server the API key should apply to.

### Instructions

1. Open [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Give it a name, e.g. `MSK Ticket Verify`
4. Click **"OAuth2"** in the left sidebar
5. Under **"Redirects"**, click **"Add Redirect"** and enter:
   ```
   https://www.msk-scripts.de/api/auth/discord-verify/callback
   ```
6. Click **"Save Changes"**
7. Copy the **Client ID** from the OAuth2 page
8. Click **"Reset Secret"** and copy the **Client Secret**

### Where to add these?

```env
DISCORD_VERIFY_CLIENT_ID=your_client_id_here
DISCORD_VERIFY_CLIENT_SECRET=your_client_secret_here
```

> ⚠️ This is a **separate** app from the Discord bot itself.  
> Do not use the bot token for this – only the Client ID and Secret.

---

## 5. Step 3 – Verify on the Website

This process must be completed **once by each server owner**.

### Step by Step

#### 5.1 Open the Website

Go to [www.msk-scripts.de/verify](https://www.msk-scripts.de/verify) in your browser.

---

#### 5.2 Connect GitHub

Click **"Sign in with GitHub"**.  
You will be redirected to GitHub and asked to authorize the application.  
You will be automatically redirected back afterwards.

> ℹ️ If you are using GitHub Sponsors for Premium/Premium+, you must sign in  
> with the same GitHub account you use for sponsoring.

---

#### 5.3 Connect Discord

Click **"Sign in with Discord"**.  
You will be redirected to Discord. Click **"Authorize"**.  
The app requires the following permissions:
- **`identify`** – to recognize your Discord account
- **`guilds`** – to display your server list

---

#### 5.4 Select your Server

You will now see a list of all Discord servers where you have **Administrator** permissions.  
Select the server you want the API key to apply to and click **"Generate API Key"**.

> ℹ️ Each server requires its own API key.  
> If you have multiple servers, repeat this process for each one.

---

#### 5.5 Save your API Key

After generation you will see your personal API key.  
**Copy it now** – it will not be shown again.

```
MSK_API_KEY=a1b2c3d4e5f6...
```

> 🔒 Do not share this key with anyone. Anyone who knows the key  
> can upload transcripts to the server on your behalf.

---

## 6. Step 4 – Add the API Key to the Bot

Open the `.env` file in your bot folder and add:

```env
MSK_API_KEY="your_api_key_here"
MSK_API_URL="https://www.msk-scripts.de"
```

Restart the bot afterwards.

---

## 7. Console Output on Startup

When the bot starts, you will see the following output:

```
████████╗██╗ ██████╗██╗  ██╗███████╗████████╗    ██████╗  ██████╗ ████████╗
╚══██╔══╝██║██╔════╝██║ ██╔╝██╔════╝╚══██╔══╝    ██╔══██╗██╔═══██╗╚══██╔══╝
   ██║   ██║██║     █████╔╝ █████╗     ██║       ██████╔╝██║   ██║   ██║   
   ...
                 https://github.com/MSK-Scripts/discord_ticketbot

Checking API Key... [result]

Connecting to Discord...
```

### Possible Results

| Output | Meaning |
|---|---|
| `Kein API Key konfiguriert → Basic` | No `MSK_API_KEY` set in `.env` |
| `API Key ungültig → Basic` | The key is wrong or has been reset |
| `MSK-Server nicht erreichbar → Basic` | www.msk-scripts.de is temporarily unreachable |
| `API Key gültig → Premium` | ✅ Premium active |
| `API Key gültig → Premium+` | ✅ Premium+ active |

---

## 8. FAQ

**Do I need an API key?**  
No. Without an API key the bot works normally and sends the transcript as a file via DM.

**What happens when my sponsorship expires?**  
Your tier is automatically downgraded to Basic. Existing transcripts remain accessible  
until their expiry date.

**Can I use the same API key for multiple servers?**  
No. Each API key is bound to a specific Discord server.  
You need to complete the verify process separately for each server.

**I lost my API key. What now?**  
Visit [www.msk-scripts.de/verify](https://www.msk-scripts.de/verify) again and complete  
the process. A new key will be generated and the old one will be invalidated.
