variable "resource_group_name" {
  description = "Name of the shared ASSMS resource group."
  type        = string
}
variable "location" {
  description = "Azure region for frontend hosting."
  type        = string
}
variable "app_service_plan_name" {
  description = "Name of the Linux App Service Plan."
  type        = string
}
variable "web_app_name" {
  description = "Globally unique name of the frontend Linux Web App."
  type        = string
}
variable "sku_name" {
  description = "App Service Plan SKU."
  type        = string
}
variable "always_on" {
  description = "Whether Always On is enabled for the frontend Web App."
  type        = bool
  default     = false
}
variable "tags" {
  description = "Tags applied to frontend hosting resources."
  type        = map(string)
  default     = {}
}
