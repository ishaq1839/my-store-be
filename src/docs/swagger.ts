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
                              created_at: { type: "string" },
                              updated_at: { type: "string" },
                              name: { type: "string" },
                              description: { type: "string" },
                            },
                            required: ["uuid", "created_at", "updated_at", "name", "description"],
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
        "/contacts": {
          post: {
            tags: ["Contacts"],
            summary: "Create contact",
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
              500: { description: "Internal Server Error" },
            },
          },
          get: {
            tags: ["Contacts"],
            summary: "List my contacts",
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: "Contact list" },
              401: { description: "Unauthorized" },
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
                        enum: ["single", "carton"],
                        description: "Required when creating a new item (ignored when item_id is provided).",
                        example: "single",
                      },
                      name: { type: "string", description: "Required when creating a new item" },
                      description: { type: "string", description: "Required when creating a new item" },
                      retail_price: { type: "number", example: 10 },
                      sale_price: { type: "number", nullable: true },
                      total_items: { type: "integer", example: 10, description: "Units in this batch" },
                    },
                    required: ["retail_price", "total_items"],
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
              200: { description: "Item list with totals and current prices" },
              401: { description: "Unauthorized" },
              403: { description: "Not store owner" },
              404: { description: "Store not found" },
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
                            item_id: { type: "string" },
                            quantity: { type: "integer", minimum: 1 },
                          },
                          required: ["item_id", "quantity"],
                        },
                      },
                      final_total: { type: "number", description: "Optional what-if total for implied discount %" },
                      discount_percent: {
                        type: "number",
                        minimum: 0,
                        maximum: 100,
                        description:
                          "Optional preview discount % applied ONLY to profit (display_subtotal_total - retail_floor_total). 100% means final_total equals retail_floor_total. No DB writes.",
                      },
                    },
                    required: ["lines"],
                  },
                },
              },
            },
            responses: {
              200: { description: "Line breakdown and totals (includes discount amount when discount_percent or final_total is provided)" },
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
            security: [{ bearerAuth: [] }],
            parameters: [
              { in: "query", name: "period", required: true, schema: { type: "string", enum: ["day", "week", "month"] } },
              { in: "query", name: "date", required: false, schema: { type: "string", example: "2025-03-18" } },
            ],
            responses: {
              200: { description: "revenue and bill_count for rollup doc" },
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
                            item_id: { type: "string" },
                            quantity: { type: "integer", minimum: 1 },
                          },
                          required: ["item_id", "quantity"],
                        },
                      },
                      discount_percent: { type: "number", minimum: 0, maximum: 100, example: 0 },
                    },
                    required: ["lines", "discount_percent"],
                  },
                },
              },
            },
            responses: {
              201: { description: "Bill created; inventory and summaries updated" },
              400: { description: "Discount too high or insufficient stock" },
              401: { description: "Unauthorized" },
              403: { description: "Forbidden" },
              404: { description: "Item not found" },
            },
          },
          get: {
            tags: ["Stores — Bills"],
            summary: "List bills in date range",
            security: [{ bearerAuth: [] }],
            parameters: [
              { in: "query", name: "from", required: true, schema: { type: "string" } },
              { in: "query", name: "to", required: true, schema: { type: "string" } },
              { in: "query", name: "limit", schema: { type: "number", example: 20 } },
              { in: "query", name: "cursor", schema: { type: "string" } },
            ],
            responses: {
              200: { description: "Paginated bills" },
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

