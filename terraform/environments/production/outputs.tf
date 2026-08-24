output "app_service_plan_id" {
  description = "Resource ID of the frontend App Service Plan."
  value       = module.app_service.app_service_plan_id
}
output "web_app_id" {
  description = "Resource ID of the frontend Linux Web App."
  value       = module.app_service.web_app_id
}
output "web_app_name" {
  description = "Name of the frontend Linux Web App."
  value       = module.app_service.web_app_name
}
output "default_hostname" {
  description = "Default hostname of the frontend Linux Web App."
  value       = module.app_service.default_hostname
}
