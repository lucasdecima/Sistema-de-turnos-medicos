terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.5"
    }
  }

  # El "estado" (state) es el archivo donde Terraform anota lo que creó.
  # CONTIENE DATOS SENSIBLES (por ejemplo, las contraseñas generadas).
  # Por ahora es local y Git lo ignora. Más adelante puede moverse a un bucket de
  # Google Cloud Storage con versionado y acceso restringido.
}

provider "google" {
  project = var.project_id
  region  = var.region
}
