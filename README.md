# SnoozeTunes

SnoozeTunes is a public, self-hostable Discord voice bot for calm and sleep audio.

It joins a configured voice channel and plays **local** music files (ambient, rain, lofi, white-noise, etc.) from your own storage.

## What SnoozeTunes does / does not do

### Does
- Plays local files from mounted folders (`/music/<preset>`)
- Supports slash commands for start/stop/status/presets/schedule/autostart/credits
- Loops continuously with randomized track selection and anti-repeat behavior
- Supports optional daily schedule, role restriction, and optional auto-start when people are in channel
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
MUSIC_HOST_PATH=/srv/snoozetunes/music
DATA_HOST_PATH=/srv/snoozetunes/data
MUSIC_LIBRARY_PATH=/music
TIMEZONE=America/New_York
EMPTY_CHANNEL_TIMEOUT_MINUTES=10
DEFAULT_PRESET=ambient
SCHEDULE_ENABLED=false
AUTO_START_WHEN_OCCUPIED=false
SCHEDULE_START=22:00
SCHEDULE_STOP=07:00
```

Notes:
- `MUSIC_HOST_PATH` is the host/NAS folder Docker should mount read-only into the container.
- `DATA_HOST_PATH` is the host/NAS folder Docker should mount read-write for bot state.
- `MUSIC_LIBRARY_PATH` is the path **inside** the container and should stay `/music` for Docker deployments.

## Slash commands

- `/sleep start [preset]`
- `/sleep stop`
- `/sleep status`
- `/sleep presets`
- `/sleep schedule start:<HH:mm> stop:<HH:mm> [preset]`
- `/sleep autostart enabled:<true|false>`
- `/sleep credits`

## Music library structure

```text
/music/
  tracks.json
  ambient/
    file1.mp3
  rain/
    file2.wav
  lofi/
  white-noise/
```

`tracks.json` format is documented in `music/tracks.example.json`.

`tracks.json` is loaded from the root of `MUSIC_LIBRARY_PATH`, so in Docker it should live directly in the mounted music folder on your host or NAS. If `tracks.json` is missing, playback still works, but `/sleep credits` will not have attribution data to show.

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

If you run the bot directly on your machine instead of in Docker, set `MUSIC_LIBRARY_PATH` in `.env` to a local folder such as `./music`.

## Docker deployment

1. Copy `.env.example` to `.env`.
2. Fill in your Discord settings plus `MUSIC_HOST_PATH` and `DATA_HOST_PATH`.
3. Create the host folders if they do not already exist.
4. Ensure your music folder contains preset directories such as `ambient/`, `rain/`, `lofi/`, and `white-noise/`.
5. Place `tracks.json` in the root of that music folder if you want `/sleep credits` attribution.
6. Build and run:

```bash
docker compose up -d --build
```

Compose includes:
- `/music` mounted read-only
- `/data` mounted read-write
- `restart: unless-stopped`
- No exposed ports

Example mappings (adapt paths for TrueNAS/Unraid/Linux):
- `MUSIC_HOST_PATH=/srv/snoozetunes/music`
- `DATA_HOST_PATH=/srv/snoozetunes/data`

## Portainer repository stack deployment

1. Create a Stack from this repository.
2. Use `docker-compose.yml` from the repo.
3. Do **not** commit or upload a real `.env` file.
4. Enter the values from `.env.example` in Portainer's **Environment variables** section.
5. Set `MUSIC_HOST_PATH` and `DATA_HOST_PATH` to folders visible to the Docker host.
6. On TrueNAS SCALE, those paths are typically under `/mnt/<pool-name>/...`.
7. Deploy the stack.

Example host-path values for TrueNAS SCALE:

```env
MUSIC_HOST_PATH=/mnt/<pool-name>/media/music/SnoozeTunes/music
DATA_HOST_PATH=/mnt/<pool-name>/apps/snoozetunes/data
```

Inside the container, SnoozeTunes still sees the library at `/music` regardless of the host path you choose.

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

### Portainer stack sees the wrong path
- Portainer environment variables only affect values referenced in `docker-compose.yml`.
- `MUSIC_HOST_PATH` must be the real host path on the Docker/TrueNAS system.
- `MUSIC_LIBRARY_PATH` should remain `/music`; it is the path *inside* the SnoozeTunes container.

### Voice channel disconnects
- SnoozeTunes attempts reconnect when practical.
- It disconnects automatically if the configured channel remains empty past timeout.

## Security notes

- Keep your Discord token private; never commit `.env`.
- Mount `/music` as read-only.
- Use least-privilege Discord permissions.

## Legal documents

- Privacy Policy: [docs/privacy-policy.md](./docs/privacy-policy.md)
- Terms of Service: [docs/terms-of-service.md](./docs/terms-of-service.md)

These documents are generic starting points for SnoozeTunes. Replace the placeholder contact details and review them for your specific deployment before publishing them in the Discord Developer Portal or elsewhere.
