terraform {
  required_version = ">= 1.0.0"

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  token = var.DIGITALOCEAN_API_TOKEN
}

data "digitalocean_ssh_key" "do_ssh_key" {
  name = "do-ssh-key"
}

resource "digitalocean_ssh_key" "default" {
  name       = "terraform-reader-key"
  public_key = file("${path.module}/ssh/reader_key.pub")
}

resource "digitalocean_droplet" "reader_instance" {
  image  = "ubuntu-22-04-x64"
  name   = "reader-instance"
  region = "sgp1"
  size   = "s-2vcpu-4gb"
  ssh_keys = [
    data.digitalocean_ssh_key.do_ssh_key.id,
    digitalocean_ssh_key.default.id
  ]

  user_data = templatefile("${path.module}/user_data.tp1", {
    env_content = local.formatted_env_content
  })

  provisioner "remote-exec" {
    inline = [
      "echo 'BASE_URL=http://${self.ipv4_address}:4444' >> /root/.env"
    ]

    connection {
      type        = "ssh"
      user        = "root"
      host        = self.ipv4_address
      private_key = file("${path.module}/ssh/reader_key")
      timeout     = "2m"
    }
  }
}

locals {
  env_content = file("../.env")
  formatted_env_content = join("\n", [
    for line in split("\n", local.env_content) :
    line
    if !(
      (
        substr(line, 0, 1) == "#"
      ) ||
      (
        line == ""
      )
    )
  ])
}
