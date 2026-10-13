output "ipv4" {
  value = digitalocean_droplet.ai_briefing.ipv4_address
}

output "ipv6" {
  value = digitalocean_droplet.ai_briefing.ipv6_address
}

output "tunnel_token" {
  value     = data.cloudflare_zero_trust_tunnel_cloudflared_token.ai_briefing.token
  sensitive = true
}

output "ci_access_client_id" {
  value = cloudflare_zero_trust_access_service_token.ci.client_id
}

output "ci_access_client_secret" {
  value     = cloudflare_zero_trust_access_service_token.ci.client_secret
  sensitive = true
}
