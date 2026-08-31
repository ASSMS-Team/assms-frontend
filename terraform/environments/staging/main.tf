data "terraform_remote_state" "platform" {
  count   = var.use_platform_remote_state ? 1 : 0
  backend = "azurerm"

  config = {
    resource_group_name  = var.platform_state_resource_group_name
    storage_account_name = var.platform_state_storage_account_name
    container_name       = var.platform_state_container_name
    key                  = var.platform_state_key
  }
}

locals {
  resource_group_name = coalesce(
    var.resource_group_name,
    try(data.terraform_remote_state.platform[0].outputs.resource_group_name, null)
  )
}

module "app_service" {
  source = "../../modules/app_service"

  resource_group_name   = local.resource_group_name
  location              = var.location
  app_service_plan_name = var.app_service_plan_name
  web_app_name          = var.web_app_name
  sku_name              = var.sku_name
  always_on             = var.always_on
  node_version          = var.node_version
  app_command_line      = var.app_command_line
  tags                  = var.tags
}
