# MSK Ticket Bot – Transcript-Service Setup (Deutsch)

Dieses Dokument erklärt, wie du den MSK Transcript-Service einrichtest.  
Der Service ermöglicht es, Ticket-Transkripte als öffentlich aufrufbare Links zu speichern,  
anstatt sie als Dateianhang per DM zu verschicken.

---

## Inhaltsverzeichnis

1. [Was ist der Transcript-Service?](#1-was-ist-der-transcript-service)
2. [Abo-Modelle im Überblick](#2-abo-modelle-im-überblick)
3. [Schritt 1 – GitHub OAuth App erstellen](#3-schritt-1--github-oauth-app-erstellen)
4. [Schritt 2 – Discord OAuth App erstellen](#4-schritt-2--discord-oauth-app-erstellen)
5. [Schritt 3 – Verifizierung auf der Website](#5-schritt-3--verifizierung-auf-der-website)
6. [Schritt 4 – API Key in den Bot eintragen](#6-schritt-4--api-key-in-den-bot-eintragen)
7. [Konsolenausgabe beim Start](#7-konsolenausgabe-beim-start)
8. [Häufige Fragen](#8-häufige-fragen)

---

## 1. Was ist der Transcript-Service?

Wenn ein Ticket geschlossen wird, generiert der Bot ein vollständiges HTML-Transkript  
aller Nachrichten. Dieses Transkript wird auf **www.msk-scripts.de** gespeichert und  
ist anschließend über einen Link aufrufbar – kein Download nötig.

**Ohne API Key** funktioniert der Bot weiterhin normal, sendet das Transkript aber  
als HTML-Dateianhang per DM (wie bisher).

---

## 2. Abo-Modelle im Überblick

| Feature | Basic (kostenlos) | Premium (5 €/Monat) | Premium+ (10 €/Monat) |
|---|---|---|---|
| Transkript als Link | ✅ | ✅ | ✅ |
| Max. Transkriptgröße | 10 MB | 100 MB | 250 MB |
| Dateianhänge im Transkript | ❌ | ✅ | ✅ |
| Max. Anhangsgröße pro Ticket | – | 150 MB | 500 MB |
| Eigene Domain | ❌ | ✅ | ✅ |
| Speicherdauer | 30 Tage | 60 Tage | 90 Tage |

> Premium und Premium+ werden über **GitHub Sponsors** freigeschaltet.  
> Link: [github.com/sponsors/MSK-Scripts](https://github.com/sponsors/MSK-Scripts)

---

## 3. Schritt 1 – GitHub OAuth App erstellen

> **Zweck:** Die Website muss deinen GitHub-Account verifizieren,  
> um deinen Sponsoring-Status prüfen zu können.

### Anleitung

1. Öffne [github.com/settings/developer settings](https://github.com/settings/developers)
2. Klicke links auf **„OAuth Apps"**
3. Klicke auf **„New OAuth App"**
4. Fülle die Felder aus:

   | Feld | Wert |
   |---|---|
   | **Application name** | `MSK Ticket Bot` (oder beliebig) |
   | **Homepage URL** | `https://www.msk-scripts.de` |
   | **Authorization callback URL** | `https://www.msk-scripts.de/api/auth/github/callback` |

5. Klicke auf **„Register application"**
6. Kopiere die **Client ID** und erstelle unter **„Generate a new client secret"** ein **Client Secret**

### Wo eintragen?

Diese Werte kommen in die `.env.local` auf dem **Server** (nicht in die Bot-`.env`):

```env
GITHUB_CLIENT_ID=deine_client_id_hier
GITHUB_CLIENT_SECRET=dein_client_secret_hier
```

---

## 4. Schritt 2 – Discord OAuth App erstellen

> **Zweck:** Die Website benötigt Zugriff auf deine Discord-Server-Liste,  
> damit du auswählen kannst, für welchen Server der API Key gilt.

### Anleitung

1. Öffne [discord.com/developers/applications](https://discord.com/developers/applications)
2. Klicke auf **„New Application"**
3. Vergib einen Namen, z. B. `MSK Ticket Verify`
4. Klicke links auf **„OAuth2"**
5. Klicke unter **„Redirects"** auf **„Add Redirect"** und trage ein:
   ```
   https://www.msk-scripts.de/api/auth/discord-verify/callback
   ```
6. Klicke auf **„Save Changes"**
7. Kopiere die **Client ID** von der Seite „OAuth2"
8. Klicke auf **„Reset Secret"** und kopiere das **Client Secret**

### Wo eintragen?

```env
DISCORD_VERIFY_CLIENT_ID=deine_client_id_hier
DISCORD_VERIFY_CLIENT_SECRET=dein_client_secret_hier
```

> ⚠️ Dies ist eine **separate** App vom Discord-Bot selbst.  
> Verwende nicht den Bot-Token dieser App – nur Client ID und Secret.

---

## 5. Schritt 3 – Verifizierung auf der Website

Dieser Prozess muss von **jedem Server-Besitzer** einmalig durchgeführt werden.

### Schritt-für-Schritt

#### 5.1 Website aufrufen

Öffne [www.msk-scripts.de/verify](https://www.msk-scripts.de/verify) in deinem Browser.

---

#### 5.2 GitHub verbinden

Klicke auf **„Mit GitHub anmelden"**.  
Du wirst zu GitHub weitergeleitet und musst die Anwendung autorisieren.  
Danach wirst du automatisch zurückgeleitet.

> ℹ️ Wenn du GitHub Sponsors für Premium/Premium+ nutzt, muss du dich mit demselben  
> GitHub-Account anmelden, über den du sponserst.

---

#### 5.3 Discord verbinden

Klicke auf **„Mit Discord anmelden"**.  
Du wirst zu Discord weitergeleitet. Wähle **„Authorize"** aus.  
Die App benötigt folgende Berechtigungen:
- **`identify`** – damit wir deinen Discord-Account erkennen
- **`guilds`** – damit wir deine Server-Liste anzeigen können

---

#### 5.4 Server auswählen

Du siehst nun eine Liste aller Discord-Server, auf denen du **Administrator**-Rechte hast.  
Wähle den Server aus, für den der API Key gelten soll, und klicke auf **„API Key generieren"**.

> ℹ️ Jeder Server braucht seinen eigenen API Key.  
> Wenn du mehrere Server hast, wiederhole den Prozess für jeden Server.

---

#### 5.5 API Key speichern

Nach der Generierung siehst du deinen persönlichen API Key.  
**Kopiere ihn jetzt** – er wird dir nicht erneut angezeigt.

```
MSK_API_KEY=a1b2c3d4e5f6...
```

> 🔒 Teile diesen Key mit niemandem. Wer den Key kennt, kann Transkripte  
> in deinem Namen auf den Server hochladen.

---

## 6. Schritt 4 – API Key in den Bot eintragen

Öffne die `.env`-Datei in deinem Bot-Ordner und trage ein:

```env
MSK_API_KEY="dein_api_key_hier"
MSK_API_URL="https://www.msk-scripts.de"
```

Starte den Bot danach neu.

---

## 7. Konsolenausgabe beim Start

Beim Start des Bots siehst du folgende Ausgabe:

```
████████╗██╗ ██████╗██╗  ██╗███████╗████████╗    ██████╗  ██████╗ ████████╗
╚══██╔══╝██║██╔════╝██║ ██╔╝██╔════╝╚══██╔══╝    ██╔══██╗██╔═══██╗╚══██╔══╝
   ██║   ██║██║     █████╔╝ █████╗     ██║       ██████╔╝██║   ██║   ██║   
   ...
                 https://github.com/MSK-Scripts/discord_ticketbot

Checking API Key... [Ergebnis]

Connecting to Discord...
```

### Mögliche Ergebnisse

| Ausgabe | Bedeutung |
|---|---|
| `Kein API Key konfiguriert → Basic` | Kein `MSK_API_KEY` in der `.env` eingetragen |
| `API Key ungültig → Basic` | Der Key ist falsch oder wurde zurückgesetzt |
| `MSK-Server nicht erreichbar → Basic` | www.msk-scripts.de ist vorübergehend nicht erreichbar |
| `API Key gültig → Premium` | ✅ Premium aktiv |
| `API Key gültig → Premium+` | ✅ Premium+ aktiv |

---

## 8. Häufige Fragen

**Muss ich einen API Key haben?**  
Nein. Ohne API Key funktioniert der Bot normal und sendet das Transkript als Datei per DM.

**Was passiert wenn mein Sponsoring ausläuft?**  
Dein Tier wird automatisch auf Basic zurückgestuft. Bestehende Transkripte bleiben  
bis zu ihrem Ablaufdatum erhalten.

**Kann ich den API Key für mehrere Server nutzen?**  
Nein. Jeder API Key ist an einen spezifischen Discord-Server gebunden.  
Für jeden Server musst du den Verify-Prozess separat durchlaufen.

**Ich habe meinen API Key verloren. Was nun?**  
Besuche [www.msk-scripts.de/verify](https://www.msk-scripts.de/verify) erneut und durchlaufe  
den Prozess nochmal. Ein neuer Key wird generiert und der alte wird ungültig.
