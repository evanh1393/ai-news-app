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

# Home network, the only place SSH is allowed from. Update and apply if the home IP changes
# (`curl -s4 https://cloudflare.com/cdn-cgi/trace`). IPv6 is the /64, since the address within it rotates.
locals {
  admin_addresses = ["173.54.22.106/32", "2600:4040:a89e:be00::/64"]
}

# Public traffic arrives through the Cloudflare Tunnel, an outbound connection, so the only inbound
# rule is SSH from home for provisioning and `npm run deploy`.
resource "digitalocean_firewall" "ai_briefing" {
  name        = "ai-briefing-fw"
  droplet_ids = [digitalocean_droplet.ai_briefing.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = local.admin_addresses
  }

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
