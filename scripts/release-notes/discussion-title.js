// The title a release notes discussion gets. The tag range is part of it
// because one tag gets more than one report: publish.yml asks for a build
// compared both with the build before it and with the last build of the
// previous version, and two reports about the same build have to be told
// apart — by a reader and by the duplicate check.
module.exports = ({ olderTag, newerTag }) => `${newerTag} release notes (since ${olderTag})`
