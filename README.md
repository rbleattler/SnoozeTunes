# SnoozeTunes

SnoozeTunes is a public, self-hostable Discord voice bot for calm and sleep audio.

It joins a configured voice channel and plays **local** music files (ambient, rain, lofi, white-noise, etc.) from your own storage.

## What SnoozeTunes does / does not do

### Does
- Plays local files from mounted folders (`/music/<preset>`)
- Supports slash commands for start/stop/status/presets/schedule/credits
- Loops continuously with randomized track selection and anti-repeat behavior
- Supports optional daily schedule and optional role restriction
- Shows attribution from a local track catalog

### Does not
- Stream from YouTube, Spotify, SoundCloud, or any scraping service
- Expose inbound HTTP ports
- Include copyrighted music in this repository

## Architecture summary (MVP)

- `src/index.ts`: startup, env loading, Discord client lifecycle, command registration, graceful shutdown
- `src/commands/sleepCommand.ts`: `/sleep` subcommands and access control checks
- `src/services/sleepService.ts`: voice connection, playback loop, ffmpeg transcoding, empty-channel timeout, reconnect handling
- `src/services/schedulerService.ts`: optional cron start/stop scheduling
- `src/audio/*`: preset scanning and track attribution lookup
- `src/config/env.ts`: strict environment validation with actionable errors

## Discord Developer Portal setup

1. Create a new application in the Discord Developer Portal.
2. Add a Bot user.
3. Copy bot token to `.env` (`DISCORD_TOKEN`).
4. Enable only the intents needed by this bot (Guilds + Guild Voice States).
5. Invite bot with permissions:
   - View Channels
   - Send Messages
   - Connect
   - Speak
   - Use Application Commands
6. Set `DISCORD_CLIENT_ID` and (optionally) `DISCORD_GUILD_ID`.

## Environment configuration

Copy `.env.example` to `.env`.

```env
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
VOICE_CHANNEL_ID=
ALLOWED_ROLE_ID=
MUSIC_LIBRARY_PATH=/music
TIMEZONE=America/New_York
EMPTY_CHANNEL_TIMEOUT_MINUTES=10
DEFAULT_PRESET=ambient
SCHEDULE_ENABLED=false
SCHEDULE_START=22:00
SCHEDULE_STOP=07:00
```

## Slash commands

- `/sleep start [preset]`
- `/sleep stop`
- `/sleep status`
- `/sleep presets`
- `/sleep schedule start:<HH:mm> stop:<HH:mm> [preset]`
- `/sleep credits`

## Music library structure

```text
/music/
  ambient/
    file1.mp3
  rain/
    file2.wav
  lofi/
  white-noise/
  tracks.json
```

`tracks.json` format is documented in `music/tracks.example.json`.

## License and attribution expectations

- You must supply your own properly licensed music.
- Prefer CC0, public-domain, or appropriately licensed CC BY content.
- SnoozeTunes displays attribution from `tracks.json` via `/sleep credits`.
- No legal guarantees are provided.

## Local development

```bash
npm ci
cp .env.example .env
npm run lint
npm run test
npm run build
npm run dev
```

## Docker deployment

Build and run:

```bash
docker compose up -d --build
```

Compose includes:
- `/music` mounted read-only
- `/data` mounted read-write
- `restart: unless-stopped`
- No exposed ports

Example mappings (adapt paths for TrueNAS/Unraid/Linux):
- `/srv/snoozetunes/music:/music:ro`
- `/srv/snoozetunes/data:/data:rw`

## Portainer deployment

1. Create a Stack.
2. Paste `docker-compose.yml`.
3. Upload `.env` as stack env vars or use bind-mounted env file.
4. Update volume host paths for your NAS/server.
5. Deploy stack.

## Troubleshooting

### Bot is online but cannot join voice
- Verify `VOICE_CHANNEL_ID` and that bot has Connect + Speak.
- Confirm bot can view the target channel.

### Missing permissions
- Re-check invite permissions and channel overrides.
- If `ALLOWED_ROLE_ID` is set, ensure your user has that role.

### FFmpeg/audio errors
- Ensure FFmpeg exists in runtime container (`ffmpeg -version`).
- Remove unsupported/corrupt files; bot skips files that fail playback.

### Docker volume permission issues
- Ensure container user can read `/music` and write `/data`.
- Verify file ownership and mount paths.

### Voice channel disconnects
- SnoozeTunes attempts reconnect when practical.
- It disconnects automatically if the configured channel remains empty past timeout.

## Security notes

- Keep your Discord token private; never commit `.env`.
- Mount `/music` as read-only.
- Use least-privilege Discord permissions.
