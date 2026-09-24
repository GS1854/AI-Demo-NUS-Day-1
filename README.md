# Snip backend

This branch contains the in-memory API backend for Snip.

## Run

```bash
npm start
```

The API listens on port 3000 by default. Set `PORT` to use another port.

## API

| Method | Path | Response |
| --- | --- | --- |
| `POST` | `/api/links` with `{ "url": "https://..." }` | `201` with `{ code, url, shortUrl, hits, createdAt }` or `400` |
| `GET` | `/api/links` | `200` with an array of link records |
| `GET` | `/:code` | `302` redirect to the original URL, incrementing hits; `404` if missing |
