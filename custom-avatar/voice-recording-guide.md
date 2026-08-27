# Professional voice recording guide

> **Documentation:** [Custom avatar and voice](README.md) · [Consent](consent-statements.md) · [Voice deployment](voice-deployment.md) · [Home](../README.md)

Use this guide for an approved standalone Professional/Custom Neural Voice. Current Microsoft requirements for dataset size, format, locale, and quality override this repository.

Official training-data guidance: <https://learn.microsoft.com/azure/ai-services/speech-service/how-to-custom-voice-training-data>

## Recording plan

1. Confirm Limited Access and organisational approval.
2. Choose one supported locale and a clear intended speaking style.
3. Obtain the current official talent-consent script.
4. Use a Microsoft-provided script or build a reviewed script with varied statements, questions, numbers, abbreviations, names, and domain vocabulary.
5. Record the dataset and consent with the same talent, microphone, room, and delivery style.
6. Validate every transcript against its recording.

## Quality checklist

- Quiet, acoustically controlled room.
- Consistent microphone, gain, distance, sample format, and placement.
- No clipping, hum, HVAC, keyboard, traffic, music, or other voices.
- Natural, sustainable pace and energy.
- Short clean silence at clip boundaries.
- One utterance per file when required by the selected data format.
- Exact transcript, punctuation, and spoken content match.
- Re-record mistakes rather than editing words together.

## Domain coverage for ClientSphere

Include approved examples of:

- customer and product names;
- industry terms used in the configured portfolio;
- currencies, percentages, dates, units, and acronyms;
- discovery questions and concise meeting-coaching language;
- citations, uncertainty, and synthetic-data disclosure.

Do not include confidential customer facts, private conversations, secrets, or personal data in the training script.

## Data handling

- Keep raw recordings, transcripts, consent, and trained-asset identifiers outside Git.
- Limit access to the approved training team.
- Define retention, deletion, talent withdrawal, and incident-response procedures.
- Do not repurpose the voice beyond the approved scenario.

After data validation, follow [voice-deployment.md](voice-deployment.md).
