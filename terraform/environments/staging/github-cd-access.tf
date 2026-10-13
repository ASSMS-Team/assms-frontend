locals {
  github_cd_principal_id = try(data.terraform_remote_state.platform[0].outputs.github_cd_principal_id, null)
}

resource "azurerm_role_assignment" "github_web_app" {
  count = local.github_cd_principal_id == null ? 0 : 1

  scope                            = module.app_service.web_app_id
  role_definition_name             = "Website Contributor"
  principal_id                     = local.github_cd_principal_id
  skip_service_principal_aad_check = true
}
