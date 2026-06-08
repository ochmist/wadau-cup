# Wadau Cup Hosting and Domain Setup

Target public domain: `wadau.cup`

Current local assumption:

- Firebase project ID: `wadau-cup`
- Firebase App Hosting backend ID: `wadau-cup`
- Firebase App Hosting URL: `https://wadau-cup--wadau-cup.us-central1.hosted.app`
- Firebase Auth domain: `wadau-cup.firebaseapp.com`
- DNS provider after migration: Cloudflare
- Registrar: GoDaddy

## Completed Firebase Setup

The Firebase project `wadau-cup` has been created and upgraded to Blaze by linking billing account `Firebase Payment`.

Configured resources:

- Firebase Web app: `Wadau Cup Web`
- Firebase Web app ID: `1:953613944093:web:dc83f89e59f9354c0bcdf4`
- Firestore default database: `(default)` in `nam5`
- Firestore rules and indexes deployed from this repo
- Firebase Authentication initialized
- Email/Password sign-in enabled
- Firebase Auth authorized domains:
  - `wadau-cup.firebaseapp.com`
  - `wadau-cup.web.app`
  - `wadau-cup--wadau-cup.us-central1.hosted.app`
  - `wadau.cup`
  - `www.wadau.cup`
- Firebase App Hosting backend: `wadau-cup` in `us-central1`
- Runtime secrets configured and granted to App Hosting:
  - `FOOTBALL_DATA_API_KEY`
  - `API_FOOTBALL_API_KEY`
  - `SYNC_CRON_SECRET`

The current deployed app responds at:

```text
https://wadau-cup--wadau-cup.us-central1.hosted.app
```

## Remaining Blocker

The application is deployed on Firebase. The remaining work is domain ownership and DNS:

- Add `wadau.cup` to Firebase App Hosting as a custom domain.
- Add the Firebase-provided verification and traffic records in Cloudflare.
- Change the GoDaddy nameservers for `wadau.cup` to Cloudflare.

## Firebase App Hosting

This repo uses Firebase App Hosting for the Next.js app, not classic static Firebase Hosting.

`firebase.json` is configured for local source deploys to the `wadau-cup` backend.

Custom domain setup:

1. In Firebase Console, open App Hosting -> backend `wadau-cup` -> Settings -> Add custom domain.
2. Add `wadau.cup`.
3. Add `www.wadau.cup` and redirect it to `wadau.cup`, unless the desired canonical host is `www.wadau.cup`.
4. Copy the DNS records Firebase provides into Cloudflare.

## Cloudflare DNS

After Firebase shows the domain setup records, create them in Cloudflare exactly as shown.

Cloudflare host field conventions:

- Apex/root domain: `@`
- `www.wadau.cup`: `www`
- Certificate challenge names: copy the Firebase-provided name, usually `_acme-challenge...`

Recommended during Firebase verification:

- Keep Firebase-provided TXT and CNAME verification records as DNS only.
- Start Firebase-provided web traffic records as DNS only until Firebase shows the domain as connected and the SSL certificate is provisioned.
- Remove conflicting A, AAAA, or CNAME records for the same hostname when Firebase asks for exclusive records.
- Do not remove `_acme-challenge` records after setup; Firebase uses them for certificate renewal.

## GoDaddy Registrar

Once the Cloudflare zone has the Firebase records ready:

1. In Cloudflare, copy the two assigned Cloudflare nameservers for `wadau.cup`.
2. In GoDaddy, open the domain settings for `wadau.cup`.
3. Choose custom nameservers.
4. Paste the two Cloudflare nameservers.
5. Save and complete any GoDaddy identity verification.

Nameserver propagation is often quick, but can take up to 48 hours.

## Firebase Auth

The production hosts have already been added to Firebase Auth authorized domains.

## Verification

After DNS propagates:

```sh
dig NS wadau.cup
dig A wadau.cup
dig CNAME www.wadau.cup
curl -I https://wadau.cup
```

Expected final state:

- `dig NS wadau.cup` returns Cloudflare nameservers.
- Firebase App Hosting domain status is `Connected`.
- `https://wadau.cup` returns a valid certificate and the Wadau Cup app.
- `https://www.wadau.cup` redirects to the canonical host.
