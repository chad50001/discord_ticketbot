<img width="1917" height="474" alt="MSK Ticket Bot Banner" src="https://github.com/user-attachments/assets/c656750b-3bca-4fcc-a48e-1d173dec6aa4" />

<div align="center">

# 🎫 MSK Ticket Bot

Ein moderner, selbst-gehosteter Discord-Ticket-Bot auf Basis von **Discord.js v14** und **SQLite** — ohne externe Datenbank, ohne Telemetrie, mit vollem Feature-Umfang.

[![Lizenz: AGPL-3.0](https://img.shields.io/badge/Lizenz-AGPL%203.0-blueviolet?style=flat-square)](https://www.gnu.org/licenses/agpl-3.0)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=flat-square&logo=discord)](https://discord.js.org)
[![Dokumentation](https://img.shields.io/badge/Docs-docu.msk--scripts.de-5eb131?style=flat-square)](https://docu.msk-scripts.de/discord/discord_ticketbot/getting-started)

</div>

---

## ✨ Features

| Feature | Beschreibung |
|---|---|
| 🎫 Ticket-Typen | Bis zu 25 konfigurierbare Typen mit eigenem Emoji, Farbe, Kategorie & Fragen |
| 📋 Fragebögen | Modale Formulare (bis zu 5 Fragen) bei Ticket-Erstellung |
| 🙋 Claim-System | Claim/Unclaim per Button — togglet automatisch, Embed & Topic werden aktualisiert |
| 🔴 Prioritäten | Low / Medium / High / Urgent per `/priority` — im Channel-Topic und Embed sichtbar |
| 📝 Staff-Notizen | Private Notizen per `/note add` / `/note list` |
| 🔀 Ticket verschieben | Per `/move` oder Button in anderen Typ/Kategorie verschieben (Staff only) |
| 🛡️ Typ-spezifische Staff-Rollen | Jeder Ticket-Typ kann eigene Staff-Rollen haben |
| 🖼️ Panel Logo & Banner | Optionales Logo-Thumbnail und/oder Banner-Bild im Panel-Embed |
| 🎛️ Panel-Interaktionstyp | Wahl zwischen Button oder direktem Select-Menu im Panel |
| ⭐ Bewertungssystem | 1–5 Sterne Feedback nach Schließung, automatisch in konfigurierten Channel gepostet |
| ⏰ Staff-Erinnerung | Automatischer Ping im Ticket wenn kein Staff nach X Stunden antwortet |
| ⏰ Auto-Close | Inaktive Tickets automatisch schließen mit konfigurierbarem Warn-Vorlauf |
| 🔗 Transcript-Links | Transkripte werden online gespeichert und sind per Link abrufbar |
| 📄 HTML-Transcript | Vollständiges HTML-Transcript mit allen Nachrichten, Embeds und Anhängen |
| 🌐 Eigene Domain | Premium-Nutzer können Transkripte unter ihrer eigenen Domain abrufen |
| 📊 Statistiken | Server-weite Stats sowie detaillierte Per-Nutzer-Stats per `/stats` |
| 🚫 Blacklist | `/blacklist add/remove/list` zum Sperren von Nutzern |
| 🌍 Mehrsprachig | Deutsch und Englisch enthalten, leicht erweiterbar |
| 🗄️ SQLite | Keine externe Datenbank nötig — Datei wird automatisch erstellt |

---

## 🔗 MSK Transcript Service

Anstatt Transkripte als Dateianhang per DM zu versenden, kann der Bot sie auf **[www.msk-scripts.de](https://www.msk-scripts.de)** hochladen und einen öffentlichen Link generieren — im Browser aufrufbar, kein Download nötig.

### Abo-Modelle

| Feature | Basic (kostenlos) | Premium (5 €/Monat) | Premium+ (10 €/Monat) |
|---|---|---|---|
| Transkript als Link | ✅ | ✅ | ✅ |
| Max. Transkriptgröße | 10 MB | 100 MB | 250 MB |
| Dateianhänge im Transkript | ❌ | ✅ | ✅ |
| Max. Anhangsgröße pro Ticket | — | 150 MB | 500 MB |
| Eigene Domain | ❌ | ✅ | ✅ |
| Speicherdauer | 30 Tage | 60 Tage | 90 Tage |

> Premium und Premium+ werden über **[GitHub Sponsors](https://github.com/sponsors/MSK-Scripts)** freigeschaltet.

### API Key erhalten

1. **[www.msk-scripts.de/verify](https://www.msk-scripts.de/verify)** aufrufen
2. Mit GitHub-Account anmelden
3. Discord-Account verbinden
4. Server auswählen → API Key wird sofort generiert

Dann in die `.env` eintragen:
```env
MSK_API_KEY="dein_api_key_hier"
MSK_API_URL="https://www.msk-scripts.de"
```

### Eigene Domain (Premium & Premium+)

Premium-Nutzer können Transkripte unter ihrer eigenen Domain bereitstellen (z.B. `tickets.deinserver.de`).

1. **[www.msk-scripts.de/dashboard](https://www.msk-scripts.de/dashboard)** nach der Verifizierung aufrufen
2. Domain eintragen und einen DNS **A-Record** auf die angezeigte Server-IP setzen
3. **„DNS prüfen"** klicken sobald die Propagierung abgeschlossen ist — SSL wird automatisch eingerichtet

> 📖 Vollständige Anleitung: [docu.msk-scripts.de](https://docu.msk-scripts.de/discord/discord_ticketbot/getting-started)

---

## 💖 Sponsoren

Vielen Dank an alle Sponsoren, die dieses Projekt unterstützen!

<!-- sponsors -->
<!-- sponsors -->

---

## 📁 Projektstruktur

```
discord_ticketbot/
├── index.js                    # Einstiegspunkt
├── package.json
├── .env.example                # Vorlage für Umgebungsvariablen
├── ticketbot.service           # systemd-Unit-Datei für Linux-Server
├── assets/                     # Statische Dateien (Logo, Banner)
│   ├── logo.png                # Panel-Logo-Thumbnail (eigenes Bild hier ablegen)
│   └── banner.png              # Panel-Banner-Bild (eigenes Bild hier ablegen)
├── config/
│   └── config.example.jsonc    # Konfigurationsvorlage (mit Kommentaren)
├── docs/
│   ├── setup-en.md             # MSK Transcript Service Anleitung (Englisch)
│   └── setup-de.md             # MSK Transcript Service Anleitung (Deutsch)
├── locales/
│   ├── de.json                 # Deutsch
│   └── en.json                 # Englisch
├── data/
│   └── tickets.db              # SQLite-Datenbank (auto-erstellt)
└── src/
    ├── client.js               # Erweiterter Discord Client
    ├── config.js               # Config-Loader & Validierung
    ├── database.js             # Alle DB-Operationen (SQLite)
    ├── handlers/
    │   ├── commandHandler.js   # Lädt & registriert Slash Commands
    │   ├── eventHandler.js     # Lädt Discord-Events
    │   └── componentHandler.js # Lädt Buttons, Modals, Menus
    ├── commands/               # Slash Commands
    │   ├── setup.js            # /setup      – Panel senden
    │   ├── close.js            # /close      – Ticket schließen
    │   ├── add.js              # /add        – Nutzer hinzufügen
    │   ├── remove.js           # /remove     – Nutzer entfernen
    │   ├── claim.js            # /claim      – Ticket beanspruchen
    │   ├── unclaim.js          # /unclaim    – Ticket freigeben
    │   ├── move.js             # /move       – Ticket verschieben
    │   ├── rename.js           # /rename     – Kanal umbenennen
    │   ├── transcript.js       # /transcript – HTML-Transcript generieren
    │   ├── priority.js         # /priority   – Priorität setzen
    │   ├── note.js             # /note       – Staff-Notizen
    │   ├── blacklist.js        # /blacklist  – Nutzer sperren
    │   └── stats.js            # /stats      – Statistiken
    ├── events/
    │   ├── ready.js            # Bot-Start, Status, Auto-Close & Staff-Reminder Loop
    │   ├── messageCreate.js    # Letzte Aktivität tracken
    │   └── interactionCreate.js # Routing aller Interaktionen
    ├── components/
    │   ├── buttons/
    │   │   ├── openTicket.js       # tb_open
    │   │   ├── closeTicket.js      # tb_close
    │   │   ├── claimTicket.js      # tb_claim
    │   │   ├── unclaimTicket.js    # tb_unclaim
    │   │   ├── moveTicket.js       # tb_move
    │   │   ├── deleteTicket.js     # tb_delete
    │   │   ├── deleteConfirm.js    # tb_deleteConfirm
    │   │   ├── deleteCancel.js     # tb_deleteCancel
    │   │   └── rateTicket.js       # tb_rate:N
    │   ├── modals/
    │   │   ├── closeReason.js      # tb_modalClose
    │   │   └── ticketQuestions.js  # tb_modalQuestions:type
    │   └── menus/
    │       ├── panelSelect.js      # tb_panelSelect
    │       ├── ticketType.js       # tb_selectType
    │       └── moveSelect.js       # tb_moveSelect
    └── utils/
        ├── logger.js           # Farbiger Console-Logger
        ├── embeds.js           # Alle Embed-Konstruktoren
        ├── transcript.js       # HTML-Transcript-Generator
        ├── mskApi.js           # MSK Transcript Service API-Client
        └── ticketActions.js    # Kernlogik: openTicket, performClose, performMove
```

---

## 🚀 Installation

### Voraussetzungen

- **Node.js** v18 oder neuer
- Ein Discord Bot Token — [discord.com/developers/applications](https://discord.com/developers/applications)

### 1. Abhängigkeiten installieren

```bash
cd discord_ticketbot
npm install
```

### 2. Umgebungsvariablen einrichten

```bash
cp .env.example .env
```

`.env` ausfüllen:

```env
# Pflichtfelder
TOKEN="dein_bot_token"
CLIENT_ID="deine_application_id"
GUILD_ID="deine_server_id"

# Optional — MSK Transcript Service (API Key unter www.msk-scripts.de/verify holen)
MSK_API_KEY="dein_msk_api_key"
MSK_API_URL="https://www.msk-scripts.de"
```

### 3. Konfiguration einrichten

```bash
cp config/config.example.jsonc config/config.jsonc
```

`config/config.jsonc` nach Bedarf anpassen — alle Felder sind kommentiert.

### 4. Bot starten

```bash
npm start
```

Beim ersten Start werden automatisch:
- Die SQLite-Datenbank in `data/tickets.db` angelegt
- Alle Slash Commands auf dem Server registriert

### 5. Panel einrichten

`/setup` auf dem Discord-Server ausführen (Administrator-Berechtigung erforderlich). Der Bot sendet das Ticket-Panel in den konfigurierten Kanal.

---

## 🖥️ Autostart mit systemd (Linux-Server)

### 1. Bot-Dateien auf den Server kopieren

```bash
sudo cp -r discord_ticketbot /opt/discord_ticketbot
sudo useradd -r -s /bin/false discord
sudo chown -R discord:discord /opt/discord_ticketbot
```

### 2. .env auf dem Server einrichten

```bash
sudo nano /opt/discord_ticketbot/.env
```

### 3. Node.js-Pfad prüfen

```bash
which node
# Ausgabe z.B.: /usr/bin/node
```

Falls der Pfad abweicht, `ExecStart` in `ticketbot.service` entsprechend anpassen.

### 4. systemd-Unit installieren

```bash
sudo cp /opt/discord_ticketbot/ticketbot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ticketbot.service
```

### 5. Status prüfen

```bash
sudo systemctl status ticketbot.service
sudo journalctl -u ticketbot.service -f
```

### Nützliche Befehle

| Befehl | Beschreibung |
|---|---|
| `sudo systemctl start ticketbot.service` | Bot starten |
| `sudo systemctl stop ticketbot.service` | Bot stoppen |
| `sudo systemctl restart ticketbot.service` | Bot neu starten |
| `sudo systemctl enable ticketbot.service` | Autostart aktivieren |
| `sudo systemctl disable ticketbot.service` | Autostart deaktivieren |
| `sudo journalctl -u ticketbot.service -f` | Live-Logs anzeigen |

---

## ⚙️ Slash Commands

| Command | Berechtigung | Beschreibung |
|---|---|---|
| `/setup` | Administrator | Ticket-Panel senden |
| `/close [grund]` | Konfigurierbar | Aktuelles Ticket schließen |
| `/claim` | Staff | Ticket beanspruchen — Topic & Embed aktualisieren |
| `/unclaim` | Staff | Ticket freigeben — Topic & Embed aktualisieren |
| `/move` | Staff | Ticket in anderen Typ/Kategorie verschieben |
| `/add <nutzer>` | Staff | Nutzer zum Ticket hinzufügen |
| `/remove <nutzer>` | Staff | Nutzer aus Ticket entfernen |
| `/rename <name>` | Staff | Kanal umbenennen |
| `/transcript` | Staff | HTML-Transcript generieren |
| `/priority <stufe>` | Staff | Priorität setzen |
| `/note add <text>` | Staff | Staff-Notiz hinzufügen |
| `/note list` | Staff | Alle Notizen des Tickets anzeigen |
| `/stats` | Staff | Server-weite Ticket-Statistiken |
| `/stats @nutzer` | Staff | Detaillierte Statistiken für einen Nutzer |
| `/blacklist add` | Manage Guild | Nutzer sperren |
| `/blacklist remove` | Manage Guild | Nutzer entsperren |
| `/blacklist list` | Manage Guild | Blacklist anzeigen |

---

## 🔘 Ticket-Buttons

| Button | Sichtbar wenn | Beschreibung |
|---|---|---|
| 🔒 Ticket schließen | Immer (konfigurierbar) | Buttons deaktivieren, Transcript erstellen, Ticket schließen & umbenennen |
| 🙋 Beanspruchen | `claimButton: true`, noch nicht geclaimt | Topic & Embed aktualisieren, Button wird zu Unclaim |
| 🙌 Freigeben | `claimButton: true`, bereits geclaimt | Topic & Embed aktualisieren, Button wird zu Claim |
| 🔀 Verschieben | Mehr als 1 Ticket-Typ konfiguriert | Staff öffnet Typ-Auswahl |
| 🗑️ Ticket löschen | Nach Schließung | Löscht den Kanal nach Bestätigung |

---

## 🛠️ Konfigurationsreferenz

### Panel-Interaktionstyp

```jsonc
"panel": {
  "interactionType": "BUTTON"    // "BUTTON" (Standard) oder "SELECT_MENU"
}
```

| Modus | Verhalten |
|---|---|
| `"BUTTON"` | Grüner Button öffnet ephemeral Select-Menu — immer frisch, kein Discord-Caching-Problem. |
| `"SELECT_MENU"` | Select-Menu direkt im Panel, setzt sich automatisch zurück. |

### Panel Logo & Banner

```jsonc
"panel": {
  "logo":   { "enabled": true, "file": "logo.png"   },
  "banner": { "enabled": true, "file": "banner.png" }
}
```

Unterstützte Formate: PNG, JPG, GIF, WEBP. Nach Änderungen `/setup` erneut ausführen.

### Kanalzustand-Übersicht

| Zustand | Kanalname | Channel-Topic | Opening-Embed |
|---|---|---|---|
| Ticket geöffnet | `ticket-maxmuster` | `🟡 Mittel` | Priorität: 🟡 Mittel |
| `/priority urgent` | `ticket-maxmuster` | `🔴 Dringend` | Priorität: 🔴 Dringend |
| `/claim` | `ticket-maxmuster` | `🟡 Mittel \| 🙋 Claimed by @Staff` | + Claimed-by-Feld |
| `/unclaim` | `ticket-maxmuster` | `🟡 Mittel` | Feld entfernt |
| Ticket geschlossen | `closed-ticket-maxmuster` | unverändert | alle Buttons entfernt |

### Ticket-Typen

```jsonc
{
  "codeName": "support",
  "name": "Support",
  "description": "...",
  "emoji": "💡",
  "color": "#ff0000",
  "categoryId": "123456789",
  "ticketNameOption": "",         // USERNAME, USERID, TICKETCOUNT oder ""
  "customDescription": "...",
  "cantAccess": ["roleId"],
  "staffRoles": [],
  "askQuestions": true,
  "questions": [
    { "label": "Frage", "placeholder": "...", "style": "SHORT", "maxLength": 500 }
  ]
}
```

### Staff-Erinnerung

```jsonc
"staffReminder": { "enabled": true, "afterHours": 4, "pingRoles": true }
```

Der Bot prüft alle **15 Minuten** offene Tickets. Jedes Ticket wird **nur einmal** erinnert.

### Bewertungssystem

```jsonc
"ratingSystem": { "enabled": true, "dmUser": true, "ratingsChannelId": "CHANNEL_ID" }
```

### Auto-Close

```jsonc
"autoClose": { "enabled": true, "inactiveHours": 48, "warnBeforeHours": 6, "excludeClaimed": true }
```

---

## 🗄️ Datenbank-Schema

| Tabelle | Inhalt |
|---|---|
| `tickets` | Alle Tickets: Status, Typ, Priorität, Claim-Info, Erinnerung, Transcript |
| `blacklist` | Gesperrte Nutzer mit Grund und Zeitstempel |
| `staff_notes` | Private Staff-Notizen pro Ticket |
| `ratings` | Bewertungen (1–5 ⭐) mit optionalem Kommentar |

---

## 🌍 Neue Sprache hinzufügen

1. `locales/de.json` kopieren, z.B. als `locales/fr.json`
2. Alle Texte übersetzen
3. In `config/config.jsonc` `"lang": "fr"` setzen

---

## 📖 Dokumentation

Die vollständige Dokumentation ist verfügbar unter **[docu.msk-scripts.de](https://docu.msk-scripts.de/discord/discord_ticketbot/getting-started)**.

---

## 📝 Lizenz

AGPL-3.0 — Quellcode muss bei Weitergabe oder Hosting offen bleiben und unter der gleichen Lizenz veröffentlicht werden.

Forken und Modifikationen, die die MSK Transcript Service-Integration entfernen oder umgehen, sind nicht zulässig. 
