# Native formatters and build tools. Install them all with:
#
#   brew bundle
#
# Homebrew always installs the current version of a formula and offers no way to ask
# for an older one, so this file pins the tool *set*, not their versions.
#
# CI pins swiftformat and ktlint to exact releases (see .github/workflows/quality.yml)
# because their rules can change between versions and fail a build on code nobody
# touched. Your local copies may therefore be newer than CI's. If `yarn lint` disagrees
# with CI, compare versions against the pins in that workflow first.
brew "swiftformat"
brew "ktlint"
brew "clang-format"
brew "ccache"
