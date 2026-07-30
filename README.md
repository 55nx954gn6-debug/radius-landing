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

The live gate requires both origin AASA endpoints to return HTTP 200 without redirects, validates their JSON bodies, and then verifies Apple's CDN representation is valid JSON with `apple-origin-format: json`. GitHub Pages may serve the origin artifact as `application/octet-stream`; Apple's CDN parse result is the authoritative association check. Do not activate `RADIUS_RESET_PASSWORD_URL` or ship the associated-domain build until the live gate passes.
