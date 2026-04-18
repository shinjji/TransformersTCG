# Autobot Archive — Transformers TCG Collection Manager

A web app for tracking your Transformers TCG card collection. Hosted on GitHub Pages, it connects to a Google Sheet as its database, allowing you to sync, update, and manage your collection from any device.

---

## Google Sheet setup

Your sheet needs a header row with columns in this order (configurable in the app's Configure tab):

| Col | Default | Field |
|---|---|---|
| 1 | Front image URL | Card front artwork (Google Drive link) |
| 2 | Back image URL | Card back artwork (Google Drive link) |
| 3 | Set | Set name |
| 4 | Type | Character / Battle / Stratagem |
| 5 | Number | Card number |
| 6 | Name | Card name |
| 7 | Qty | Quantity owned |
| 8 | Combiner | Combiner name (if applicable) |
| 9 | Updated At | Timestamp (auto-set by app on save) |
| 10 | Keywords | Comma-separated keywords |
| 11 | Character Keywords | Comma-separated character keywords |
| 12 | Faction | Autobot / Decepticon etc. |
| 13 | Cost | Star cost |
| 14 | MPC | Third-party print flag (any non-empty value) |

Column positions can be changed in the Configure tab — the above are just defaults.

---

## Google Cloud API setup

You need two things from Google Cloud: an **API key** (for reading the sheet) and **OAuth credentials** (for writing back to it).

### Ask an AI assistant to help you set this up

Paste the following prompt into any AI assistant:

> I have a web app hosted on GitHub Pages that needs to read from and write to a Google Sheet. I need step-by-step instructions to:
> 1. Create a Google Cloud project
> 2. Enable the Google Sheets API
> 3. Create an API key restricted to the Sheets API, and restrict it to my GitHub Pages domain
> 4. Create an OAuth 2.0 client ID for a web application, with my GitHub Pages URL as an authorised JavaScript origin
> 5. How to find my Spreadsheet ID from the Google Sheets URL
>
> My GitHub Pages URL is: `https://YOUR-USERNAME.github.io/YOUR-REPO/`

Once you have your **API key**, **OAuth Client ID**, and **Spreadsheet ID**, enter them in the app's Configure tab.

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

## Combiner artwork setup

Combiner artwork is stored in a separate Google Sheet tab. The app reads from a named range or second sheet. Configure the sheet name in the Configure tab.

Image URLs should be Google Drive shareable links in the format:
```
https://drive.google.com/uc?export=view&id=YOUR_FILE_ID
```
