# Security policy

THMP handles sensitive security and threat-intelligence data. We take reports seriously and coordinate fixes responsibly.

## Supported versions

Security fixes are applied to the latest minor release on the current major version line. When the project publishes releases, this section will list supported version ranges explicitly.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead:

1. Use [GitHub private vulnerability reporting](https://docs.github.com/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) for this repository if it is enabled; **or**
2. Email the maintainers at the address listed in the repository README or organisation security contact (to be published when maintainers are assigned).

Include:

- Description of the issue and potential impact
- Steps to reproduce (proof-of-concept if available)
- Affected components (service, version, commit SHA if known)
- Your contact details for follow-up

We aim to acknowledge reports within **5 business days** and will work with you on a disclosure timeline.

## Disclosure

We prefer coordinated disclosure. Please allow time for a fix to be developed, tested, and released before public discussion, unless the issue is already actively exploited or otherwise requires immediate public notice.

## Scope

In scope: the THMP application code, official container images published by this project, and first-party connectors in this repository. Out of scope: third-party services you configure (IdPs, cloud providers, SIEMs) except where THMP clearly mishandles their integration (e.g. credential leakage from THMP).

## Security-related configuration

Operators should follow the deployment guides (when published) for TLS, secrets management, network policies, and audit log retention. Reports about insecure **default** configuration in official deployment manifests are in scope.

### Internal APIs and ingestion

Service-to-service calls use **`THMP_INTERNAL_API_SECRET`** (`X-Internal-Token`). Treat it like a bearer secret: restrict network paths, rotate regularly, and **do not** expose internal or ingestion URLs to untrusted clients. Public webhooks should validate **vendor-specific** signatures (or mTLS) at the edge before invoking ingestion; see [docs/adr/0006-ingestion-auth-and-dedupe.md](docs/adr/0006-ingestion-auth-and-dedupe.md).
