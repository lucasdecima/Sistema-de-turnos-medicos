variable "region" {
  type = string
}

# Red privada propia
resource "google_compute_network" "red" {
  name                    = "turnos-red"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subred" {
  name          = "turnos-subred"
  region        = var.region
  network       = google_compute_network.red.id
  ip_cidr_range = "10.10.0.0/20"
}

# Rango de direcciones privadas reservado para los servicios de Google (Cloud SQL).
# Así la base de datos tiene IP privada y NO queda expuesta a Internet.
resource "google_compute_global_address" "rango_servicios" {
  name          = "turnos-rango-servicios"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.red.id
}

resource "google_service_networking_connection" "servicios" {
  network                 = google_compute_network.red.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.rango_servicios.name]
}

output "network_id" {
  value = google_compute_network.red.id
}

output "subnetwork_id" {
  value = google_compute_subnetwork.subred.id
}
