# Formatting and linting tools used by `yarn lint` and CI (.github/workflows/quality.yml).
#
# Homebrew installs the current version of a formula and offers no way to request an
# older one, so this file pins the tool *set*, not their versions. The two formatters
# whose rules can fail a build — swiftformat and ktlint — are therefore installed from
# pinned upstream releases in CI instead, and are deliberately absent here.
#
# For local development `brew bundle` gets you close enough; run `yarn lint` to confirm.
brew "clang-format"
brew "ccache"
