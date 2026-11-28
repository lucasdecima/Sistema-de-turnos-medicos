variable "project_id" {
  description = "ID del proyecto de Google Cloud (se obtiene al abrir la cuenta)"
  type        = string
}

variable "region" {
  description = "Región de Google Cloud. Los precios que verificamos son los de us-central1"
  type        = string
  default     = "us-central1"
}

variable "crear_db_prod" {
  description = "Si es true, crea también la base de producción (cuesta dinero)"
  type        = bool
  default     = false
}

variable "tier_sql" {
  description = "Tamaño de la instancia de SQL Server. ASUMIDO, no verificado: si Google lo rechaza, cambiarlo"
  type        = string
  default     = "db-custom-1-3840"
}

variable "proteger_borrado" {
  description = "Si es true, Terraform no puede borrar el clúster ni las bases. Dejalo en false mientras sea un proyecto de práctica"
  type        = bool
  default     = false
}
