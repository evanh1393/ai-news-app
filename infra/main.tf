# The droplet that replaces CT 101. deploy/provision.sh sets it up over SSH after it exists;
# Terraform only owns the DigitalOcean resources around it.

# Added in the console, so it is looked up, not managed: `terraform destroy` leaves it alone.
data "digitalocean_ssh_key" "evh" {
  name = "evh_id_rsa"
}

resource "digitalocean_droplet" "ai_briefing" {
  name       = "ai-briefing"
  image      = "debian-13-x64"
  size       = "s-1vcpu-1gb"
  region     = "tor1"
  ipv6       = true
  monitoring = true
  backups    = false
  ssh_keys   = [data.digitalocean_ssh_key.evh.id]
  tags       = ["ai-briefing"]

  lifecycle {
    # Both only matter at creation. Changing either would otherwise replace the droplet.
    ignore_changes = [image, ssh_keys]
  }
}

# No inbound rules. Public traffic arrives through the Cloudflare Tunnel and SSH through Tailscale,
# both outbound connections from the droplet.
resource "digitalocean_firewall" "ai_briefing" {
  name        = "ai-briefing-fw"
  droplet_ids = [digitalocean_droplet.ai_briefing.id]

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}
