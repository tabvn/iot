// Central OpenAPI/Swagger document for the IoT API
// NOTE: This is currently hand-maintained but structured so we can later
// generate parts of it from shared validation schemas.
export const openApiDoc = {
  openapi: "3.1.0",
  info: {
    title: "The Bay City Dev IoT API",
    version: "1.0.0",
    description:
      "Workspace-based IoT API for devices, ingest, analytics, automations, and workspace management.\n\n" +
      "Authentication: JWT Bearer tokens with multiple roles: user, api, device, workspace_master, and super_master (root key).\n" +
      "- user: scoped by workspace membership, must provide x-workspace-alias header.\n" +
      "- api: workspace API key, bound to a single workspace.\n" +
      "- device: per-device token, bound to a device + workspace.\n" +
      "- workspace_master: per-workspace master key, full control of that workspace.\n" +
      "- super_master: global root key; can manage any workspace by specifying x-workspace-alias.",
  },
  servers: [
    { url: "https://api.thebaycity.dev", description: "Production" },
    { url: "http://localhost:8787", description: "Local Cloudflare dev" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "JWT Bearer token. The 'type' claim inside the token determines its role: user, api, device, workspace_master, or super_master.",
      },
    },
    parameters: {
      WorkspaceAliasHeader: {
        name: "x-workspace-alias",
        in: "header",
        description:
          "Workspace alias (e.g. office-building). Required for user and super_master tokens to select a workspace.",
        required: false,
        schema: { type: "string" },
      },
    },
    schemas: {
      Device: {
        type: "object",
        properties: {
          deviceId: { type: "string" },
          workspaceId: { type: "string" },
          name: { type: "string" },
          type: { type: "string" },
        },
      },
      CreateDeviceRequest: {
        type: "object",
        required: ["name", "type"],
        properties: {
          name: { type: "string" },
          type: { type: "string" },
        },
      },
      Automation: {
        type: "object",
        properties: {
          automationId: { type: "string" },
          workspaceId: { type: "string" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          status: { type: "string", description: "active | disabled" },
          triggerType: { type: "string" },
          triggerConfig: { type: "object" },
          actions: { type: "array", items: { type: "object" } },
        },
      },
      CreateAutomationRequest: {
        allOf: [
          { $ref: "#/components/schemas/Automation" },
          {
            required: ["name", "triggerType", "triggerConfig", "actions"],
            properties: {
              automationId: { readOnly: true },
              workspaceId: { readOnly: true },
              status: { readOnly: true },
            },
          },
        ],
      },
      ApiExplorerRequest: {
        type: "object",
        required: ["method", "path"],
        properties: {
          method: { type: "string", example: "GET" },
          path: { type: "string", example: "/devices" },
          headers: { type: "object", additionalProperties: { type: "string" } },
          body: {},
        },
      },
      User: {
        type: "object",
        properties: {
          userId: { type: "string" },
          email: { type: "string", format: "email" },
          avatarUrl: { type: "string", format: "uri", nullable: true },
        },
      },
      Workspace: {
        type: "object",
        properties: {
          workspaceId: { type: "string" },
          name: { type: "string" },
          slug: { type: "string" },
          description: { type: "string", nullable: true },
        },
      },
      WorkspaceMember: {
        type: "object",
        properties: {
          userId: { type: "string" },
          role: { type: "string" },
          devicePermissions: {
            type: "object",
            additionalProperties: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
      WorkspacePlanResponse: {
        type: "object",
        properties: {
          plan: { type: "string" },
        },
      },
      WorkspacePlanUpdateRequest: {
        type: "object",
        required: ["plan"],
        properties: {
          plan: { type: "string" },
        },
      },
      BillingInvoice: {
        type: "object",
        properties: {
          invoiceId: { type: "string" },
          amount: { type: "number" },
          status: { type: "string" },
          period: { type: "string" },
        },
      },
      DeviceAnalyticsPoint: {
        type: "object",
        properties: {
          at: { type: "string", format: "date-time" },
          status: { type: "string", nullable: true },
          fields: { type: "object", additionalProperties: {} },
        },
      },
      DeviceAnalyticsResponse: {
        type: "object",
        properties: {
          deviceId: { type: "string" },
          from: { type: "string", format: "date-time", nullable: true },
          to: { type: "string", format: "date-time", nullable: true },
          points: {
            type: "array",
            items: { $ref: "#/components/schemas/DeviceAnalyticsPoint" },
          },
          nextCursor: { type: "string", nullable: true },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password", minLength: 8 },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          token: { type: "string", description: "JWT access token (type=user)" },
          sessionId: { type: "string", description: "Server-side session identifier" },
          userId: { type: "string", description: "Authenticated user id" },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        tags: ["system"],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    ts: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/devices": {
      get: {
        summary: "List devices in workspace",
        tags: ["devices"],
        parameters: [{ $ref: "#/components/parameters/WorkspaceAliasHeader" }],
        responses: {
          200: {
            description: "List of devices",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    devices: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Device" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create device in workspace",
        tags: ["devices"],
        parameters: [{ $ref: "#/components/parameters/WorkspaceAliasHeader" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateDeviceRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Device created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    deviceId: { type: "string" },
                    name: { type: "string" },
                    type: { type: "string" },
                  },
                },
              },
            },
          },
          400: { description: "Validation error" },
        },
      },
    },
    "/automations": {
      get: {
        summary: "List automations in workspace",
        tags: ["automations"],
        parameters: [{ $ref: "#/components/parameters/WorkspaceAliasHeader" }],
        responses: {
          200: {
            description: "List of automations",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    automations: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Automation" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create automation",
        tags: ["automations"],
        parameters: [{ $ref: "#/components/parameters/WorkspaceAliasHeader" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateAutomationRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Automation created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    automationId: { type: "string" },
                  },
                },
              },
            },
          },
          400: { description: "Validation error" },
        },
      },
    },
    "/explorer": {
      post: {
        summary: "API explorer helper",
        description:
          "Authenticated helper endpoint used by the API playground. It forwards the described request (method, path, headers, body) through the same router as normal API calls.",
        tags: ["system"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiExplorerRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Proxied response from target endpoint",
          },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/login": {
      post: {
        summary: "Login with email and password",
        tags: ["auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/logout": {
      post: {
        summary: "Logout current user",
        tags: ["auth"],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  sessionId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Logged out" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/users": {
      post: {
        summary: "Create user",
        tags: ["users"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "passwordHash"],
                properties: {
                  email: { type: "string", format: "email" },
                  passwordHash: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "User created" },
          400: { description: "Validation error" },
        },
      },
    },
    "/users/{userId}": {
      get: {
        summary: "Get user by id",
        tags: ["users"],
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "User",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
          404: { description: "Not found" },
        },
      },
      put: {
        summary: "Update user",
        tags: ["users"],
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  passwordHash: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated" },
          404: { description: "Not found" },
        },
      },
      delete: {
        summary: "Delete user and owned workspaces",
        tags: ["users"],
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Deleted" },
          404: { description: "Not found" },
        },
      },
    },
    "/users/{userId}/avatar": {
      post: {
        summary: "Upload user avatar",
        tags: ["users"],
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "image/*": {
              schema: { type: "string", format: "binary" },
            },
          },
        },
        responses: {
          200: {
            description: "Avatar uploaded",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    avatarUrl: { type: "string", format: "uri" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
          404: { description: "User not found" },
        },
      },
      get: {
        summary: "Get user avatar image",
        tags: ["users"],
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "Avatar image",
            content: {
              "image/*": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
          404: { description: "Not found" },
        },
      },
    },
    "/users/by-email/{email}": {
      get: {
        summary: "Get user by email",
        tags: ["users"],
        parameters: [
          {
            name: "email",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "User",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
          404: { description: "Not found" },
        },
      },
    },
    "/workspaces": {
      post: {
        summary: "Create workspace",
        tags: ["workspaces"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["ownerUserId", "name", "slug"],
                properties: {
                  ownerUserId: { type: "string" },
                  name: { type: "string" },
                  slug: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Workspace created" },
          400: { description: "Validation error" },
        },
      },
    },
    "/workspace": {
      put: {
        summary: "Update workspace (by alias)",
        tags: ["workspaces"],
        parameters: [{ $ref: "#/components/parameters/WorkspaceAliasHeader" }],
        responses: {
          200: { description: "Updated" },
          401: { description: "Unauthorized" },
        },
      },
      delete: {
        summary: "Delete workspace (by alias)",
        tags: ["workspaces"],
        parameters: [{ $ref: "#/components/parameters/WorkspaceAliasHeader" }],
        responses: {
          202: { description: "Deleted and cleanup queued" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/users/{userId}/workspaces": {
      get: {
        summary: "List workspaces for a user",
        tags: ["workspaces"],
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Workspaces",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    workspaces: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Workspace" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/workspaces/by-alias/{alias}": {
      get: {
        summary: "Lookup workspace by alias",
        tags: ["workspaces"],
        parameters: [
          {
            name: "alias",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Workspace",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Workspace" },
              },
            },
          },
          404: { description: "Not found" },
        },
      },
    },
    "/devices/{deviceId}/ingest": {
      post: {
        summary: "Ingest device data",
        tags: ["devices"],
        parameters: [
          {
            name: "deviceId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", additionalProperties: {} },
            },
          },
        },
        responses: {
          200: { description: "Ingest accepted" },
          401: { description: "Unauthorized" },
          403: { description: "Device token mismatch" },
          429: { description: "Rate limit exceeded" },
        },
      },
    },
    "/devices/{deviceId}/analytics": {
      get: {
        summary: "Get device analytics",
        tags: ["analytics"],
        parameters: [
          { $ref: "#/components/parameters/WorkspaceAliasHeader" },
          { name: "deviceId", in: "path", required: true, schema: { type: "string" } },
          { name: "from", in: "query", required: false, schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", required: false, schema: { type: "string", format: "date-time" } },
          { name: "cursor", in: "query", required: false, schema: { type: "string" } },
          { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 500 } },
        ],
        responses: {
          200: {
            description: "Analytics",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DeviceAnalyticsResponse" },
              },
            },
          },
          401: { description: "Unauthorized" },
          404: { description: "Device not found" },
        },
      },
    },
    "/members": {
      get: {
        summary: "List workspace members",
        tags: ["members"],
        parameters: [{ $ref: "#/components/parameters/WorkspaceAliasHeader" }],
        responses: {
          200: {
            description: "Members",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    members: {
                      type: "array",
                      items: { $ref: "#/components/schemas/WorkspaceMember" },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        summary: "Add workspace member",
        tags: ["members"],
        parameters: [{ $ref: "#/components/parameters/WorkspaceAliasHeader" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId", "role"],
                properties: {
                  userId: { type: "string" },
                  role: { type: "string" },
                  devicePermissions: {
                    type: "object",
                    additionalProperties: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Member added" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/members/{userId}": {
      put: {
        summary: "Update workspace member",
        tags: ["members"],
        parameters: [
          { $ref: "#/components/parameters/WorkspaceAliasHeader" },
          { name: "userId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  role: { type: "string" },
                  devicePermissions: {
                    type: "object",
                    additionalProperties: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Member not found" },
        },
      },
      delete: {
        summary: "Remove workspace member",
        tags: ["members"],
        parameters: [
          { $ref: "#/components/parameters/WorkspaceAliasHeader" },
          { name: "userId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Removed" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/plan": {
      get: {
        summary: "Get workspace plan",
        tags: ["billing"],
        parameters: [{ $ref: "#/components/parameters/WorkspaceAliasHeader" }],
        responses: {
          200: {
            description: "Current plan",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WorkspacePlanResponse" },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
      put: {
        summary: "Update workspace plan",
        tags: ["billing"],
        parameters: [{ $ref: "#/components/parameters/WorkspaceAliasHeader" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WorkspacePlanUpdateRequest" },
            },
          },
        },
        responses: {
          200: { description: "Updated" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/billing": {
      get: {
        summary: "Get workspace billing history",
        tags: ["billing"],
        parameters: [{ $ref: "#/components/parameters/WorkspaceAliasHeader" }],
        responses: {
          200: {
            description: "Invoices",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    invoices: {
                      type: "array",
                      items: { $ref: "#/components/schemas/BillingInvoice" },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/workspace/api-keys": {
      post: {
        summary: "Create workspace API key",
        tags: ["workspaces"],
        parameters: [{ $ref: "#/components/parameters/WorkspaceAliasHeader" }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "API key created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    apiKeyId: { type: "string" },
                    token: { type: "string" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
      get: {
        summary: "List workspace API keys",
        tags: ["workspaces"],
        parameters: [{ $ref: "#/components/parameters/WorkspaceAliasHeader" }],
        responses: {
          200: {
            description: "API keys",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    keys: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          apiKeyId: { type: "string" },
                          name: { type: "string" },
                          revokedAt: { type: "string", nullable: true },
                          createdAt: { type: "string", format: "date-time" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/workspace/api-keys/{apiKeyId}": {
      delete: {
        summary: "Revoke workspace API key",
        tags: ["workspaces"],
        parameters: [
          { $ref: "#/components/parameters/WorkspaceAliasHeader" },
          { name: "apiKeyId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Revoked" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/users/me": {
      get: {
        summary: "Get current authenticated user",
        tags: ["users"],
        responses: {
          200: {
            description: "Current user",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
          401: { description: "Unauthorized" },
          404: { description: "User not found" },
        },
      },
    },
  },
} as const;
