variable "region" {
  type = string
}

variable "network" {
  type = string
}

variable "subnetwork" {
  type = string
}

variable "proteger_borrado" {
  type = bool
}

# Clúster GKE en modo Autopilot: Google administra los servidores y se cobra por lo que piden los pods
resource "google_container_cluster" "turnos" {
  name             = "turnos-cluster"
  location         = var.region
  enable_autopilot = true

  network    = var.network
  subnetwork = var.subnetwork

  # Vacío = GKE crea solo los rangos de direcciones para pods y servicios
  ip_allocation_policy {}

  release_channel {
    channel = "REGULAR"
  }

  deletion_protection = var.proteger_borrado
}

output "nombre" {
  value = google_container_cluster.turnos.name
}
