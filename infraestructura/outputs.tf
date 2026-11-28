output "cluster" {
  description = "Nombre del clúster de Kubernetes"
  value       = module.kubernetes.nombre
}

output "registro_imagenes" {
  description = "Dirección donde se suben las imágenes Docker"
  value       = module.registry.url
}

output "db_noprod_ip_privada" {
  description = "IP privada de la base no productiva (solo accesible dentro de la red)"
  value       = module.db_noprod.ip_privada
}

output "db_noprod_contrasenas" {
  description = "Contraseñas de los usuarios de QA y UAT. Ver con: terraform output -json db_noprod_contrasenas"
  value       = module.db_noprod.contrasenas_usuarios
  sensitive   = true
}
