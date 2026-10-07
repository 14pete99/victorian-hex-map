# Security policy

## Supported versions

Only the latest release is supported. Fixes are made to the current version, not to older ones.

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Report it privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**, or go straight to the [private report form](https://github.com/14pete99/victorian-hex-map/security/advisories/new).

In the report, say:

- what the problem is and where it is, with file names if you have them;
- how to reproduce it;
- what someone could do by exploiting it.

You will get a reply as soon as the maintainer can give one. Once a fix is released, the advisory is published and you are credited, unless you ask not to be.

## What is in scope

Everything in this repository: the map component, the demo page, the build configuration and the CI workflow.

The map runs entirely in the browser. It has no server, makes no network calls and stores nothing. The problems most worth reporting are therefore:

- a way to make the map run script or insert markup through the data passed to it;
- a vulnerable or compromised dependency that affects people who build or use the map;
- a weakness in the CI workflow.

A wrong election result is not a security problem. Use the [data correction form](https://github.com/14pete99/victorian-hex-map/issues/new?template=data_correction.yml) for that.

## What the project checks

The test suite includes security checks on the source, the dependency lockfile and the CI workflow, and `npm run check:security` checks dependencies for known vulnerabilities and registry signatures. [Developing](docs/development.md#security-checks) lists them.
