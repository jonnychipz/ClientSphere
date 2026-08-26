targetScope = 'resourceGroup'

@description('Primary application location.')
param location string = 'uksouth'

@description('Azure AI Foundry and Speech location.')
param aiLocation string = 'swedencentral'

@description('Stable suffix used for globally unique resource names.')
param suffix string = '95bc'

@description('Object ID of the GitHub Actions service principal.')
param deploymentPrincipalObjectId string

@secure()
@description('Signing key used for application sessions.')
param sessionSecret string

@description('Latest flagship model for the general adviser and Sol use cases.')
param modelName string = 'gpt-5.6-sol'

@description('Current GPT-5.6 model version available in Sweden Central.')
param modelVersion string = '2026-07-09'

@description('Latest Luna model for multimodal experience and visual workflows.')
param lunaModelName string = 'gpt-5.6-luna'

@description('Latest Terra model for deep operational reasoning workflows.')
param terraModelName string = 'gpt-5.6-terra'

@description('Existing application image preserved across infrastructure updates.')
param applicationImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Compressed agent metadata preserved across infrastructure updates.')
param agentStateB64 string = ''

var containerAppName = 'clientsphere-${suffix}'
var containerEnvironmentName = 'cae-clientsphere-${suffix}'
var containerRegistryName = 'acrclientsphere${suffix}'
var aiAccountName = 'clientsphere-ai-${suffix}'
var aiProjectName = 'clientsphere-project'
var vaultName = 'kv-clientsphere-${suffix}'
var logName = 'log-clientsphere-${suffix}'
var appInsightsName = 'appi-clientsphere-${suffix}'

var cognitiveServicesUserRole = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'a97b65f3-24c7-4388-baec-2e87135dc908')
var cognitiveOpenAiUserRole = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd')
var cognitiveOpenAiContributorRole = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'a001fd3d-188f-4b5d-821b-7da978bf7442')
var azureAiDeveloperRole = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '64702f94-c441-49e6-a78b-ef80e0188fee')
var acrPullRole = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
var acrPushRole = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '8311e382-0749-4cb8-b61a-304f252e45ec')

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logName
  location: location
  properties: {
    retentionInDays: 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: vaultName
  location: location
  properties: {
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enablePurgeProtection: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 30
    publicNetworkAccess: 'Enabled'
    sku: {
      family: 'A'
      name: 'standard'
    }
  }
}

resource sessionSecretResource 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'session-secret'
  properties: {
    value: sessionSecret
  }
}

resource foundry 'Microsoft.CognitiveServices/accounts@2025-06-01' = {
  name: aiAccountName
  location: aiLocation
  kind: 'AIServices'
  sku: {
    name: 'S0'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    allowProjectManagement: true
    customSubDomainName: aiAccountName
    disableLocalAuth: true
    dynamicThrottlingEnabled: true
    publicNetworkAccess: 'Enabled'
  }
}

resource modelDeployment 'Microsoft.CognitiveServices/accounts/deployments@2025-06-01' = {
  parent: foundry
  name: modelName
  sku: {
    name: 'GlobalStandard'
    capacity: 50
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: modelName
      version: modelVersion
    }
    raiPolicyName: 'Microsoft.Default'
    versionUpgradeOption: 'OnceCurrentVersionExpired'
  }
}

resource lunaModelDeployment 'Microsoft.CognitiveServices/accounts/deployments@2025-06-01' = {
  parent: foundry
  name: lunaModelName
  sku: {
    name: 'GlobalStandard'
    capacity: 50
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: lunaModelName
      version: modelVersion
    }
    raiPolicyName: 'Microsoft.Default'
    versionUpgradeOption: 'OnceCurrentVersionExpired'
  }
}

resource terraModelDeployment 'Microsoft.CognitiveServices/accounts/deployments@2025-06-01' = {
  parent: foundry
  name: terraModelName
  sku: {
    name: 'GlobalStandard'
    capacity: 50
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: terraModelName
      version: modelVersion
    }
    raiPolicyName: 'Microsoft.Default'
    versionUpgradeOption: 'OnceCurrentVersionExpired'
  }
}

resource foundryProject 'Microsoft.CognitiveServices/accounts/projects@2025-06-01' = {
  parent: foundry
  name: aiProjectName
  location: aiLocation
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    description: 'ClientSphere customer-specific public-intelligence agents'
    displayName: 'ClientSphere'
  }
}

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: containerRegistryName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

resource containerEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: containerEnvironmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
    zoneRedundant: false
  }
}

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: containerAppName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        allowInsecure: false
        external: true
        targetPort: 3000
        transport: 'auto'
      }
      secrets: [
        {
          name: 'session-secret'
          value: sessionSecret
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'clientsphere'
          image: applicationImage
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'PORT'
              value: '3000'
            }
            {
              name: 'PROJECT_ENDPOINT'
              value: 'https://${foundry.name}.services.ai.azure.com/api/projects/${foundryProject.name}'
            }
            {
              name: 'MODEL_DEPLOYMENT'
              value: modelDeployment.name
            }
            {
              name: 'GENERAL_MODEL_DEPLOYMENT'
              value: modelDeployment.name
            }
            {
              name: 'USE_CASE_MODEL_SOL'
              value: modelDeployment.name
            }
            {
              name: 'USE_CASE_MODEL_LUNA'
              value: lunaModelDeployment.name
            }
            {
              name: 'USE_CASE_MODEL_TERRA'
              value: terraModelDeployment.name
            }
            {
              name: 'SPEECH_REGION'
              value: aiLocation
            }
            {
              name: 'SPEECH_STS_ENDPOINT'
              value: 'https://${foundry.name}.cognitiveservices.azure.com/sts/v1.0/issueToken'
            }
            {
              name: 'SESSION_SECRET'
              secretRef: 'session-secret'
            }
            {
              name: 'AUTH_DEV_MODE'
              value: 'false'
            }
            {
              name: 'ADMIN_LOGINS'
              value: 'jonnychipz'
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: appInsights.properties.ConnectionString
            }
            {
              name: 'CLIENTSPHERE_AGENT_STATE_B64'
              value: agentStateB64
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
        rules: [
          {
            name: 'http'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

resource appAiUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(foundry.id, containerApp.id, cognitiveServicesUserRole)
  scope: foundry
  properties: {
    principalId: containerApp.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: cognitiveServicesUserRole
  }
}

resource appOpenAiUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(foundry.id, containerApp.id, cognitiveOpenAiUserRole)
  scope: foundry
  properties: {
    principalId: containerApp.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: cognitiveOpenAiUserRole
  }
}

resource appAcrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containerRegistry.id, containerApp.id, acrPullRole)
  scope: containerRegistry
  properties: {
    principalId: containerApp.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: acrPullRole
  }
}

resource deploymentAiDeveloper 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(foundry.id, deploymentPrincipalObjectId, azureAiDeveloperRole)
  scope: foundry
  properties: {
    principalId: deploymentPrincipalObjectId
    principalType: 'ServicePrincipal'
    roleDefinitionId: azureAiDeveloperRole
  }
}

resource deploymentOpenAiContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(foundry.id, deploymentPrincipalObjectId, cognitiveOpenAiContributorRole)
  scope: foundry
  properties: {
    principalId: deploymentPrincipalObjectId
    principalType: 'ServicePrincipal'
    roleDefinitionId: cognitiveOpenAiContributorRole
  }
}

resource deploymentCognitiveUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(foundry.id, deploymentPrincipalObjectId, cognitiveServicesUserRole)
  scope: foundry
  properties: {
    principalId: deploymentPrincipalObjectId
    principalType: 'ServicePrincipal'
    roleDefinitionId: cognitiveServicesUserRole
  }
}

resource deploymentOpenAiUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(foundry.id, deploymentPrincipalObjectId, cognitiveOpenAiUserRole)
  scope: foundry
  properties: {
    principalId: deploymentPrincipalObjectId
    principalType: 'ServicePrincipal'
    roleDefinitionId: cognitiveOpenAiUserRole
  }
}

resource deploymentAcrPush 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containerRegistry.id, deploymentPrincipalObjectId, acrPushRole)
  scope: containerRegistry
  properties: {
    principalId: deploymentPrincipalObjectId
    principalType: 'ServicePrincipal'
    roleDefinitionId: acrPushRole
  }
}

output containerAppName string = containerApp.name
output containerAppUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output containerRegistryName string = containerRegistry.name
output containerRegistryServer string = containerRegistry.properties.loginServer
output projectEndpoint string = 'https://${foundry.name}.services.ai.azure.com/api/projects/${foundryProject.name}'
output foundryAccountName string = foundry.name
output foundryProjectName string = foundryProject.name
