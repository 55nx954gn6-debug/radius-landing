# Radius Landing Page

Static GitHub Pages site for the canonical bare domain `https://radius-app.org`.

## Canonical domain

- `radius-app.org` is the canonical host used by Radius links, iOS associated domains, password-reset email configuration, and the AASA document.
- `www.radius-app.org` may redirect to the bare domain for ordinary website traffic, but it is not used for Universal Links.
- `CNAME` must remain `radius-app.org`.

## Password-reset Universal Links

The site publishes:

- `/.well-known/apple-app-site-association`
- `/onboarding/reset-password`

`.nojekyll` is required so GitHub Pages publishes the hidden `.well-known` directory.

Validate local artifacts before merging:

```bash
node scripts/check-aasa.mjs
```

After deployment, run the strict live check:

```bash
node scripts/check-aasa.mjs --live
```

The live gate requires both endpoints to return HTTP 200 without redirects and requires the AASA response to use `Content-Type: application/json`. Do not activate `RADIUS_RESET_PASSWORD_URL` or ship the associated-domain build until the live gate passes. If GitHub Pages cannot provide the required response headers, serve the AASA endpoint from hosting that can; do not weaken the gate.
