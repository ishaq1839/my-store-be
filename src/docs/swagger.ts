import swaggerJSDoc from "swagger-jsdoc";

export function buildOpenApiSpec() {
  return swaggerJSDoc({
    definition: {
      openapi: "3.0.3",
      info: {
        title: "MyStore API",
        version: "0.1.0",
      },
      servers: [{ url: "/" }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      tags: [
        { name: "Health" },
        { name: "Authentication" },
        { name: "Admin" },
        { name: "Contacts" },
        { name: "Stores" },
        { name: "Stores — Inventory" },
        { name: "Stores — Bills" },
        { name: "Stores — Reports" },
      ],
      paths: {
        "/health": {
          get: {
            tags: ["Health"],
            summary: "Health check",
            responses: {
              200: {
                description: "OK",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: { ok: { type: "boolean", example: true } },
                      required: ["ok"],
                    },
                  },
                },
              },
            },
          },
        },
        "/auth/login": {
          post: {
            tags: ["Authentication"],
            summary: "Login",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      email: { type: "string", example: "admin@example.com" },
                      password: { type: "string", example: "password" },
                    },
                    required: ["email", "password"],
                  },
                },
              },
            },
            responses: {
              200: {
                description: "Login success",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        access_token: { type: "string" },
                        refresh_token: { type: "string" },
                        email: { type: "string" },
                        uuid: { type: "string" },
                        role: { type: "string", enum: ["user", "admin"] },
                        store: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              uuid: { type: "string" },
                              owner_id: { type: "string" },
                              created_at: { type: "string" },
                              updated_at: { type: "string" },
                              name: { type: "string" },
                              description: { type: "string" },
                              address: { type: "string" },
                              status: { type: "string" },
                              subscription_status: { type: "string" },
                            },
                            required: [
                              "uuid",
                              "owner_id",
                              "created_at",
                              "updated_at",
                              "name",
                              "description",
                              "address",
                              "status",
                              "subscription_status",
                            ],
                          },
                        },
                      },
                      required: ["access_token", "refresh_token", "email", "uuid", "role", "store"],
                    },
                  },
                },
              },
              400: { description: "Missing email/password" },
              401: { description: "Invalid credentials" },
              500: { description: "Internal Server Error" },
            },
          },
        },
        "/auth/register": {
          post: {
            tags: ["Authentication"],
            summary: "Register",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      email: { type: "string", example: "user@example.com" },
                      password: {
                        type: "string",
                        example: "Password@123",
                        description:
                          "8-128 chars, at least 1 lowercase, 1 uppercase, 1 number, 1 special character.",
                      },
                      firstname: { type: "string", example: "John" },
                      lastname: { type: "string", example: "Doe" },
                      role: { type: "string", enum: ["user", "admin"], example: "user" },
                    },
                    required: ["email", "password", "firstname", "lastname"],
                  },
                },
              },
            },
            responses: {
              201: {
                description: "User created",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        uuid: { type: "string" },
                        email: { type: "string" },
                        role: { type: "string" },
                        firstname: { type: "string" },
                        lastname: { type: "string" },
                      },
                      required: ["uuid", "email", "role", "firstname", "lastname"],
                    },
                  },
                },
              },
              400: { description: "Validation error" },
              409: { description: "Email already exists" },
              500: { description: "Internal Server Error" },
            },
          },
        },
        "/auth/password-reset/request": {
          post: {
            tags: ["Authentication"],
            summary: "Request password reset",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      email: { type: "string", example: "user@example.com" },
                    },
                    required: ["email"],
                  },
                },
              },
            },
            responses: {
              200: {
                description: "Request accepted",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        message: { type: "string" },
                        reset_link: { type: "string" },
                      },
                      required: ["message"],
                    },
                  },
                },
              },
              400: { description: "Validation error" },
              500: { description: "Internal Server Error" },
            },
          },
        },
        "/auth/refresh": {
          post: {
            tags: ["Authentication"],
            summary: "Refresh tokens",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      refresh_token: { type: "string" },
                    },
                    required: ["refresh_token"],
                  },
                },
              },
            },
            responses: {
              200: {
                description: "Refreshed tokens",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        access_token: { type: "string" },
                        refresh_token: { type: "string" },
                        email: { type: "string" },
                        uuid: { type: "string" },
                        role: { type: "string", enum: ["user", "admin"] },
                        store: { type: "array", items: { type: "object" } },
                      },
                      required: ["access_token", "refresh_token", "email", "uuid", "role", "store"],
                    },
                  },
                },
              },
              400: { description: "Validation error" },
              401: { description: "Invalid refresh token" },
              500: { description: "Internal Server Error" },
            },
          },
        },
        "/admin/users": {
          post: {
            tags: ["Admin"],
            summary: "Admin create user (role=user)",
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      email: { type: "string", example: "newuser@example.com" },
                      password: {
                        type: "string",
                        example: "Password@123",
                        description:
                          "8-128 chars, at least 1 lowercase, 1 uppercase, 1 number, 1 special character.",
                      },
                      firstname: { type: "string", example: "Jane" },
                      lastname: { type: "string", example: "Doe" },
                    },
                    required: ["email", "password", "firstname", "lastname"],
                  },
                },
              },
            },
            responses: {
              201: {
                description: "User created",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        uuid: { type: "string" },
                        email: { type: "string" },
                        role: { type: "string", enum: ["user"] },
                        firstname: { type: "string" },
                        lastname: { type: "string" },
                      },
                      required: ["uuid", "email", "role", "firstname", "lastname"],
                    },
                  },
                },
              },
              400: { description: "Validation error" },
              401: { description: "Unauthorized" },
              403: { description: "Forbidden" },
              409: { description: "Email already exists" },
              500: { description: "Internal Server Error" },
            },
          },
          get: {
            tags: ["Admin"],
            summary: "Admin list users (optional fuzzy search)",
            security: [{ bearerAuth: [] }],
            parameters: [
              { in: "query", name: "search", required: false, schema: { type: "string", example: "john gmail" } },
              { in: "query", name: "limit", required: false, schema: { type: "number", example: 20 } },
              { in: "query", name: "cursor", required: false, schema: { type: "string" } },
            ],
            responses: {
              200: {
                description: "User list",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        users: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              uuid: { type: "string" },
                              email: { type: "string" },
                              role: { type: "string", enum: ["user", "admin"] },
                              firstname: { type: "string" },
                              lastname: { type: "string" },
                              created_at: { type: "string" },
                              updated_at: { type: "string" },
                            },
                            required: ["uuid", "email", "role", "firstname", "lastname"],
                          },
                        },
                        next_cursor: { type: "string" },
                      },
                      required: ["users"],
                    },
                  },
                },
              },
              400: { description: "Validation error" },
              401: { description: "Unauthorized" },
              403: { description: "Forbidden" },
              500: { description: "Internal Server Error" },
            },
          },
        },
        "/stores/{store_uuid}/contacts": {
          parameters: [{ in: "path", name: "store_uuid", required: true, schema: { type: "string" } }],
          post: {
            tags: ["Contacts"],
            summary: "Create store contact",
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      name: { type: "string", example: "Acme Inc" },
                      description: { type: "string", example: "Main supplier contact" },
                      address: { type: "string", example: "123 Market St" },
                      contact_number: { type: "string", example: "+1 555 123 4567" },
                    },
                    required: ["name", "description"],
                  },
                },
              },
            },
            responses: {
              201: { description: "Contact created" },
              400: { description: "Validation error" },
              401: { description: "Unauthorized" },
              403: { description: "Forbidden" },
              500: { description: "Internal Server Error" },
            },
          },
          get: {
            tags: ["Contacts"],
            summary: "List contacts for a store",
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: "Contact list" },
              401: { description: "Unauthorized" },
              403: { description: "Forbidden" },
              500: { description: "Internal Server Error" },
            },
          },
        },
        "/stores": {
          post: {
            tags: ["Stores"],
            summary: "Create store",
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      name: { type: "string", example: "Main Store" },
                      address: { type: "string", example: "123 Market St" },
                      description: { type: "string", example: "Primary store location" },
                      status: { type: "string", enum: ["active", "inactive"], example: "active" },
                      subscription_status: { type: "string", enum: ["free", "subscribed"], example: "free" },
                      owner_id: {
                        type: "string",
                        description: "Admin only. Assign store ownership to this user uuid.",
                      },
                    },
                    required: ["name", "address", "description"],
                  },
                },
              },
            },
            responses: {
              201: { description: "Store created" },
              400: { description: "Validation error" },
              401: { description: "Unauthorized" },
              403: { description: "Forbidden" },
              404: { description: "owner_id not found" },
              500: { description: "Internal Server Error" },
            },
          },
          get: {
            tags: ["Stores"],
            summary: "List stores",
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                in: "query",
                name: "search",
                required: false,
                schema: { type: "string", example: "main john gmail" },
                description: "Search by store name or owner name or owner email.",
              },
              { in: "query", name: "limit", required: false, schema: { type: "number", example: 20 } },
              { in: "query", name: "cursor", required: false, schema: { type: "string" } },
            ],
            responses: {
              200: { description: "Store list" },
              400: { description: "Validation error" },
              401: { description: "Unauthorized" },
              403: { description: "Forbidden" },
              500: { description: "Internal Server Error" },
            },
          },
        },
        "/stores/{store_uuid}/staff": {
          parameters: [{ in: "path", name: "store_uuid", required: true, schema: { type: "string" } }],
          post: {
            tags: ["Stores — Staff"],
            summary: "Create staff user and assign to store (owner only)",
            description:
              "Store owner creates a staff account for this store. Staff can sell, preview, and finalize bills, but cannot apply discounts or manage inventory/reports.",
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      email: { type: "string", format: "email", example: "cashier@shop.com" },
                      password: { type: "string", example: "Secret1!" },
                      firstname: { type: "string", example: "Ali" },
                      lastname: { type: "string", example: "Khan" },
                    },
                    required: ["email", "password", "firstname", "lastname"],
                  },
                },
              },
            },
            responses: {
              201: { description: "Staff created and assigned" },
              400: { description: "Validation error" },
              401: { description: "Unauthorized" },
              403: { description: "Only store owner can manage staff" },
              409: { description: "Email already exists" },
            },
          },
          get: {
            tags: ["Stores — Staff"],
            summary: "List staff for a store (owner only)",
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: "Staff list" },
              401: { description: "Unauthorized" },
              403: { description: "Only store owner can manage staff" },
              404: { description: "Store not found" },
            },
          },
        },
        "/stores/{store_uuid}/staff/{user_uuid}": {
          parameters: [
            { in: "path", name: "store_uuid", required: true, schema: { type: "string" } },
            { in: "path", name: "user_uuid", required: true, schema: { type: "string" } },
          ],
          delete: {
            tags: ["Stores — Staff"],
            summary: "Remove staff from store (owner only)",
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: "Staff removed from store" },
              401: { description: "Unauthorized" },
              403: { description: "Only store owner can manage staff" },
              404: { description: "Staff member not found" },
            },
          },
        },
        "/stores/{store_uuid}/inventory/items": {
          parameters: [{ in: "path", name: "store_uuid", required: true, schema: { type: "string" } }],
          post: {
            tags: ["Stores — Inventory"],
            summary: "Create item with first batch or add batch to existing item",
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      item_id: { type: "string", description: "If set, adds a batch to this item" },
                      type: {
                        type: "string",
                        enum: ["single", "carton", "service"],
                        description:
                          "Required when creating a new item. Use service for non-stock offerings (e.g. haircuts).",
                        example: "single",
                      },
                      name: { type: "string", description: "Required when creating a new item" },
                      description: { type: "string", description: "Required when creating a new item" },
                      retail_price: { type: "number", example: 10 },
                      sale_price: { type: "number", nullable: true },
                      total_items: {
                        type: "integer",
                        example: 10,
                        description: "Units in this batch. Must be 0 for service items.",
                      },
                    },
                    required: ["retail_price"],
                  },
                },
              },
            },
            responses: {
              201: { description: "Item and batch created or batch added" },
              400: { description: "Validation error" },
              401: { description: "Unauthorized" },
              403: { description: "Not store owner" },
              404: { description: "Store or item not found" },
              500: { description: "Internal Server Error" },
            },
          },
          get: {
            tags: ["Stores — Inventory"],
            summary: "List inventory items for a store",
            security: [{ bearerAuth: [] }],
            parameters: [
              { in: "query", name: "search", schema: { type: "string" } },
              { in: "query", name: "limit", schema: { type: "number", example: 20 } },
              { in: "query", name: "cursor", schema: { type: "string" } },
            ],
            responses: {
              200: {
                description: "Item list with totals and current prices",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        items: { type: "array", items: { type: "object" } },
                        next_cursor: { type: "string", nullable: true },
                        source: {
                          type: "string",
                          enum: ["cache", "db"],
                          description: "Whether the store catalog was served from memory cache or loaded from Firestore",
                        },
                      },
                    },
                  },
                },
              },
              401: { description: "Unauthorized" },
              403: { description: "Not store owner" },
              404: { description: "Store not found" },
              500: { description: "Internal Server Error" },
            },
          },
        },
        "/stores/{store_uuid}/inventory/items/bulk": {
          parameters: [{ in: "path", name: "store_uuid", required: true, schema: { type: "string" } }],
          post: {
            tags: ["Stores — Inventory"],
            summary: "Enqueue bulk create inventory items (async CSV/JSON import)",
            description:
              "Accepts up to 100 new items and returns immediately with a job_id. Processing continues in the background. Poll GET /items/bulk/{job_id} for progress and per-row results.",
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      items: {
                        type: "array",
                        minItems: 1,
                        maxItems: 100,
                        items: {
                          type: "object",
                          properties: {
                            type: { type: "string", enum: ["single", "carton", "service"], example: "service" },
                            name: { type: "string", example: "Haircut" },
                            description: { type: "string", example: "Standard men's haircut" },
                            retail_price: { type: "number", example: 500 },
                            sale_price: { type: "number", nullable: true, example: 600 },
                            total_items: { type: "integer", example: 0, description: "Must be 0 for service items" },
                          },
                          required: ["type", "name", "description", "retail_price"],
                        },
                      },
                    },
                    required: ["items"],
                  },
                },
              },
            },
            responses: {
              202: {
                description: "Job accepted; processing continues asynchronously",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        job_id: { type: "string" },
                        status: { type: "string", example: "queued" },
                        total: { type: "integer", example: 10 },
                      },
                    },
                  },
                },
              },
              400: { description: "Validation error (e.g. empty items or >100 rows)" },
              401: { description: "Unauthorized" },
              403: { description: "Not store owner" },
              404: { description: "Store not found" },
            },
          },
        },
        "/stores/{store_uuid}/inventory/items/bulk/{job_id}": {
          parameters: [
            { in: "path", name: "store_uuid", required: true, schema: { type: "string" } },
            { in: "path", name: "job_id", required: true, schema: { type: "string" } },
          ],
          get: {
            tags: ["Stores — Inventory"],
            summary: "Get bulk import job status",
            description: "Poll until status is completed or failed. Includes per-row results when available.",
            security: [{ bearerAuth: [] }],
            responses: {
              200: {
                description: "Job status",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        job_id: { type: "string" },
                        status: {
                          type: "string",
                          enum: ["queued", "processing", "completed", "failed"],
                        },
                        total: { type: "integer" },
                        processed: { type: "integer" },
                        created: { type: "integer" },
                        failed: { type: "integer" },
                        results: { type: "array", items: { type: "object" } },
                        error: { type: "string", nullable: true },
                        created_at: { type: "string" },
                        started_at: { type: "string", nullable: true },
                        completed_at: { type: "string", nullable: true },
                      },
                    },
                  },
                },
              },
              401: { description: "Unauthorized" },
              403: { description: "Not store owner" },
              404: { description: "Job not found" },
            },
          },
        },
        "/stores/{store_uuid}/inventory/items/{item_id}/prices": {
          parameters: [
            { in: "path", name: "store_uuid", required: true, schema: { type: "string" } },
            { in: "path", name: "item_id", required: true, schema: { type: "string" } },
          ],
          patch: {
            tags: ["Stores — Inventory"],
            summary: "Update item prices and optional quantity for future sales",
            description:
              "Creates a new pricing batch and applies new prices going forward. Past bills are unchanged. Optional total_items sets the new remaining stock (stock items only). If omitted, existing remaining quantity is kept and moved into the new batch.",
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      retail_price: { type: "number", example: 120 },
                      sale_price: { type: "number", nullable: true, example: 150 },
                      total_items: {
                        type: "integer",
                        minimum: 0,
                        example: 24,
                        description:
                          "Optional. New remaining quantity for single/carton items. Must be 0 for services. Omit to keep current stock.",
                      },
                    },
                    required: ["retail_price"],
                  },
                },
              },
            },
            responses: {
              200: { description: "Prices (and optional quantity) updated; previous bills unaffected" },
              400: { description: "Validation error" },
              401: { description: "Unauthorized" },
              403: { description: "Not store owner" },
              404: { description: "Item not found" },
              500: { description: "Internal Server Error" },
            },
          },
        },
        "/stores/{store_uuid}/inventory/items/{item_id}/batches": {
          parameters: [
            { in: "path", name: "store_uuid", required: true, schema: { type: "string" } },
            { in: "path", name: "item_id", required: true, schema: { type: "string" } },
          ],
          get: {
            tags: ["Stores — Inventory"],
            summary: "List batches for an item (newest first)",
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: "Batch list" },
              401: { description: "Unauthorized" },
              403: { description: "Not store owner" },
              404: { description: "Store or item not found" },
              500: { description: "Internal Server Error" },
            },
          },
        },
        "/stores/{store_uuid}/inventory/items/{item_id}/sell": {
          parameters: [
            { in: "path", name: "store_uuid", required: true, schema: { type: "string" } },
            { in: "path", name: "item_id", required: true, schema: { type: "string" } },
          ],
          post: {
            tags: ["Stores — Inventory"],
            summary: "Sell/consume stock (FIFO by batch)",
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { quantity: { type: "integer", example: 1, minimum: 1 } },
                    required: ["quantity"],
                  },
                },
              },
            },
            responses: {
              200: { description: "Breakdown per batch; remaining_total updated" },
              400: { description: "Not enough stock" },
              401: { description: "Unauthorized" },
              403: { description: "Not store owner" },
              404: { description: "Store or item not found" },
              500: { description: "Internal Server Error" },
            },
          },
        },
        "/stores/{store_uuid}/bills/preview": {
          parameters: [{ in: "path", name: "store_uuid", required: true, schema: { type: "string" } }],
          post: {
            tags: ["Stores — Bills"],
            summary: "Preview bill (FIFO retail floor, display subtotal, max discount %)",
            description:
              "Supports catalog item lines and fixed custom charge lines (kind=custom). Custom charges are never discounted. Optional unit_discount on catalog lines is the charged unit rate when it differs from list sale (discount or markup): floor = retail, no ceiling. If any line sets unit_discount, overall discount_percent is ignored.",
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      lines: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            kind: {
                              type: "string",
                              enum: ["item", "custom"],
                              default: "item",
                              description: "item = inventory/service catalog; custom = one-off fixed charge",
                            },
                            item_id: { type: "string", description: "Required when kind=item" },
                            name: { type: "string", description: "Required when kind=custom", example: "Refreshments" },
                            unit_price: {
                              type: "number",
                              description: "Required when kind=custom. Fixed; never discounted.",
                              example: 250,
                            },
                            quantity: { type: "integer", minimum: 1 },
                            unit_discount: {
                              type: "number",
                              description:
                                "Optional per-unit selling rate for catalog lines (field name historical). Send whenever the charged unit rate differs from list sale — discount or markup. Floor: cannot go below retail (e.g. retail 85 → min 85). Ceiling: none (e.g. sale 100 → 110 is allowed). Not allowed on custom lines. If any line sets this, overall discount_percent is ignored.",
                              example: 110,
                            },
                          },
                          required: ["quantity"],
                        },
                      },
                      final_total: {
                        type: "number",
                        description: "Optional what-if total for whole bill (custom charges stay fixed)",
                      },
                      discount_percent: {
                        type: "number",
                        minimum: 0,
                        maximum: 100,
                        description:
                          "Optional discount % applied ONLY to catalog profit. Custom charges are never discounted.",
                      },
                    },
                    required: ["lines"],
                  },
                },
              },
            },
            responses: {
              200: {
                description:
                  "Line breakdown and totals. Includes catalog_display_subtotal, custom_charges_total, and discount amount when discount_percent or final_total is provided.",
              },
              400: { description: "Validation error" },
              401: { description: "Unauthorized" },
              403: { description: "Forbidden" },
              404: { description: "Item not found" },
            },
          },
        },
        "/stores/{store_uuid}/bills/summary": {
          parameters: [{ in: "path", name: "store_uuid", required: true, schema: { type: "string" } }],
          get: {
            tags: ["Stores — Bills"],
            summary: "Sales summary for day, week, or month (revenue, bill_count)",
            description:
              "Cached in memory for 30 minutes. Pass refresh=true to force reload from Firestore. Response includes source: cache|db.",
            security: [{ bearerAuth: [] }],
            parameters: [
              { in: "query", name: "period", required: true, schema: { type: "string", enum: ["day", "week", "month"] } },
              { in: "query", name: "date", required: false, schema: { type: "string", example: "2025-03-18" } },
              {
                in: "query",
                name: "refresh",
                required: false,
                schema: { type: "string", enum: ["true", "false", "1", "0"], default: "false" },
                description: "Force reload from Firestore and replace the 30m cache entry",
              },
            ],
            responses: {
              200: { description: "revenue and bill_count for rollup doc (includes source)" },
              401: { description: "Unauthorized" },
              403: { description: "Forbidden" },
            },
          },
        },
        "/stores/{store_uuid}/bills": {
          parameters: [{ in: "path", name: "store_uuid", required: true, schema: { type: "string" } }],
          post: {
            tags: ["Stores — Bills"],
            summary: "Finalize bill (single transaction: stock, bill, rollups)",
            description:
              "Seller identity is taken from the Authorization bearer token. Supports catalog item lines and fixed custom charge lines (kind=custom). Custom charges are never discounted. unit_discount on catalog lines = charged unit rate when different from list sale (discount or markup); floor = retail, no ceiling; any unit_discount forces overall discount_percent to 0.",
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      lines: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            kind: {
                              type: "string",
                              enum: ["item", "custom"],
                              default: "item",
                            },
                            item_id: { type: "string", description: "Required when kind=item" },
                            name: { type: "string", description: "Required when kind=custom" },
                            unit_price: {
                              type: "number",
                              description: "Required when kind=custom. Fixed; never discounted.",
                            },
                            quantity: { type: "integer", minimum: 1 },
                            unit_discount: {
                              type: "number",
                              description:
                                "Catalog lines only. Per-unit selling rate when it differs from list sale (discount or markup). Floor = retail; no ceiling. Ignored overall discount_percent when any line sets this. Not allowed on custom lines.",
                              example: 110,
                            },
                          },
                          required: ["quantity"],
                        },
                      },
                      discount_percent: {
                        type: "number",
                        minimum: 0,
                        maximum: 100,
                        example: 0,
                        description:
                          "Optional; defaults to 0. Applies only to catalog profit. Custom charges are never discounted. Staff cannot apply discounts.",
                      },
                      username: {
                        type: "string",
                        example: "Ali Khan",
                        description: "Optional customer name saved on the bill when provided.",
                      },
                      phone_number: {
                        type: "string",
                        example: "+92 300 1234567",
                        description: "Optional customer phone saved on the bill when provided.",
                      },
                    },
                    required: ["lines"],
                  },
                },
              },
            },
            responses: {
              201: {
                description:
                  "Bill created with seller_id from bearer token; inventory and summaries updated. Includes custom_charges_total when custom lines were used.",
              },
              400: { description: "Discount too high or insufficient stock" },
              401: { description: "Unauthorized" },
              403: { description: "Forbidden" },
              404: { description: "Item not found" },
            },
          },
          get: {
            tags: ["Stores — Bills"],
            summary: "List bills (slim) with date and optional search filters",
            description:
              "Returns bill_id, final_total, username (customer name), and created_at. Filter by from/to date, and optionally seller_name, customer_name, or phone_number. Use GET /bills/{bill_id} for full details.",
            security: [{ bearerAuth: [] }],
            parameters: [
              { in: "query", name: "from", required: true, schema: { type: "string", example: "2026-07-01" } },
              { in: "query", name: "to", required: true, schema: { type: "string", example: "2026-07-17" } },
              { in: "query", name: "seller_name", required: false, schema: { type: "string", example: "Ali" } },
              { in: "query", name: "customer_name", required: false, schema: { type: "string", example: "Khan" } },
              { in: "query", name: "phone_number", required: false, schema: { type: "string", example: "3001234567" } },
              { in: "query", name: "limit", schema: { type: "number", example: 20 } },
              { in: "query", name: "cursor", schema: { type: "string" } },
            ],
            responses: {
              200: {
                description: "Paginated slim bill list",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        bills: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              bill_id: { type: "string" },
                              final_total: { type: "number" },
                              username: { type: "string", description: "Customer name; empty string if not set" },
                              created_at: { type: "string", description: "Bill creation time (ISO)" },
                            },
                          },
                        },
                        next_cursor: { type: "string", nullable: true },
                      },
                    },
                  },
                },
              },
              400: { description: "Validation error" },
              401: { description: "Unauthorized" },
              403: { description: "Forbidden" },
            },
          },
        },
        "/stores/{store_uuid}/bills/{bill_id}": {
          parameters: [
            { in: "path", name: "store_uuid", required: true, schema: { type: "string" } },
            { in: "path", name: "bill_id", required: true, schema: { type: "string" } },
          ],
          get: {
            tags: ["Stores — Bills"],
            summary: "Get full bill details",
            description: "Returns full bill record including line items, seller, customer, and totals.",
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: "Full bill detail" },
              401: { description: "Unauthorized" },
              403: { description: "Forbidden" },
              404: { description: "Bill not found" },
            },
          },
        },
        "/stores/{store_uuid}/reports/sales-summary": {
          parameters: [{ in: "path", name: "store_uuid", required: true, schema: { type: "string" } }],
          get: {
            tags: ["Stores — Reports"],
            summary: "Sales summary for day, week, month, or year",
            description:
              "Cached in memory for 30 minutes. Pass refresh=true to force reload from Firestore and update the cache. Response includes source: cache|db.",
            security: [{ bearerAuth: [] }],
            parameters: [
              { in: "query", name: "period", required: true, schema: { type: "string", enum: ["day", "week", "month", "year"] } },
              { in: "query", name: "date", required: false, schema: { type: "string", example: "2025-03-18" } },
              { in: "query", name: "scope", required: false, schema: { type: "string", enum: ["overall", "items"], default: "overall" } },
              {
                in: "query",
                name: "refresh",
                required: false,
                schema: { type: "string", enum: ["true", "false", "1", "0"], default: "false" },
                description: "Force reload from Firestore and replace the 30m cache entry",
              },
            ],
            responses: {
              200: { description: "Store sales summary and optional per-item rows (includes source)" },
              400: { description: "Validation error" },
              401: { description: "Unauthorized" },
              403: { description: "Forbidden" },
            },
          },
        },
        "/stores/{store_uuid}/reports/profit-summary": {
          parameters: [{ in: "path", name: "store_uuid", required: true, schema: { type: "string" } }],
          get: {
            tags: ["Stores — Reports"],
            summary: "Profit after discount for day, week, month, or year",
            description:
              "Cached in memory for 30 minutes. Pass refresh=true to force reload from Firestore and update the cache. Response includes source: cache|db.",
            security: [{ bearerAuth: [] }],
            parameters: [
              { in: "query", name: "period", required: true, schema: { type: "string", enum: ["day", "week", "month", "year"] } },
              { in: "query", name: "date", required: false, schema: { type: "string", example: "2025-03-18" } },
              { in: "query", name: "scope", required: false, schema: { type: "string", enum: ["overall", "items"], default: "overall" } },
              {
                in: "query",
                name: "refresh",
                required: false,
                schema: { type: "string", enum: ["true", "false", "1", "0"], default: "false" },
                description: "Force reload from Firestore and replace the 30m cache entry",
              },
            ],
            responses: {
              200: { description: "Store profit summary and optional per-item rows (includes source)" },
              400: { description: "Validation error" },
              401: { description: "Unauthorized" },
              403: { description: "Forbidden" },
            },
          },
        },
        "/stores/{store_uuid}/reports/most-sold-items": {
          parameters: [{ in: "path", name: "store_uuid", required: true, schema: { type: "string" } }],
          get: {
            tags: ["Stores — Reports"],
            summary: "Most sold items ranked by quantity, revenue, or both",
            description:
              "Cached in memory for 30 minutes. Pass refresh=true to force reload from Firestore and update the cache. Response includes source: cache|db.",
            security: [{ bearerAuth: [] }],
            parameters: [
              { in: "query", name: "period", required: true, schema: { type: "string", enum: ["day", "week", "month", "year"] } },
              { in: "query", name: "date", required: false, schema: { type: "string", example: "2025-03-18" } },
              { in: "query", name: "rank_by", required: false, schema: { type: "string", enum: ["quantity", "revenue", "both"], default: "both" } },
              { in: "query", name: "limit", required: false, schema: { type: "number", example: 10 } },
              {
                in: "query",
                name: "refresh",
                required: false,
                schema: { type: "string", enum: ["true", "false", "1", "0"], default: "false" },
                description: "Force reload from Firestore and replace the 30m cache entry",
              },
            ],
            responses: {
              200: { description: "Top items by quantity and/or revenue (includes source)" },
              400: { description: "Validation error" },
              401: { description: "Unauthorized" },
              403: { description: "Forbidden" },
            },
          },
        },
        "/stores/{store_uuid}/reports/sales-items": {
          parameters: [{ in: "path", name: "store_uuid", required: true, schema: { type: "string" } }],
          get: {
            tags: ["Stores — Reports"],
            summary: "List sold items with sale time (basic sales, no profit)",
            description:
              "Cached in memory for 30 minutes (per page/cursor). Pass refresh=true to force reload from Firestore and update the cache. Response includes source: cache|db.",
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                in: "query",
                name: "period",
                required: false,
                schema: { type: "string", enum: ["day", "week", "month", "year"], default: "day" },
                description: "Defaults to day (today when date omitted).",
              },
              { in: "query", name: "date", required: false, schema: { type: "string", example: "2026-07-16" } },
              { in: "query", name: "limit", required: false, schema: { type: "number", example: 20 }, description: "Bills per page (1-50). Default 20." },
              { in: "query", name: "cursor", required: false, schema: { type: "string" } },
              {
                in: "query",
                name: "refresh",
                required: false,
                schema: { type: "string", enum: ["true", "false", "1", "0"], default: "false" },
                description: "Force reload from Firestore and replace the 30m cache entry",
              },
            ],
            responses: {
              200: {
                description:
                  "Flattened sold item rows for the page of bills, with sale_time from bill.created_at. Includes next_cursor and source.",
              },
              400: { description: "Validation error" },
              401: { description: "Unauthorized" },
              403: { description: "Forbidden" },
            },
          },
        },
        "/stores/{store_uuid}/reports/staff-performance": {
          parameters: [{ in: "path", name: "store_uuid", required: true, schema: { type: "string" } }],
          get: {
            tags: ["Stores — Reports"],
            summary: "Staff performance / staff of the period (KPI)",
            description:
              "Ranks sellers by bill_count and/or revenue for the selected period. Uses seller_id saved on each finalized bill. Owner only. Cached 30m; pass refresh=true to force reload. Response includes source: cache|db.",
            security: [{ bearerAuth: [] }],
            parameters: [
              { in: "query", name: "period", required: true, schema: { type: "string", enum: ["day", "week", "month", "year"] } },
              { in: "query", name: "date", required: false, schema: { type: "string", example: "2026-07-17" } },
              {
                in: "query",
                name: "rank_by",
                required: false,
                schema: { type: "string", enum: ["bill_count", "revenue", "both"], default: "bill_count" },
              },
              { in: "query", name: "limit", required: false, schema: { type: "number", example: 10 } },
              {
                in: "query",
                name: "refresh",
                required: false,
                schema: { type: "string", enum: ["true", "false", "1", "0"], default: "false" },
                description: "Force reload from Firestore and replace the 30m cache entry",
              },
            ],
            responses: {
              200: {
                description: "Ranked staff list plus staff_of_period (top by bill_count). Includes source.",
              },
              400: { description: "Validation error" },
              401: { description: "Unauthorized" },
              403: { description: "Forbidden" },
            },
          },
        },
      },
    },
    apis: [],
  });
}

