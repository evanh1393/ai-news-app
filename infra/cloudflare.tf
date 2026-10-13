# Public traffic: eh-ai-blast.app -> Cloudflare -> tunnel -> cloudflared on the droplet -> Caddy :8080.
# cloudflared connects out, so the droplet takes no inbound HTTP(S).

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
# navigates client-side, so its requests arrive as /search/__data.json.
resource "cloudflare_ruleset" "rate_limit" {
  zone_id = data.cloudflare_zone.site.zone_id
  name    = "Rate limit search"
  kind    = "zone"
  phase   = "http_ratelimit"

  rules = [
    {
      description = "Search: 20 requests per 10 s per IP"
      expression  = "(http.request.uri.path in {\"/search\" \"/search/__data.json\"})"
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
