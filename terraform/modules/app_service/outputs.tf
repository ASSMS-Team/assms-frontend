output "app_service_plan_id" {
  description = "Resource ID of the App Service Plan."
  value       = azurerm_service_plan.this.id
}
output "web_app_id" {
  description = "Resource ID of the frontend Web App."
  value       = azurerm_linux_web_app.this.id
}
output "web_app_name" {
  description = "Name of the frontend Web App."
  value       = azurerm_linux_web_app.this.name
}
output "default_hostname" {
  description = "Default hostname of the frontend Web App."
  value       = azurerm_linux_web_app.this.default_hostname
}
