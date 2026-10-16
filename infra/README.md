# Infra

Terraform for the DigitalOcean droplet that hosts the site and its cloud firewall, plus the Cloudflare side: the tunnel to the droplet, the DNS records, the search rate limit, the `nosniff` response header, bot settings, and the Access app CI deploys through.

The API tokens live in `infra/.env` (gitignored; copy `.env.example`). [direnv](https://direnv.net) loads them when you `cd infra` (`infra/.envrc`); run `direnv allow` there once.

```sh
cd infra
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

State is local (`terraform.tfstate`, gitignored) because one person runs this from one machine. Keep it: without it Terraform loses track of the droplet. `terraform destroy` removes all of it; the `evh_id_rsa` SSH key is only looked up, so it stays.

After the droplet exists, set it up with `deploy/provision.sh` (see the comment at its top).

## Rotating the CI service token

GitHub Actions deploys through Cloudflare Access with a service token that lasts a year. The current one expires **2027-10-13** (`terraform state show cloudflare_zero_trust_access_service_token.ci | grep expires_at`). If it lapses, merges to `main` stop deploying, but the site keeps running. A yearly Google Calendar reminder fires two weeks ahead (Sept 29).

```sh
terraform apply -replace=cloudflare_zero_trust_access_service_token.ci
terraform output -raw ci_access_client_id | gh secret set CF_ACCESS_CLIENT_ID
terraform output -raw ci_access_client_secret | gh secret set CF_ACCESS_CLIENT_SECRET
gh run rerun --failed "$(gh run list --branch main --limit 1 --json databaseId -q '.[0].databaseId')" || true
```

The Cloudflare and DigitalOcean API tokens above are short-lived (30 days); make new ones and put them in `infra/.env` if they've expired. They're only needed to run Terraform: the site and CI deploys don't use them.

## API token permissions

What to grant when making a new token (or replacing a lost one). If a plan or apply fails with a 403 ("request is not authorized"), a permission is missing; the error names the API path, and the resource it's under says which one.

**Cloudflare** (My Profile → API Tokens → Create Custom Token). Zone permissions scoped to `eh-ai-blast.app`, account permissions to its account:

| Permission | For |
|---|---|
| Zone → Zone → Read | `data.cloudflare_zone.site` |
| Zone → DNS → Edit | `cloudflare_dns_record.apex`, `.ssh` |
| Zone → Zone WAF → Edit | `cloudflare_ruleset.rate_limit` (`http_ratelimit` phase) |
| Zone → Transform Rules → Edit | `cloudflare_ruleset.response_headers` (`http_response_headers_transform` phase) |
| Zone → Bot Management → Edit | `cloudflare_bot_management.site` |
| Account → Cloudflare Tunnel → Edit | the tunnel, its config, and the `tunnel_token` output |
| Account → Access: Apps and Policies → Edit | `cloudflare_zero_trust_access_application.ssh`, `_access_policy.ci` |
| Account → Access: Service Tokens → Edit | `cloudflare_zero_trust_access_service_token.ci` |

**DigitalOcean** (API → Tokens → Generate New Token → Custom Scopes). The console adds the scopes these depend on (images, regions, sizes, actions) when you tick them:

| Scope | For |
|---|---|
| `droplet`: create, read, update, delete | `digitalocean_droplet.ai_briefing` |
| `firewall`: create, read, update, delete | `digitalocean_firewall.ai_briefing` |
| `ssh_key`: read | `data.digitalocean_ssh_key.evh` |
| `tag`: create, read | the droplet's `ai-briefing` tag |

Neither token can be read back after it's made, so a lost one is replaced, not recovered: make a new one with these, put it in `infra/.env`, and revoke the old one if it might have leaked.
