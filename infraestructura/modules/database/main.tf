variable "nombre" {
  type = string
}

variable "region" {
  type = string
}

variable "network_id" {
  type = string
}

variable "tier" {
  type = string
}

variable "proteger_borrado" {
  type = bool
}

variable "bases" {
  description = "Mapa entorno => nombre de la base. Cada entorno tiene su propio usuario y contraseña"
  type        = map(string)
}

# Sufijo al azar: Google no deja reutilizar enseguida el nombre de una instancia borrada
resource "random_id" "sufijo" {
  byte_length = 2
}

resource "random_password" "admin" {
  length           = 24
  special          = true
  override_special = "_-"
  min_upper        = 2
  min_lower        = 2
  min_numeric      = 2
  min_special      = 1
}

resource "random_password" "usuarios" {
  for_each         = var.bases
  length           = 24
  special          = true
  override_special = "_-"
  min_upper        = 2
  min_lower        = 2
  min_numeric      = 2
  min_special      = 1
}

# SQL Server edición Express (licencia sin costo). Solo con IP privada.
resource "google_sql_database_instance" "sqlserver" {
  name                = "${var.nombre}-${random_id.sufijo.hex}"
  region              = var.region
  database_version    = "SQLSERVER_2022_EXPRESS"
  root_password       = random_password.admin.result
  deletion_protection = var.proteger_borrado

  settings {
    tier              = var.tier
    availability_type = "ZONAL"
    disk_type         = "PD_SSD"
    disk_size         = 20

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.network_id
    }

    backup_configuration {
      enabled = true
    }
  }
}

resource "google_sql_database" "bases" {
  for_each = var.bases
  name     = each.value
  instance = google_sql_database_instance.sqlserver.name
}

resource "google_sql_user" "usuarios" {
  for_each = var.bases
  name     = "app_turnos_${each.key}"
  instance = google_sql_database_instance.sqlserver.name
  password = random_password.usuarios[each.key].result
}

output "ip_privada" {
  value = google_sql_database_instance.sqlserver.private_ip_address
}

output "contrasenas_usuarios" {
  value     = { for entorno, clave in random_password.usuarios : entorno => clave.result }
  sensitive = true
}
