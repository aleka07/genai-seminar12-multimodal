# Мультимодальные генеративные системы — Seminar 12

A deck without slides for Seminar 12 of the course "Generative AI: Technologies and Applications" (al-Farabi Kazakh National University, 2026): multimodal generative systems, their capabilities and application scenarios.

**Live deck:** https://aleka07.github.io/genai-seminar12-multimodal/
**Speaker notes:** https://aleka07.github.io/genai-seminar12-multimodal/speaker-notes.html

One continuous scene, 14 states. The same 4096 dots regroup each time: one object, a dombra, is shown as a word, as image patches, as a waveform and a spectrogram, as video frames, in a shared space, and in four application scenes. A dot is a token.

Controls: → or Space forward, ← back, Home / End, `F` fullscreen, `M` mute; a state can be linked directly as `#7`. Sound starts on the first key press. In state 7 (the input → output matrix) a digit 1–4 picks the input row and a second digit the output column, or click a tile; left alone for 25 seconds, the matrix tours by itself.

What is real and what is drawn:
- everything is drawn by code; no image, video or audio model generated anything in the deck;
- the dombra sound is a plucked-string synthesis in the browser, and the waveform and spectrogram on screen are computed from the same buffer that plays;
- the token split of «домбра» is the real output of `tiktoken` (`o200k_base`);
- scenes marked «схема» are illustrations; every number on screen carries a source line. Model names and figures are as of November 2026.

The whole deck is one static file, `index.html`, with fonts inlined and no external requests. Its source is in `src/` (engine in `src/engine/`, one file per state in `src/states/`); the look and the engine interface are described in `DESIGN.md`. The build and check scripts are not part of this repository.

Fonts: Literata and PT Mono (both OFL, both cover Kazakh Cyrillic).
