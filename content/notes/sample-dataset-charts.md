---
status: draft
title: "Sample note: one dataset, two charts"
date: "2026-10-12"
claim: "Both charts below read the same table. Change a number once and both update."
source_context: "Placeholder written for the prototype to demo dataset-backed charts. Replace before launch."
---

Placeholder. The full trust arc, drawn from the **trust-arc** dataset:

```chart
{
  "dataset": "trust-arc",
  "x": "year",
  "y": "pct",
  "series": "category",
  "type": "line",
  "title": "The trust arc — % of US adults by category, 1995–2026",
  "ySuffix": "%",
  "yMin": 0,
  "yMax": 100,
  "height": 300,
  "colors": {
    "Information (internet)": "#888780",
    "ID & Access (internet)": "#1D9E75",
    "Logistics (internet)": "#378ADD",
    "Finance (internet)": "#c84b2a",
    "Information (AI)": "#c0bfba",
    "ID & Access (AI)": "#7ecfb0",
    "Logistics (AI)": "#8fc5e8",
    "Finance (AI)": "#e8a882"
  }
}
```

The same dataset, filtered to two series:

```chart
{
  "dataset": "trust-arc",
  "x": "year",
  "y": "pct",
  "series": "category",
  "type": "line",
  "title": "Finance only: internet vs AI",
  "ySuffix": "%",
  "yMin": 0,
  "yMax": 60,
  "height": 240,
  "include": [
    "Finance (internet)",
    "Finance (AI)"
  ],
  "colors": {
    "Finance (internet)": "#c84b2a",
    "Finance (AI)": "#e8a882"
  }
}
```
