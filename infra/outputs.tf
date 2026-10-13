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
