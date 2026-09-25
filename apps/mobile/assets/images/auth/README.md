# Authentication images

## Entry screen background

`entry-background.png` — Paris rooftops and the Eiffel Tower at sunrise, seen from Montmartre. Official
photo (replaces the temporary mockup crop used when the screen was first built, [`DECISIONS.md`](../../../mobiledocs/DECISIONS.md) D-29): no
baked-in text, so the screen's own "ROAM" + tagline (rendered in code) is the only text on it.

The screen fills the top of the display with `cover` and darkens the photo with a flat scrim (`derived.night`
at 42% opacity) for contrast — this photo's sky is pale, so the scrim is heavier than the splash screen's
(34%, `D-18`). Replace the file (keeping the name) if a different photo is preferred; re-check the "ROAM"
title and tagline are still readable against its brightest area.
