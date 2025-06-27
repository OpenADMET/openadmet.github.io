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
