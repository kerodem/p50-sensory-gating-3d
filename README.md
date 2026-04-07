# P50 Sensory Gating 3D Simulation

Evidence-constrained interactive simulation of auditory paired-click P50 sensory gating with a black/white visualization theme.

## What This Repository Contains
- Interactive 3D brain model with region-level activity dynamics
- Time-locked S1/S2 paired-click simulation (`S1=0 ms`, `S2=500 ms`)
- Adjustable gating parameters (mode, S2/S1 ratio, playback speed)
- Live neurological readouts (phase, suppression, active regions, neuron classes)
- ERP waveform panel (0-900 ms window)
- Source-backed research brief with peer-reviewed citations

## Project Structure
- `index.html`: Main simulation UI
- `app-r4.js`: Current cache-busted runtime (active)
- `styles-r2.css`: Current monochrome theme (active)
- `app.js`: Previous runtime variant kept for reference
- `styles.css`: Previous theme variant kept for reference
- `research-brief.md`: Literature-backed mechanism summary and references

## Quick Start
```bash
cd "/Users/kerodem/Documents/New project/p50-sensory-gating"
python3 -m http.server 8000
```
Then open [http://localhost:8000](http://localhost:8000).

## Controls
- **Gating Mode**
  - Typical inhibitory gating
  - Impaired gating (schizophrenia-like profile)
- **S2/S1 Ratio**
  - Lower values: stronger suppression
  - Higher values: weaker suppression
- **Speed**
  - Playback speed scaling
- **Pause / Restart Cycle**

## Scientific Model Notes
This is a mechanistic educational simulation constrained by published regional/timing findings. It does not claim literal single-neuron precision in a living human brain.

## Core Evidence (selected)
- Adler et al., 1982 (PMID 7104417)
- Grunwald et al., 2003 (PMID 12644356)
- Korzyukov et al., 2007 (PMID 17293126)
- Williams et al., 2011 (PMID 20735757)
- Bak et al., 2011 (PMID 21109008)
- Boutros et al., 2013 (PMID 23131383)
- Moxon et al. (PMCID PMC4170679)
- Freedman et al., 2020 (PMID 32061454)

## Browser Notes
- If the browser has stale cache, hard refresh.
- Build banner `Build r4 (cache-busted)` confirms latest frontend bundle.

## License
No license set yet. Add one if you plan to distribute.
