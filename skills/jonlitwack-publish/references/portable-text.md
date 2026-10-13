# Portable Text for jonlitwack.com

`body` is a JSON array of blocks. These are the only shapes the site uses; they match what the importer produced for the published essays.

Every block and every span needs a `_key`: a short string unique within the body (`"b1"`, `"b2"`, … and `"s1"`, `"s2"`, … is fine). When editing an existing body, keep the existing keys and give new blocks new ones.

## Paragraph

```json
{ "_type": "block", "_key": "b1", "style": "normal", "markDefs": [],
  "children": [ { "_type": "span", "_key": "s1", "text": "A plain paragraph.", "marks": [] } ] }
```

Split a paragraph into spans wherever formatting changes. Keep the exact text, including spaces at span edges.

## Inline formatting (`marks`)

| Markdown | marks |
|---|---|
| `*text*` or `_text_` | `["em"]` (renders in cyan: Jon's house style, so be exact about where italics start and end) |
| `**text**` | `["strong"]` |
| `***text***` | `["strong", "em"]` |
| `` `text` `` | `["code"]` |
| `~~text~~` | `["strike-through"]` |

```json
{ "_type": "block", "_key": "b2", "style": "normal", "markDefs": [],
  "children": [
    { "_type": "span", "_key": "s2", "text": "Velocity doubled. ", "marks": [] },
    { "_type": "span", "_key": "s3", "text": "Adoption moved 2 points.", "marks": ["em"] }
  ] }
```

## Links

Add a `markDefs` entry and reference its `_key` in the span's `marks`:

```json
{ "_type": "block", "_key": "b3", "style": "normal",
  "markDefs": [ { "_key": "l1", "_type": "link", "href": "https://example.com" } ],
  "children": [
    { "_type": "span", "_key": "s4", "text": "See ", "marks": [] },
    { "_type": "span", "_key": "s5", "text": "the report", "marks": ["l1"] }
  ] }
```

## Headings and quotes

`"style": "h2"` for `##`, `"h3"` for `###`, `"blockquote"` for `>` (one block per quoted paragraph). Essays don't use `#` (h1): the title is the h1.

## Lists

One block per item, with `listItem` (`"bullet"` or `"number"`) and `level` (1, or 2 for nested):

```json
{ "_type": "block", "_key": "b4", "style": "normal", "listItem": "bullet", "level": 1, "markDefs": [],
  "children": [ { "_type": "span", "_key": "s6", "text": "First item", "marks": [] } ] }
```

## Line break inside a paragraph

A Markdown hard break (two trailing spaces or a trailing `\`) is a span with text `"\n"` in the same block.

## Divider (`---` or `***` on its own line)

```json
{ "_type": "break", "_key": "b5", "style": "line" }
```

## Code block

```json
{ "_type": "code", "_key": "b6", "code": "npm run dev", "language": "bash" }
```

## Chart (a ```` ```chart ```` fence)

```json
{ "_type": "chart", "_key": "b7", "json": "{\"type\":\"bar\",\"title\":\"…\",\"xLabels\":[…],\"datasets\":[…]}" }
```

`json` is the fence's JSON **as a string**, unchanged. See charts.md. (A `code` block with `"language": "chart"` also works: the site converts it on save and rejects invalid JSON.)

## Not supported

- **Tables:** the site has no table block. Ask Jon how he wants the content (a list, or a chart). Don't pass a Markdown table through as text.
- **Inline images** in the body: ask Jon to add them in the admin.
- **Footnotes and raw HTML:** ask Jon.
