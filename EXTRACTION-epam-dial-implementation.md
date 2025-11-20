# EPAM DIAL Implementation

## Executive Summary

The EPAM DIAL (Dynamic Intelligence Abstraction Layer) implementation provides seamless integration with EPAM's AI proxy service, enabling users to access various AI models through a unified OpenAI-compatible interface. This implementation supports dynamic model discovery, intelligent URL normalization, and both Azure-style and direct OpenAI v1 API patterns.

## Why It Matters

### Goals and Value
- **Unified Access**: Single integration point for multiple AI models through EPAM's proxy service
- **Enterprise Ready**: Built for enterprise environments with proper authentication and configuration management
- **Flexibility**: Supports both Azure-style deployments and direct OpenAI v1 endpoints
- **Dynamic Discovery**: Automatically fetches available models and their capabilities from the DIAL service

### When to Use
- Enterprise environments using EPAM's AI infrastructure
- Organizations requiring centralized AI model access and governance
- Teams needing consistent API patterns across different underlying AI providers
- Scenarios requiring dynamic model discovery and metadata

## How It Works

### Architecture Overview
The DIAL implementation consists of several key components:

1. **Provider Integration**: [`OpenAiHandler`](src/api/providers/openai.ts:32) serves as the base handler
2. **Model Fetching**: [`fetchDialModels`](src/api/providers/fetchers/dial.ts:15) handles dynamic model discovery
3. **URL Normalization**: [`normalizeDialBaseUrl`](src/api/providers/utils/normalize-dial-base-url.ts:8) intelligently processes user-provided URLs
4. **Configuration Management**: Integration with the provider settings system

### Core Workflow
1. User configures DIAL base URL, API key, and model ID
2. System normalizes the base URL and determines API mode (Azure vs OpenAI v1)
3. Dynamic model fetching retrieves available models and metadata
4. OpenAI-compatible handler processes requests using DIAL's proxy service

## Configuration

### Required Settings

1. **Base URL** (`dialBaseUrl`):
   - **Setting**: `dialBaseUrl`
   - **Description**: EPAM DIAL service endpoint URL
   - **Default**: `https://ai-proxy.lab.epam.com`
   - **Examples**:
     - `https://ai-proxy.lab.epam.com` (default)
     - `https://custom-dial.company.com`
     - `https://dial-instance.com/openai/v1` (direct OpenAI v1 mode)

2. **API Key** (`dialApiKey`):
   - **Setting**: `dialApiKey`
   - **Description**: Authentication token for DIAL service access
   - **Required**: Yes
   - **Storage**: Securely stored in VS Code secrets

3. **Model ID** (`dialModelId`):
   - **Setting**: `dialModelId`
   - **Description**: Specific model identifier from DIAL's available models
   - **Default**: `gpt-4o`
   - **Validation**: Must exist in dynamically fetched model list

### URL Normalization Behavior

The system intelligently handles various URL formats:

- **Trailing `/openai`**: Stripped and treated as Azure-style base
- **Trailing `/openai/v1`**: Stripped and treated as Azure-style base  
- **Contains `/openai/v1`**: Preserved as direct OpenAI v1 endpoint
- **Bare domains**: Treated as Azure-style with `/openai` appended for discovery

**Examples**:
```
Input: https://dial.company.com/openai/
Output: https://dial.company.com (Azure mode)

Input: https://dial.company.com/openai/v1
Output: https://dial.company.com/openai/v1 (OpenAI v1 mode)

Input: https://dial.company.com
Output: https://dial.company.com (Azure mode, discovery at /openai)
```

## Technical Implementation

### Model Discovery

The [`fetchDialModels`](src/api/providers/fetchers/dial.ts:15) function:

- Fetches models from `{baseUrl}/models` endpoint
- Validates response using Zod schema for type safety
- Maps DIAL model metadata to internal [`ModelInfo`](packages/types/src/model-info.ts) structure
- Extracts pricing, context windows, and feature capabilities

**Key Features Detected**:
- **Tools Support**: Based on model name patterns and metadata
- **Prompt Caching**: Detected from model capabilities
- **Reasoning**: Support for reasoning models (o1, o3 families)
- **Context Windows**: Extracted from model metadata
- **Pricing**: Input/output token costs when available

### API Integration

The DIAL provider integrates with the existing OpenAI handler:

```typescript
// From src/api/index.ts
case "dial": {
  const { resolveDialApiConfig } = await import("./providers/utils/normalize-dial-base-url")
  const config = resolveDialApiConfig(options.dialBaseUrl)
  
  return new OpenAiHandler({
    ...options,
    openAiBaseUrl: config.apiBaseUrl,
    openAiApiKey: options.dialApiKey,
    openAiModelId: options.dialModelId,
    openAiUseAzure: config.useAzure,
  }, "DIAL")
}
```

### Stream Options Handling

DIAL has specific limitations around streaming options:

```typescript
// From src/api/providers/openai.ts:160-165
const isDIAL = this.providerName === "DIAL" || 
  (this.options.openAiBaseUrl && this.options.openAiBaseUrl.includes("ai-proxy.lab.epam.com"))

const requestOptions = {
  // ... other options
  ...(isGrokXAI || isDIAL ? {} : { stream_options: { include_usage: true } }),
}
```

## User Workflows and Interactions

### Initial Setup
1. Navigate to provider settings
2. Select "EPAM DIAL" from provider dropdown
3. Enter DIAL base URL (or use default)
4. Provide API key for authentication
5. System automatically fetches available models
6. Select desired model from dropdown

### Model Selection
1. Base URL and API key trigger model fetching
2. Available models populate in dropdown with metadata
3. User selects model based on capabilities and pricing
4. Configuration validates model availability

### Error Handling and Recovery
- **Invalid URL**: Clear error messages with format examples
- **Authentication Failure**: Specific guidance on API key requirements
- **Model Unavailable**: Dynamic validation against fetched model list
- **Network Issues**: Graceful fallback with retry mechanisms

## Constraints and Limitations

### Technical Constraints
- **Stream Options**: DIAL doesn't support `stream_options` for most models
- **Model Availability**: Limited to models exposed by DIAL service
- **Authentication**: Requires valid DIAL API key
- **Network Dependency**: Requires connectivity to DIAL service for model discovery

### Business Rules
- **Enterprise Only**: Designed for EPAM enterprise environments
- **Centralized Governance**: Model access controlled by DIAL service configuration
- **Usage Tracking**: All requests go through EPAM's proxy for monitoring

## Troubleshooting

### Common Issues and Solutions

**"Failed to fetch models"**
- **Symptoms**: Empty model dropdown, connection errors
- **Causes**: Invalid base URL, network connectivity, authentication failure
- **Fixes**: 
  - Verify base URL format and accessibility
  - Check API key validity
  - Ensure network connectivity to DIAL service
- **Prevention**: Use URL validation and connection testing

**"Model not available"**
- **Symptoms**: Selected model shows as invalid
- **Causes**: Model removed from DIAL service, configuration drift
- **Fixes**: 
  - Refresh model list
  - Select alternative model
  - Contact DIAL service administrator
- **Prevention**: Regular model list updates

**"Authentication failed"**
- **Symptoms**: 401/403 errors, access denied messages
- **Causes**: Invalid API key, expired credentials, insufficient permissions
- **Fixes**: 
  - Verify API key with DIAL administrator
  - Request new credentials if expired
  - Check user permissions in DIAL system
- **Prevention**: Regular credential rotation and validation

### Diagnostic Steps
1. **Test Connection**: Use base URL to verify DIAL service accessibility
2. **Validate Credentials**: Confirm API key works with DIAL service
3. **Check Model List**: Verify models are available and accessible
4. **Review Logs**: Check VS Code developer console for detailed errors

## Do/Don't Guidelines

### Do
- Use the default DIAL base URL unless you have a specific enterprise instance
- Validate API keys before saving configuration
- Regularly refresh model lists to get latest available models
- Use model metadata to select appropriate models for your use case

### Don't
- Hardcode API keys in configuration files
- Assume model availability without checking the dynamic list
- Use custom base URLs without understanding the URL normalization behavior
- Ignore authentication errors - they indicate configuration issues

## FAQ

**"Why does my custom URL get modified?"**
- The system normalizes URLs to ensure consistent API behavior. URLs ending in `/openai` or `/openai/v1` are processed to determine the correct API mode (Azure vs OpenAI v1).

**"Can I use DIAL without an API key?"**
- No, DIAL requires authentication. Contact your EPAM administrator to obtain valid credentials.

**"Why don't I see all models in the dropdown?"**
- Model availability depends on your DIAL service configuration and permissions. The system only shows models you have access to.

**"What's the difference between Azure and OpenAI v1 modes?"**
- Azure mode uses deployment-style paths (`/openai/deployments/{model}`), while OpenAI v1 mode uses direct model references. The system automatically determines the correct mode based on your base URL.

## Version and Compatibility Notes

### Dependencies
- Requires OpenAI SDK for API communication
- Uses Zod for response validation
- Integrates with VS Code secrets for secure credential storage

### Provider Integration
- Extends the existing OpenAI-compatible provider system
- Supports all standard OpenAI API features through DIAL proxy
- Compatible with existing model selection and configuration UI

### Future Considerations
- Model metadata schema may evolve with DIAL service updates
- Additional authentication methods may be supported
- Enhanced model filtering and selection capabilities planned

## Related Features
- **OpenAI Provider**: DIAL extends the OpenAI-compatible provider pattern
- **Dynamic Providers**: Part of the dynamic provider system for runtime model discovery
- **Provider Settings**: Integrates with the unified provider configuration system
- **Model Selection**: Uses the standard model selection UI with DIAL-specific enhancements