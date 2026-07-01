# SnoozeTunes Privacy Policy

Effective date: July 1, 2026

This Privacy Policy describes how SnoozeTunes handles information when the bot is used.

Important:
- This document is a general-purpose policy for SnoozeTunes.
- Replace the contact details in this document before publishing it for a live public deployment.
- If you self-host, fork, or materially modify SnoozeTunes, your deployment may have different data practices and you are responsible for publishing your own policy.

## Summary

SnoozeTunes is designed to play locally hosted audio in Discord voice channels.

SnoozeTunes is not designed to:
- sell personal information
- run advertising profiles
- track users across services
- store message content or record voice audio

## Information SnoozeTunes Processes

To function, SnoozeTunes may receive limited information from Discord and from the environment where it is hosted, including:
- Discord server (guild) identifiers
- Discord channel identifiers
- Discord role identifiers used for command access control
- slash command interactions needed to respond to commands such as `/sleep start`, `/sleep stop`, `/sleep status`, `/sleep presets`, `/sleep schedule`, `/sleep autostart`, and `/sleep credits`
- voice-state events needed to detect whether a configured voice channel is occupied
- technical log data generated during operation, such as startup status, error messages, and limited configuration or playback metadata

SnoozeTunes is not intended to store a database of personal profiles, direct messages, message history, or voice recordings.

## How SnoozeTunes Uses Information

SnoozeTunes uses the limited information it processes only to:
- register and respond to bot commands
- verify whether a command may be used in a configured server or by a configured role
- join a configured voice channel and play audio from the mounted music library
- support optional scheduling and auto-start behavior
- troubleshoot operational issues and maintain service reliability

## Data Retention

SnoozeTunes is designed for minimal retention.

In the standard repository version:
- music attribution data is read from a local `tracks.json` file supplied by the operator
- music files are read from the mounted library path supplied by the operator
- SnoozeTunes is not designed to persist user-submitted content in an application database

Operational logs may be retained by the hosting platform, container runtime, or operator according to that environment's settings. Those logs may include limited technical metadata such as server IDs, channel IDs, preset names, or error details.

## Data Sharing

SnoozeTunes does not sell personal information.

SnoozeTunes is not designed to share Discord API data with data brokers, advertisers, or analytics networks. Limited information may be disclosed only:
- to the extent necessary for Discord itself to provide the platform
- to the hosting provider or infrastructure operator that runs the bot
- when required by applicable law, regulation, legal process, or court order

## Security

SnoozeTunes is intended to be self-hosted by the operator. The operator is responsible for securing the hosting environment, Discord bot token, mounted storage, logs, backups, and access controls.

No method of transmission, storage, or processing is guaranteed to be completely secure.

## Children's Privacy

SnoozeTunes is not directed to children under 13 and is not intended for users below the minimum age required to use Discord in their jurisdiction.

## Your Choices

Because SnoozeTunes is designed for minimal retention, there is ordinarily little or no stored personal data for SnoozeTunes itself to access, export, correct, or delete.

If you believe SnoozeTunes retained personal data about you in error, you may contact the operator at:

`replace-with-your-email@example.com`

If SnoozeTunes is self-hosted by someone other than the original project owner, requests should be directed to that specific operator.

## Third-Party Services

SnoozeTunes depends on third-party services and infrastructure, including Discord and the hosting environment used by the operator. Those services have their own terms, privacy notices, and data practices.

## Changes to This Policy

This Privacy Policy may be updated from time to time. The updated version becomes effective when published with a revised effective date.

## Contact

For privacy questions about an official SnoozeTunes deployment, contact:

`replace-with-your-email@example.com`
