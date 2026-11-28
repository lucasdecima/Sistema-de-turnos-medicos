variable "region" {
  type = string
}

# Artifact Registry: el "almacén" donde se guardan las imágenes Docker
resource "google_artifact_registry_repository" "imagenes" {
  location      = var.region
  repository_id = "turnos"
  format        = "DOCKER"
  description   = "Imágenes Docker del sistema de turnos"
}

output "url" {
  value = "${var.region}-docker.pkg.dev/${google_artifact_registry_repository.imagenes.project}/${google_artifact_registry_repository.imagenes.repository_id}"
}
