"""Refresh the data files that back the site's live feeds.

Run nightly by .github/workflows/refresh-feed-snapshots.yaml, or by hand:

    python scripts/refresh_feed_snapshots.py

* data/videos_archive.json grows with every video the YouTube feed shows, so
  videos stay on /videos after they drop out of the feed's 15 newest.
* data/huggingface_snapshot.json is the last good copy of the Hugging Face
  model and dataset listings, used when the API is unreachable at build time.

A source that can't be reached is skipped with a warning and its file left as
it was, so a flaky upstream never wipes a snapshot. Standard library only.
"""

import json
import re
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VIDEOS = ROOT / "data" / "videos_archive.json"
HF_SNAPSHOT = ROOT / "data" / "huggingface_snapshot.json"
HF_AUTHOR = "openadmet"

NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}

# Kept in step with layouts/partials/feeds/youtube-videos.html.
SUMMARY_LIMIT = 220
NO_SUMMARY = "A recording from the OpenADMET community."


def fetch(url, attempts=5):
    """GET with retries: YouTube's feed returns stray 404s and 500s."""
    req = urllib.request.Request(url, headers={"User-Agent": "openadmet-site-refresh"})
    for attempt in range(1, attempts + 1):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read()
        except Exception:  # noqa: BLE001
            if attempt == attempts:
                raise
            time.sleep(2 * attempt)


def truncate(text, limit):
    """Cut at a word boundary with an ellipsis, as Hugo's truncate does."""
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0] + "…"


def tidy_title(title):
    title = re.sub(r"\s+", " ", title)
    return title.replace(" - ", " — ").strip()


def tidy_summary(description):
    lead = description.strip().split("\n\n")[0]
    lead = re.sub(r"\s+", " ", lead).strip()
    return truncate(lead, SUMMARY_LIMIT) if lead else NO_SUMMARY


def write_json(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def refresh_videos(feed_url):
    try:
        root = ET.fromstring(fetch(feed_url))
    except Exception as exc:  # noqa: BLE001 - any failure means "skip this run"
        print(f"WARN: YouTube feed unreachable, archive left unchanged: {exc}")
        return

    archive = {v["id"]: v for v in json.loads(VIDEOS.read_text(encoding="utf-8"))}
    before = len(archive)
    for entry in root.findall("atom:entry", NS):
        video_id = entry.findtext("yt:videoId", namespaces=NS)
        description = entry.findtext("media:group/media:description", default="", namespaces=NS)
        archive[video_id] = {
            "id": video_id,
            "title": tidy_title(entry.findtext("atom:title", default="", namespaces=NS)),
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "thumb": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
            "published": entry.findtext("atom:published", namespaces=NS),
            "summary": tidy_summary(description),
        }

    videos = sorted(archive.values(), key=lambda v: v["published"], reverse=True)
    write_json(VIDEOS, videos)
    print(f"videos: {len(videos)} in archive ({len(videos) - before} new)")


def slim(repo):
    """Keep only the fields layouts/partials/feeds/huggingface.html reads."""
    card = repo.get("cardData") or {}
    return {
        "id": repo["id"],
        "lastModified": repo.get("lastModified"),
        "private": repo.get("private", False),
        "cardData": {k: card[k] for k in ("pretty_name", "license") if k in card},
        "description": (repo.get("description") or "")[:600],
    }


def refresh_huggingface():
    snapshot = {}
    for kind in ("models", "datasets"):
        url = f"https://huggingface.co/api/{kind}?author={HF_AUTHOR}&full=true&cardData=true&limit=500"
        try:
            repos = json.loads(fetch(url))
        except Exception as exc:  # noqa: BLE001
            print(f"WARN: Hugging Face {kind} listing unreachable, snapshot left unchanged: {exc}")
            return
        snapshot[kind] = sorted((slim(r) for r in repos), key=lambda r: r["id"].lower())
    write_json(HF_SNAPSHOT, snapshot)
    print(f"huggingface: {len(snapshot['models'])} models, {len(snapshot['datasets'])} datasets")


def youtube_feed_url():
    config = (ROOT / "config.toml").read_text(encoding="utf-8")
    return re.search(r'^\s*youtubeFeed\s*=\s*"([^"]+)"', config, re.M).group(1)


def main():
    refresh_videos(youtube_feed_url())
    refresh_huggingface()
    return 0


if __name__ == "__main__":
    sys.exit(main())
