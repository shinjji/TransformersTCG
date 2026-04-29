# Autobot Archive — Transformers TCG Collection Manager

A web app for tracking your Transformers TCG card collection. Hosted on GitHub Pages, it connects to a Google Sheet as its database, allowing you to sync, update, and manage your collection from any device.

---

## Google Sheet setup

Your sheet needs a header row with columns in this order (all positions are configurable in the app's Configure tab):

### Main card sheet tab

| Col | Letter | Field | Notes |
|-----|--------|-------|-------|
| 1 | A | Active | `1` = visible in app, `0` = hidden/excluded |
| 2 | B | Front image URL | Card front artwork (Google Drive link) |
| 3 | C | Back image URL | Card back artwork (Google Drive link) |
| 4 | D | Set | Set name (e.g. `Wave 1`, `FM Wave 9`) |
| 5 | E | Type | `Character`, `Battle`, or `Stratagem` |
| 6 | F | Number | Card number within the set |
| 7 | G | Name | Card name |
| 8 | H | Character Sub-Name | Alt title / subtitle for character cards |
| 9 | I | Qty | Quantity owned (integer) |
| 10 | J | Faction | Comma-separated (e.g. `Autobot,Decepticon`) |
| 11 | K | Cost | Star cost |
| 12 | L | Keywords | Comma-separated trait keywords |
| 13 | M | Character Keywords | Comma-separated character-specific keywords |
| 14 | N | Combiner | Combiner team name (if applicable) |
| 15 | O | MPC | Third-party print flag (any non-empty value) |
| 16 | P | Stratagem → Character Links | Pipe-separated character names this stratagem applies to |
| 17 | Q | Stratagem → Battle Links | Pipe-separated battle card names linked to this stratagem |
| 18 | R | Character → Battle Links | Pipe-separated battle card names linked to this character |
| 19 | S | Updated At | Timestamp — auto-set by the app when qty is saved |

Column positions can be changed in the Configure tab — the above are just the defaults.

---

### Combiner artwork tab (`TransformersCombinerImages`)

A separate tab in the same spreadsheet. Each row is one combiner team.

| Col | Letter | Field | Notes |
|-----|--------|-------|-------|
| 1 | A | Name | Combiner team name — must match the value in the main sheet's Combiner column |
| 2 | B | Image URL | Combined-form artwork (Google Drive link) |
| 3 | C | Tooltip | Text shown on hover over the artwork label |
| 4 | D | Faction | Comma-separated faction names — used to show faction icons in the Combiners tab |
| 5 | E | Cost | Star cost (reserved, not yet used by the app) |
| 6 | F | Keywords | Comma-separated trait keywords — shown as icons in the Combiners tab |

---

### Icons tab (`TransformersIcons`)

A separate tab that maps keywords and factions to icon images. The app reads this on every sync and uses it to render icon chips throughout the collection, modal, and combiners views.

| Col | Letter | Field | Notes |
|-----|--------|-------|-------|
| 1 | A | Type | `Trait`, `Faction`, or `Character` |
| 2 | B | Keyword | The keyword string exactly as it appears in the card data |
| 3 | C | Image URL | Icon artwork (Google Drive link) |

- **Trait** icons appear on battle and character cards in the keyword filter and modal
- **Faction** icons appear in the collection filter bar, modal header, and combiners tab
- **Character** icons appear in the character keyword filter
- Rows with `NOT USED` in the Type column are skipped

---

## Google Cloud API setup

You need two things from Google Cloud: an **API key** (for reading the sheet) and a **Service Account** (for writing qty changes back to it).

### Ask an AI assistant to help you set this up

Paste the following prompt into any AI assistant:

> I have a web app hosted on GitHub Pages that needs to read from and write to a Google Sheet. I need step-by-step instructions to:
> 1. Create a Google Cloud project
> 2. Enable the Google Sheets API
> 3. Create an API key restricted to the Sheets API, and restrict it to my GitHub Pages domain
> 4. Create a Service Account, grant it **Editor** access to my Google Sheet, and download the JSON key file
> 5. How to find my Spreadsheet ID from the Google Sheets URL
>
> The GitHub Pages URL is: `https://YOUR-USERNAME.github.io/YOUR-REPO/`

Once you have your **API key**, **Service Account JSON**, and **Spreadsheet ID**, enter them in the app's Configure tab.

> **Note:** The API key is used for read-only syncing. The service account JSON key is used for write operations (updating qty). Keep the JSON key private — do not commit it to a public repo.

---

## Cloudflare Worker setup

The Worker acts as a proxy between the app and TFWiki.net, working around CORS restrictions and handling redirect following and content extraction.

### Steps

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and sign in (free account is sufficient)
2. Navigate to **Workers & Pages** → **Create** → **Create Worker**
3. Give it a name and click **Deploy**
4. Click **Edit code** and replace the default code with the contents of `worker.js` in this repo
5. Click **Deploy** again
6. Copy the Worker URL (e.g. `https://your-worker.your-subdomain.workers.dev`)
7. In the app's Configure tab, paste this URL into the Worker URL field

### What the Worker does

- `?search=TERM` — searches TFWiki via the MediaWiki API, tries a direct G1 page lookup first before falling back to search results
- `?title=TITLE` — fetches and parses a TFWiki page, returning the intro text and up to two thumbnail images
- Follows MediaWiki redirects automatically

---

## Image URLs

All image URLs should be Google Drive shareable links in the format:
```
https://drive.google.com/uc?export=view&id=YOUR_FILE_ID
```

The app automatically wraps these in a [wsrv.nl](https://wsrv.nl) proxy for CORS-safe loading and converts them to WebP for faster delivery. You do not need to modify the raw Drive URLs in your sheet.
