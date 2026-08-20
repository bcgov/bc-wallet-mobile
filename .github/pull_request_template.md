Closes #

<!--
Put the issue number on the line above, e.g. "Closes #1234". This is what links
the PR to the issue: it puts the PR on the issue's timeline and shows the work
on the board. A plain "#1234" somewhere in the body does not do this.

No issue? Say why in the description (a chore, a dependency bump, a release).
-->

## What changed

<!--
A couple of hundred words at most. What a reviewer needs to understand the diff,
not the full history of the problem — that belongs in the issue.
-->

## What should the reviewer focus on

<!--
The section that does the work. Point reviewers at the part you are least sure
about, or tell them there isn't one. All of these are good answers:

  - "Nothing tricky — this is a copy change, a quick skim is fine."
  - "The retry logic in useEvidenceUpload; I'm not certain the cancel path
     clears the timer."
  - "iOS only. Android is untouched, so no need to check it."
-->

## How to test

<!--
Enough for someone who has not touched this area to check it themselves.
"Covered by unit tests" is a complete answer when it's true.
-->
