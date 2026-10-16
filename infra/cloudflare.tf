# Public traffic: eh-ai-blast.app -> Cloudflare -> tunnel -> cloudflared on the droplet -> Caddy :8080.
# CI deploys: ssh.eh-ai-blast.app -> Access (service token) -> tunnel -> sshd on 127.0.0.1:22.
# cloudflared connects out, so the droplet takes no inbound connections (people SSH over Tailscale).

locals {
  cf_account_id = "beac23fc2ec67f70ff216c9245876934"
  domain        = "eh-ai-blast.app"
}

data "cloudflare_zone" "site" {
  filter = {
    name = local.domain
  }
}

resource "cloudflare_zero_trust_tunnel_cloudflared" "ai_briefing" {
  account_id = local.cf_account_id
  name       = "ai-briefing"
  # Routing lives in Cloudflare (the config below), not in a file on the droplet.
  config_src = "cloudflare"
}

resource "cloudflare_zero_trust_tunnel_cloudflared_config" "ai_briefing" {
  account_id = local.cf_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.ai_briefing.id

  config = {
    ingress = [
      {
        hostname = local.domain
        # 127.0.0.1, not localhost: Caddy binds IPv4 only, and localhost can resolve to ::1.
        service = "http://127.0.0.1:8080"
      },
      {
        # CI deploys over SSH through the tunnel, behind the Access app below. Port 22 stays closed
        # to the internet.
        hostname = "ssh.${local.domain}"
        service  = "ssh://127.0.0.1:22"
      },
      {
        service = "http_status:404"
      },
    ]
  }
}

# The token `cloudflared service install` needs on the droplet: `terraform output -raw tunnel_token`.
data "cloudflare_zero_trust_tunnel_cloudflared_token" "ai_briefing" {
  account_id = local.cf_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.ai_briefing.id
}

resource "cloudflare_dns_record" "apex" {
  zone_id = data.cloudflare_zone.site.zone_id
  name    = local.domain
  type    = "CNAME"
  content = "${cloudflare_zero_trust_tunnel_cloudflared.ai_briefing.id}.cfargotunnel.com"
  proxied = true
  ttl     = 1 # automatic; required for proxied records
}

# The Free plan allows one rate-limiting rule: path-only match, per IP (and data center), 10 s
# windows, 10 s block. Search is the only route whose cost depends on input. The search form
# navigates client-side, so its requests arrive as /search/__data.json. /api/v1/search runs the
# same query and shares the budget.
resource "cloudflare_ruleset" "rate_limit" {
  zone_id = data.cloudflare_zone.site.zone_id
  name    = "Rate limit search"
  kind    = "zone"
  phase   = "http_ratelimit"

  rules = [
    {
      description = "Search: 20 requests per 10 s per IP"
      expression  = "(http.request.uri.path in {\"/search\" \"/search/__data.json\" \"/api/v1/search\"})"
      action      = "block"
      ratelimit = {
        characteristics     = ["cf.colo.id", "ip.src"]
        period              = 10
        requests_per_period = 20
        mitigation_timeout  = 10
      }
    },
  ]
}

resource "cloudflare_dns_record" "ssh" {
  zone_id = data.cloudflare_zone.site.zone_id
  name    = "ssh.${local.domain}"
  type    = "CNAME"
  content = "${cloudflare_zero_trust_tunnel_cloudflared.ai_briefing.id}.cfargotunnel.com"
  proxied = true
  ttl     = 1
}

# GitHub Actions' credential for ssh.eh-ai-blast.app. Its client ID and secret are the repo secrets
# CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET (`terraform output -raw ci_access_client_secret`).
# Valid for a year; `terraform apply -replace=cloudflare_zero_trust_access_service_token.ci` rotates it.
resource "cloudflare_zero_trust_access_service_token" "ci" {
  account_id = local.cf_account_id
  name       = "ai-briefing CI deploy"
  duration   = "8760h"
}

resource "cloudflare_zero_trust_access_policy" "ci" {
  account_id = local.cf_account_id
  name       = "ai-briefing CI deploy"
  # non_identity: a service token, not a person logging in.
  decision = "non_identity"
  include = [
    { service_token = { token_id = cloudflare_zero_trust_access_service_token.ci.id } },
  ]
}

# Nothing reaches the SSH hostname without that service token. The SSH key is a second check behind it.
resource "cloudflare_zero_trust_access_application" "ssh" {
  account_id           = local.cf_account_id
  name                 = "ai-briefing SSH"
  domain               = "ssh.${local.domain}"
  type                 = "self_hosted"
  session_duration     = "1h"
  app_launcher_visible = false
  policies = [
    { id = cloudflare_zero_trust_access_policy.ci.id, precedence = 1 },
  ]
}

# Crawlers, AI agents, and AI training are all welcome (static/robots.txt says so). These keep
# Cloudflare from blocking AI bots or serving its own opt-out robots.txt in front of ours.
resource "cloudflare_bot_management" "site" {
  zone_id                     = data.cloudflare_zone.site.zone_id
  ai_bots_protection          = "disabled"
  crawler_protection          = "disabled"
  is_robots_txt_managed       = false
  bot_preference_sync_enabled = false
  cf_robots_variant           = "off"
}
