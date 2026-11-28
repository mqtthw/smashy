#!/bin/bash
# Vercel's "ignored build step" (vercel.json ignoreCommand). Exit 0 = skip this build, exit 1 = build.
# Each build costs Build CPU money (~$0.025; 70 builds on Nov 27), and Matthew's Vercel budget is $20.
#
# Round 1014: only the production site is built. The production branch is "release", moved up to main four
#   times a day (.github/workflows/release.yml); a push to main is a preview build and is skipped. (Before the
#   production branch is switched to "release" in Vercel, main is still production and still builds.)
# Round 1013: a production push that only changes notes (*.md, docs/, assets/) since the last deployed commit
#   isn't built either: the site would be the same. Anything unclear builds, to be safe.
if [ "$VERCEL_ENV" = "preview" ]; then
  echo "Preview build (branch ${VERCEL_GIT_COMMIT_REF}): skipped. The site goes live from the release branch."
  exit 0
fi
prev="$VERCEL_GIT_PREVIOUS_SHA"
if [ -z "$prev" ] || ! git cat-file -e "${prev}^{commit}" 2>/dev/null; then
  echo "No previous deployed commit to compare with: building."
  exit 1
fi
if git diff --quiet "$prev" HEAD -- . ':(exclude)*.md' ':(exclude)docs/' ':(exclude)assets/'; then
  echo "Only notes changed since ${prev}: skipping the build."
  exit 0
fi
echo "Code changed since ${prev}: building."
exit 1
