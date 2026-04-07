# P50 Sensory Gating: Research Brief + Model Specification

## 1) What P50 Sensory Gating Is
P50 sensory gating is a paired-stimulus electrophysiology phenomenon: two identical stimuli are presented (usually `S1` then `S2`), typically with a `500 ms` interstimulus interval. In healthy gating, the response to `S2` is reduced relative to `S1`, reflecting inhibitory filtering of redundant input.

Common metrics:
- `S2/S1 ratio` (lower generally indicates stronger gating)
- `S1 - S2 difference` or covariance-adjusted `S2` measures

## 2) Key Timing Sequence in the Brain
Evidence supports a multi-step process rather than a single generator:

1. Early cortical registration (`~50 ms`): temporal/neocortical structures register stimulus energy.
2. Inhibitory recruitment (`~80-180 ms`): frontal/cingulate/insula-claustrum control processes contribute to suppression.
3. Late hippocampal contribution (`~250 ms`): hippocampus contributes in a later window and supports ongoing suppression dynamics.

## 3) Regional Circuit Evidence

### A. Deficit signature in schizophrenia
- In the original 1982 study, at `0.5 s` interval, controls had >`90%` mean decrement while schizophrenia patients had <`15%` mean decrement; deficit persisted at longer intervals.  
  Source: [Adler et al., 1982 (PMID 7104417)](https://pubmed.ncbi.nlm.nih.gov/7104417/)

### B. Intracranial human recordings
- Direct intracranial recordings showed gating involvement in hippocampus, temporo-parietal cortex, and prefrontal cortex; neocortical habituation peaked around `50 ms`, while hippocampal responses were around `250 ms`.  
  Source: [Grunwald et al., 2003 (PMID 12644356)](https://pubmed.ncbi.nlm.nih.gov/12644356/)

### C. Intracranial source localization (temporal vs frontal roles)
- Temporal lobe appeared as major P50 generator; frontal lobe contributed strongly to amplitude reduction/gating effect.  
  Source: [Korzyukov et al., 2007 (PMID 17293126)](https://pubmed.ncbi.nlm.nih.gov/17293126/)

### D. EEG source modeling in schizophrenia and controls
- Best-fit network included superior temporal gyrus, hippocampus, DLPFC, and thalamus; hippocampal dipole relationships were strong in controls, while DLPFC relationships were prominent in schizophrenia.  
  Source: [Williams et al., 2011 (PMID 20735757)](https://pubmed.ncbi.nlm.nih.gov/20735757/)

### E. Combined EEG + fMRI localization
- With `500 ms` ISI, suppression was observed; with `1000 ms` ISI it was not. Source clusters implicated medial frontal gyrus, insula, claustrum, hippocampus; hippocampus/claustrum activity associated with suppression.  
  Source: [Bak et al., 2011 (PMID 21109008)](https://pubmed.ncbi.nlm.nih.gov/21109008/)

### F. Expanded cortical mapping of repetition suppression
- Intracranial mapping found not just temporal regions but also prefrontal, cingulate, and parietal contributions to repetition suppression.  
  Source: [Boutros et al., 2013 (PMID 23131383)](https://pubmed.ncbi.nlm.nih.gov/23131383/)

## 4) Cellular / Neurochemical Mechanisms

### A. Septohippocampal cholinergic modulation and alpha7 nicotinic receptors
- Animal and model work support cholinergic control over CA3 inhibitory circuitry; alpha7-related mechanisms are repeatedly implicated in gating modulation.  
  Source: [Moxon et al., 2003/2014 manuscript (PMCID PMC4170679)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4170679/)

### B. Local inhibitory mechanisms
- Modeling and experimental work suggest that GABA-mediated mechanisms (including presynaptic `GABA_B` dynamics) may be necessary to suppress test responses at `500 ms`.  
  Source: [Moxon et al., PMCID PMC4170679](https://pmc.ncbi.nlm.nih.gov/articles/PMC4170679/)

### C. Nicotine effects
- Nicotine transiently improved deficient gating in relatives of schizophrenia patients in early clinical work.  
  Source: [Adler et al., 1992 (PMID 1450287)](https://pubmed.ncbi.nlm.nih.gov/1450287/)

## 5) Genetics and Biomarker Stability
- CHRNA7-region association evidence supported linkage disequilibrium at chromosome `15q13-14` in schizophrenia genetics work.  
  Source: [Freedman et al., 2001 (PMID 11424985)](https://pubmed.ncbi.nlm.nih.gov/11424985/)

- Multi-study analysis (27 independent studies, `1179` schizophrenia and `1091` controls) showed robust patient-control separation for both ratio and covariance-based metrics (`P < 0.0001`), with stronger distributional properties for covariance-adjusted measures.  
  Source: [Freedman et al., 2020 (PMID 32061454)](https://pubmed.ncbi.nlm.nih.gov/32061454/)

## 6) What This Means for "Exactly Down to the Pixel"
Current human neuroimaging/EEG cannot provide exact single-neuron, pixel-precise ground truth for whole-brain live gating in the way your prompt requests. P50 inference is population-level and inverse-problem-limited.

Representative resolution-limit source:
- [Daffertshofer et al., 2018 EEG source reconstruction resolution (PMID 29496570)](https://pubmed.ncbi.nlm.nih.gov/29496570/)

## 7) How the Included 3D Model Was Parameterized
The simulation (`index.html` + `app.js`) encodes:
- `S1=0 ms`, `S2=500 ms`
- P50 cortical window centered near `~50-55 ms`
- Late hippocampal wave near `~250 ms`
- Region set: STG, thalamus, DLPFC, ACC, insula, claustrum, hippocampus, septal cholinergic node
- Two modes:
  - **Typical inhibitory gating** (low ratio, stronger S2 suppression)
  - **Impaired gating** (high ratio, weaker S2 suppression)
- Dynamic "neuron class activation" bars:
  - thalamocortical relay
  - cortical pyramidal
  - hippocampal CA3 pyramidal
  - GABA interneuron recruitment
  - septal cholinergic drive

## 8) Practical Interpretation
- The model is best interpreted as a **mechanistic teaching simulation** constrained by published timings and regional findings.
- It is **not** a claim of exact neuron-by-neuron truth in a specific person.
