variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "staging"
}
variable "location" {
  description = "Azure region for frontend hosting."
  type        = string
  default     = "southeastasia"
}
variable "use_platform_remote_state" {
  description = "Whether to consume the shared resource group from platform remote state."
  type        = bool
  default     = true
}
variable "platform_state_resource_group_name" {
  description = "Resource group containing the Terraform state Storage Account."
  type        = string
  default     = "rg-assms-tfstate"
}
variable "platform_state_storage_account_name" {
  description = "Globally unique Storage Account containing platform state."
  type        = string
}
variable "platform_state_container_name" {
  description = "Blob container containing Terraform states."
  type        = string
  default     = "tfstate"
}
variable "platform_state_key" {
  description = "Remote-state key for the shared platform environment."
  type        = string
  default     = "platform/staging.tfstate"
}
variable "resource_group_name" {
  description = "Optional direct shared resource-group override."
  type        = string
  default     = null
  nullable    = true
}
variable "app_service_plan_name" {
  description = "Name of the frontend Linux App Service Plan."
  type        = string
  default     = "asp-assms-frontend-staging"
}
variable "web_app_name" {
  description = "Globally unique name of the frontend Linux Web App."
  type        = string
}
variable "sku_name" {
  description = "Staging App Service Plan SKU; F1 is selected for the university development environment."
  type        = string
  default     = "F1"
}
variable "always_on" {
  description = "Whether Always On is enabled."
  type        = bool
  default     = false
}
variable "node_version" {
  description = "Node.js runtime for serving the compiled Vite SPA in staging."
  type        = string
  default     = "22-lts"
}
variable "app_command_line" {
  description = "PM2 static-server command with SPA fallback for React Router routes."
  type        = string
  default     = "pm2 serve /home/site/wwwroot --no-daemon --spa"
}
variable "tags" {
  description = "Tags applied to frontend hosting resources."
  type        = map(string)
  default = {
    Project     = "ASSMS"
    Environment = "staging"
    Service     = "Frontend"
    ManagedBy   = "Terraform"
  }
}
