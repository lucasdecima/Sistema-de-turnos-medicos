# Estado del proyecto: Sistema de Turnos Medicos (Fase 4)
Actualizado: 28/11/2026. No contiene contrasenas.

## Contexto
- Consultorio de UNA doctora (Dra. Paula Barrionuevo). Datos de prueba ficticios.
- Node/Express. SQL Server 2022 en Docker (contenedor sqlturnos). Usuario app_turnos con permisos minimos.
- Tablas Pacientes y Turnos; indice unico (Fecha, Hora) WHERE Estado='confirmado'. Scripts en base-datos/.
- Gateway (puerto 8000, sirve la pagina) + microservicio de turnos (2 copias) sobre base compartida.
- Repo: github.com/lucasdecima/Sistema-de-turnos-medicos. GitHub Flow; main protegida.

## Hecho
- Etapas 1 (analisis), 2 (SQL Server), 3 (ambientes), 4 (GitHub Flow), 5 (Docker y compose), 8 (Kubernetes local).
- Kubernetes local: carpeta kubernetes/ (namespaces.yaml y base/). Imagenes turnos-microservicio:0.1 y turnos-gateway:0.1 (subir el numero al cambiar codigo), imagePullPolicy IfNotPresent.
- El Secret turnos-db se crea con un comando leyendo el .env (no esta en Git).
- Despliegue local: kubectl apply -n qa -f kubernetes/base ; prueba: kubectl port-forward svc/gateway 8000:8000 -n qa
- Siempre verificar: kubectl config current-context = docker-desktop (hay un contexto viejo de AWS, clinica-cluster, que se ignora).

## Decisiones
- Nube: Google Cloud (GCP), no AWS. Un clulster con namespaces qa/uat/prod y dos instancias de base (no-prod para QA+UAT; una para prod).
- Prueba gratis de GCP: 300 USD por 90 dias; el reloj corre desde que se abre la cuenta. NO abrirla hasta tener Terraform y los workflows listos.
- Edicion de SQL Server prevista: Express (licencia 0 USD).
- Desplegar de verdad un solo ambiente; los otros quedan como codigo. Destruir todo con Terraform al terminar.

## Estimacion de costos (precios oficiales leidos el 28/11/2026, region Iowa us-central1, 730 h/mes)
| Pieza | USD/mes |
| --- | --- |
| Cluster GKE Autopilot (tarifa 0,10/h, cubierta por el credito gratis de 74,40) | 0 |
| Pods de un ambiente (2 turnos + 1 gateway) | 6 |
| Cloud SQL Express (1 vCPU, 3,75 GiB, 20 GiB) | 57 |
| Idem con licencia Web / Standard / Enterprise | 90 / 437 / 1429 |
| Escenario A: un ambiente | 63 (189 en 90 dias) |
| Escenario B: tres ambientes y 2 bases | 132 (396 en 90 dias, supera los 300 de credito) |

Licencia SQL Server en Cloud SQL (USD por nucleo-hora): Enterprise 0,47; Standard 0,13; Web 0,01134; Express 0. Minimo 4 nucleos de licencia por instancia.

## NO verificado (pendiente)
- Precios de otras regiones (p. ej. Sao Paulo).
- Tamano minimo de SQL Server en Cloud SQL; si Express admite alta disponibilidad; limites de Express (se cree: 10 GB por base).
- Balanceador/Ingress, Artifact Registry, almacenamiento y CDN del frontend, logs, Secret Manager, salida de datos, minimos de pods de Autopilot.
- Normas argentinas de datos personales para datos reales.

## Pendiente
- Etapa 9 (Terraform), 10 (GitHub Actions), 6 (cuenta GCP, presupuesto, seguridad), 7 (despliegue), 11 (monitoreo y seguridad), completar 12 (costos) y 13 (documento final).
- El informe final anterior (Claude Doc) esta desactualizado: habla de AWS.

## Reglas de trabajo
Un paso a la vez, explicaciones simples en espanol, comandos para Git Bash, nunca pegar contrasenas, avisar antes de cualquier gasto en la nube.
