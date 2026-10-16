#!/usr/bin/env bash
# One-time setup of a fresh Debian 13 droplet (infra/) to match CT 101, before the first `npm run deploy`.
# Run as root from a laptop, while the DigitalOcean firewall still has a temporary SSH rule (see README):
#   ssh root@<droplet-ip> bash -s < deploy/provision.sh
# Public traffic comes in through a Cloudflare Tunnel (cloudflared -> the app on :3000), and SSH through
# Tailscale, so the droplet takes no inbound connections from the internet.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get -y upgrade
apt-get -y install ca-certificates curl gnupg rsync sudo nftables ufw unattended-upgrades ncurses-term

# Node 22 from NodeSource, same as CT 101.
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
  | gpg --dearmor --yes -o /usr/share/keyrings/nodesource.gpg
echo "deb [signed-by=/usr/share/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
  > /etc/apt/sources.list.d/nodesource.list

# cloudflared, for the tunnel. The token is installed separately (see README).
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg -o /usr/share/keyrings/cloudflare-main.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" \
  > /etc/apt/sources.list.d/cloudflared.list

# Tailscale, for SSH. `tailscale up` is run separately (see README).
curl -fsSL https://pkgs.tailscale.com/stable/debian/trixie.noarmor.gpg \
  -o /usr/share/keyrings/tailscale-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/tailscale-archive-keyring.gpg] https://pkgs.tailscale.com/stable/debian trixie main" \
  > /etc/apt/sources.list.d/tailscale.list

apt-get update
apt-get -y install nodejs cloudflared tailscale

# Ghostty sends TERM=xterm-ghostty over SSH. ncurses-term ships the entry only as "ghostty", so
# alias it, or clear and full-screen programs fail with "unknown terminal type".
install -d /etc/terminfo/x
ln -sf /usr/share/terminfo/g/ghostty /etc/terminfo/x/xterm-ghostty

# Users. evanh deploys (passwordless sudo, as deploy.sh uses `sudo -n`); briefing runs the app;
# briefing-pull writes the DB.
id evanh >/dev/null 2>&1 || useradd -m -s /bin/bash -G sudo,adm,systemd-journal evanh
install -d -m 700 -o evanh -g evanh /home/evanh/.ssh
install -m 600 -o evanh -g evanh /root/.ssh/authorized_keys /home/evanh/.ssh/authorized_keys
echo 'evanh ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/evanh
chmod 440 /etc/sudoers.d/evanh
getent group briefing-dev >/dev/null || groupadd --system briefing-dev
usermod -aG briefing-dev evanh
id briefing >/dev/null 2>&1 || useradd --system --user-group --no-create-home -s /usr/sbin/nologin briefing
id briefing-pull >/dev/null 2>&1 || useradd --system --user-group --no-create-home -s /usr/sbin/nologin briefing-pull

# Same layout and modes as CT 101. The data dir is setgid briefing, so new DBs are readable by the app.
install -d -m 755 /opt/ai-briefing
install -d -m 2775 -o briefing -g briefing-dev /opt/ai-briefing/app
install -d -m 2750 -o briefing-pull -g briefing /opt/ai-briefing/data
install -d -m 750 -o root -g briefing-pull /etc/ai-briefing

# Inbound: SSH over Tailscale only. CI's SSH arrives through the tunnel on loopback, which ufw allows.
ufw default deny incoming
ufw default allow outgoing
ufw allow in on tailscale0 to any port 22 proto tcp
ufw --force enable

# Keys only, no root login once evanh exists. sshd uses the first value it reads, so this sorts
# before cloud-init's 50-cloud-init.conf.
cat > /etc/ssh/sshd_config.d/10-hardening.conf <<'SSHD'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
SSHD
sshd -t
systemctl reload ssh

systemctl enable --now unattended-upgrades
echo "provisioned. Next: tailscale up, install the tunnel token, copy drive-key.json, npm run deploy."
