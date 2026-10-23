# OpenADMET website

This repository contains the source code for the OpenADMET website, which is built using [Hugo](https://gohugo.io/) and is deployed to GitHub Pages. We are using Cloudflare Pages to handle preview deployments of changes.


## Preview the website locally

0. [Download and install Hugo](https://gohugo.io/getting-started/installing/).
1. In the top-level directory, run `hugo server -D`
2. Copy the Web address from this line (in this example, it is `localhost:1313`):
```
Web Server is available at //localhost:1313/ (bind address 127.0.0.1)
```
3. Paste the Web address into your browser

## Making changes

1. Create a new branch with `git checkout -b <mybranch>`, where `<mybranch>` is the name of your new branch.
2. Commit the changes (`git commit .`) and push the repository to your branch (`git push origin <mybranch>`)
3. Open a PR and request review

## Deploying

### GitHub Pages (Current)
Deploying is handled by a Github actions (see the `.github/workflows/gh-pages.yml` file). Commits/PRs into the `main` branch will trigger a new build. Once built, the action will push the content to the `gh-pages` branch, which the website is now served from.

### Cloudflare Pages (Optional)
The repository is also configured for Cloudflare Pages deployment with automatic PR previews. This provides:
- **PR Previews**: Every pull request gets a unique preview URL for testing changes
- **Cleanup**: Automatic removal of old preview deployments when PRs are closed

#### Cloudflare Workflows
- `build-pr.yaml` - Builds Hugo site for PR previews
- `stage-cloudflare.yaml` - Deploys PR previews to Cloudflare staging
- `cleanup-cloudflare.yaml` - Cleans up old preview deployments

## Developer Guide

### Adding new members

1. Add an image to `content/members/img/` (e.g. `firstname-lastname.jpg`).
2. Add a YAML file `firstname-lastname.yaml` to `data/members/` in the following format:
```YAML
name: John D. Chodera
role: Primary Investigator
lab: Chodera lab
title: Associate Member
institution: Sloan Kettering Institute
img: john-chodera.jpg
webpage: "http://choderalab.org"
description: Automated Bayesian force field fitting and prediction of systematic error
google_scholar: http://goo.gl/qO0JW
ORCID: 0000-0003-0542-119X
twitter: jchodera
github: jchodera
active: true
```

You can remove someone from appearing by setting `active` to `false`



### Adding a job

1. Add a YAML file to `/data/jobs` with the following format

```YAML
role: Role Title
title: Title
anchor: title-blah
institution: Placeholder Institution
location: Remote
investigator: Mary Appleseed
investigator_url: https://investigator.example
contact_email: email@example

availability: Immediate
status: open
summary: |
  Job description
```

To set the job to unavailable, modify the `status` tag to `closed`

### Auto-updating Blog & Videos cards

The homepage **Blog** card, the homepage **Videos** card, and the full
**`/videos`** gallery are not hand-edited. They are generated at build time from
live feeds, and the nightly build (see `.github/workflows/build-push.yaml`)
refreshes them automatically — so a new blog post or YouTube video appears on the
site within a day of publishing, with no code change.

#### How to control what a card says

- **Blog card** text comes from the post's **Excerpt** field in the Ghost editor.
  If you leave the Excerpt blank, Ghost falls back to scraping the opening
  sentences of the post, which usually reads poorly on a card. Set the Excerpt
  when you publish and that becomes the card copy.
  - **External-link posts are a special case.** A few Ghost posts are stubs that
    redirect to a self-hosted article elsewhere (e.g. "Navigating PXR Chemical
    Space…" redirects to `openadmet.github.io/octant-pxr-htchem-blogpost/`). These
    have **no body** in the RSS feed, so there is nothing for Ghost to scrape —
    if such a post is the newest one, the card preview goes **blank** unless you
    set an Excerpt. Always set the Excerpt on external-link posts. The redirect
    itself is unaffected: the card links to the Ghost URL, and Ghost forwards to
    the self-hosted page, so the "More →" button keeps working as before.
- **Video card** text comes from the video's **description** on YouTube. That
  description is the single place to edit a video card. A video with no
  description falls back to generic text, and the build prints a `WARN` naming the
  video so you know to add one.

#### Where the feed URLs live

All three feeds are configured under `[params]` in `config.toml`
(`ghostFeed`, `youtubeFeed`, `youtubeChannel`). Point `youtubeFeed` at a
different channel by changing its `channel_id`.

#### Known behaviors

- **Dates render in UTC.** A video uploaded late in the Pacific evening will show
  the next day's date. This is not auto-corrected: Hugo ignores the site timezone
  once a feed timestamp carries a UTC offset, and the alternative (`.Local`) would
  make a local build and the CI build disagree.
- **Only the 15 most recent** YouTube uploads are exposed by the feed. Older
  videos stay on `/videos` because the feed is merged with
  `data/videos_archive.json`, which the nightly
  `.github/workflows/refresh-feed-snapshots.yaml` grows with every video the
  feed has shown (via `scripts/refresh_feed_snapshots.py`; run it by hand to
  refresh locally). Where a video is in both, the feed's copy wins, so edits on
  YouTube still come through. To drop an old video, delete it from the archive.
- **Every video on the channel appears**, including older workshop recordings,
  because the page mirrors the channel rather than a curated list.

#### If a feed is down at build time

- **YouTube unreachable or empty** → the build **succeeds** and the Videos card
  and `/videos` gallery are served from `data/videos_archive.json` alone, with a
  `WARN` printed. The YouTube feed (`youtube.com/feeds/videos.xml`) is
  occasionally flaky even when the channel itself is fine (stray 404s and 500s),
  so this is what keeps deploys from being blocked by an unrelated blip. The
  build only fails outright (see the `errorf` in `layouts/_default/videos.html`)
  if the archive itself is missing or empty, which would mean something is
  actually broken rather than YouTube just being slow.
- **Hugging Face unreachable** → the build **succeeds** and `/datasetsmodels`
  and the homepage counts use `data/huggingface_snapshot.json`, the last good
  listing saved by the nightly refresh, with a `WARN` printed.
- **Ghost unreachable** → the build **succeeds** and the Blog card falls back to
  the last-known content baked into `layouts/partials/feeds/ghost-latest.html`.
  Update that fallback if the most recent post changes and you want the safety net
  to match.

### Datasets & Models from Hugging Face

`/datasetsmodels` and the homepage counts are built from the live list of repos
under [huggingface.co/openadmet](https://huggingface.co/openadmet)
(`layouts/partials/feeds/huggingface.html`), so a new model or dataset appears
on the next build without touching the site.

- **Card text and order** live in `data/huggingface.yaml`. Each `models` and
  `datasets` entry gives a repo `id`, a `title` and the `lines` under it, and
  the list order is the display order.
- **New repos** not listed there still appear, after the curated ones and newest
  first, titled from the dataset card's `pretty_name` (or the repo name) with the
  card's opening sentence and licence underneath. Add them to the YAML to give
  them proper copy.
- **To hide a repo**, list it with `hide: true`. Private repos never appear.
