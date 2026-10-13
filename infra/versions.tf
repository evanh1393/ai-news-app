terraform {
  required_version = ">= 1.15"

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.106"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.27"
    }
  }
}

# Tokens come from the environment (DIGITALOCEAN_TOKEN, CLOUDFLARE_API_TOKEN). State is local
# (gitignored): see infra/README.md.
provider "digitalocean" {}

provider "cloudflare" {}
