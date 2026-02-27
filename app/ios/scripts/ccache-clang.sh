#!/bin/sh
# ccache wrapper for clang — used by Xcode via CC build setting.
# If ccache is available, wraps the clang invocation to cache compilation results.
# If ccache is not available, falls through to the default clang.

if command -v ccache >/dev/null 2>&1; then
  exec ccache clang "$@"
else
  exec clang "$@"
fi
