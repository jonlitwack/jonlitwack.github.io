# Charts on jonlitwack.com

A chart is a `chart` block whose `json` field holds the chart definition as a string. If Jon's text already has a ```` ```chart ```` fence, copy its JSON unchanged. Only write chart JSON yourself when Jon asks for a chart and gives you the numbers. Never invent or round data.

## Jon is colourblind: hard rules

- Never let colour alone carry meaning. The site gives every line series its own dash pattern and marker shape automatically, so don't fight it. Don't set the same `dash` on two series.
- Never use a red/green pair to mean good/bad or before/after.
- Label series clearly (`label`): the key and the end-of-line labels are how readers tell them apart.
- Leave `color` out unless Jon asks for one. Series without a colour render in the site's ink colour, distinguished by dash and marker.

## Inline format (the usual one)

```json
{
  "type": "line",
  "title": "The disconnect",
  "source": "Team metrics, sprints 1–8",
  "xLabels": ["Sprint 1", "Sprint 2", "Sprint 3"],
  "ySuffix": "%",
  "datasets": [
    { "label": "Velocity (story points)", "data": [24, 28, 31] },
    { "label": "User adoption (%)", "data": [12, 12.5, 13] }
  ]
}
```

| Key | Meaning |
|---|---|
| `type` | `"line"` or `"bar"` |
| `title`, `source` | Shown above and below the chart. Always include `source` when Jon gives one. |
| `xLabels` | One label per data point. |
| `xSuffix`, `ySuffix` | Appended to axis values (`"%"`). |
| `yMin`, `yMax` | Fix the y-axis range. |
| `height` | Pixels, default about 300. |
| `datasets[]` | `label`, `data` (numbers, same length as `xLabels`), optional `color`, `dash` (e.g. `[7,4]`), `width`, `fill`, and for bars `colors` (one per bar; the site hatches the odd one out as a highlight). |

## Dataset reference

When the numbers already live in the site's Datasets collection, reference it instead of copying them:

```json
{ "dataset": "trust-arc", "x": "year", "y": "pct", "series": "category", "type": "line", "title": "…" }
```

Check the dataset exists first: `content_list` on `datasets`. You can't create or edit datasets (Jon does that in the admin's grid editor), so for new data use the inline format.

## Check

After filing, the readback shows the chart as an `<!--ec:block {"_type":"chart",…} -->` line. Confirm the JSON parses and the numbers match what Jon gave. Tell Jon to open the admin preview to see it drawn.
