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
