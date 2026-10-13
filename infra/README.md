# Infra

Terraform for the DigitalOcean droplet that hosts the site and its cloud firewall, plus the Cloudflare side: the tunnel to the droplet, the DNS record for eh-ai-blast.app, and the search rate limit.

```sh
cd infra
export DIGITALOCEAN_TOKEN=$(awk '/^access-token:/ {print $2}' ~/.config/doctl/config.yaml)
export CLOUDFLARE_API_TOKEN=$(cat ~/.config/cf-ai-briefing-token)
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

The Cloudflare and DigitalOcean API tokens above are short-lived (30 days); make new ones first if they've expired. They're only needed to run Terraform: the site and CI deploys don't use them.
