# APIs de Google Cloud que hay que activar para usar cada servicio
locals {
  apis = toset([
    "compute.googleapis.com",
    "container.googleapis.com",
    "sqladmin.googleapis.com",
    "servicenetworking.googleapis.com",
    "artifactregistry.googleapis.com",
  ])
}

resource "google_project_service" "apis" {
  for_each           = local.apis
  service            = each.value
  disable_on_destroy = false
}

module "networking" {
  source     = "./modules/networking"
  region     = var.region
  depends_on = [google_project_service.apis]
}

module "kubernetes" {
  source           = "./modules/kubernetes"
  region           = var.region
  network          = module.networking.network_id
  subnetwork       = module.networking.subnetwork_id
  proteger_borrado = var.proteger_borrado
  depends_on       = [google_project_service.apis]
}

module "registry" {
  source     = "./modules/registry"
  region     = var.region
  depends_on = [google_project_service.apis]
}

# Una instancia para QA y UAT (dos bases, cada una con su usuario y contraseña)
module "db_noprod" {
  source           = "./modules/database"
  nombre           = "turnos-noprod"
  region           = var.region
  network_id       = module.networking.network_id
  tier             = var.tier_sql
  proteger_borrado = var.proteger_borrado
  bases = {
    qa  = "SistemaTurnosDB_QA"
    uat = "SistemaTurnosDB_UAT"
  }
  depends_on = [module.networking]
}

# Instancia propia para producción (apagada por defecto)
module "db_prod" {
  count            = var.crear_db_prod ? 1 : 0
  source           = "./modules/database"
  nombre           = "turnos-prod"
  region           = var.region
  network_id       = module.networking.network_id
  tier             = var.tier_sql
  proteger_borrado = var.proteger_borrado
  bases = {
    prod = "SistemaTurnosDB"
  }
  depends_on = [module.networking]
}
