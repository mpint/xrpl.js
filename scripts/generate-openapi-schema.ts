#!/usr/bin/env ts-node
/**
 * Generate OpenAPI 3.0.3 schema from TypeScript types
 *
 * This script generates an OpenAPI schema for XRPL API v2 methods by:
 * 1. Using ts-json-schema-generator to extract JSON schemas from TypeScript types
 * 2. Transforming JSON Schema Draft-07 to OpenAPI 3.0.3 format
 * 3. Creating separate paths for each method
 * 4. Supporting only API v2 (not v1 or v3)
 */

import * as fs from "fs";
import * as path from "path";
import * as TJS from "ts-json-schema-generator";
import SwaggerParser from "@apidevtools/swagger-parser";
import * as ts from "typescript";
import { getIncludedMethods, MethodMetadata } from "./method-metadata";

// Load configuration
const configPath = path.join(__dirname, "openapi-config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as TJS.Config;

// Output path
const outputPath = path.join(__dirname, "..", "openapi.json");

interface OpenAPISchema {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
  };
}

/**
 * Transform JSON Schema Draft-07 to OpenAPI 3.0.3 compatible schema
 */
function transformToOpenAPI(schema: any): any {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  // Handle arrays
  if (Array.isArray(schema)) {
    return schema.map(transformToOpenAPI);
  }

  const result: any = {};

  // Transform $ref from JSON Schema to OpenAPI format
  if (schema.$ref) {
    // Convert #/definitions/TypeName to #/components/schemas/TypeName
    result.$ref = schema.$ref.replace(
      "#/definitions/",
      "#/components/schemas/",
    );
    // If there are other properties (like description), copy them too
    for (const key of Object.keys(schema)) {
      if (key !== "$ref") {
        result[key] = schema[key];
      }
    }
    return result;
  }

  // Transform 'const' to 'enum' (OpenAPI 3.0.3 doesn't support const)
  if ("const" in schema) {
    result.enum = [schema.const];
    if (schema.description) {
      result.description = schema.description;
    }
    return result;
  }

  // Handle type arrays (e.g., ["string", "number"])
  if (Array.isArray(schema.type)) {
    const types = schema.type.filter((t: string) => t !== "null");
    const hasNull = schema.type.includes("null");

    if (types.length === 1) {
      result.type = types[0];
      if (hasNull) {
        result.nullable = true;
      }
    } else if (types.length > 1) {
      result.anyOf = types.map((t: string) => ({ type: t }));
      if (hasNull) {
        result.nullable = true;
      }
    }
  } else if (schema.type) {
    result.type = schema.type;
  }

  // Copy other properties
  for (const key of Object.keys(schema)) {
    if (key === "const" || key === "type" || key === "$ref") {
      continue; // Already handled
    }

    if (
      key === "description" ||
      key === "title" ||
      key === "default" ||
      key === "example" ||
      key === "format" ||
      key === "pattern" ||
      key === "minLength" ||
      key === "maxLength" ||
      key === "minimum" ||
      key === "maximum" ||
      key === "enum" ||
      key === "required"
    ) {
      result[key] = schema[key];
    } else if (
      key === "properties" ||
      key === "items" ||
      key === "anyOf" ||
      key === "oneOf" ||
      key === "allOf" ||
      key === "additionalProperties"
    ) {
      // Recursively transform nested schemas
      result[key] = transformToOpenAPI(schema[key]);
    }
  }

  return result;
}

/**
 * Generate schema for a specific type and collect all definitions
 */
function generateSchemaForType(
  generator: TJS.SchemaGenerator,
  typeName: string,
  allSchemas: Record<string, any>,
): any | null {
  try {
    const schema = generator.createSchema(typeName);
    if (!schema) {
      console.warn(`⚠️  Could not generate schema for ${typeName}`);
      return null;
    }

    // Extract definitions if present and add them to allSchemas
    if (schema.definitions) {
      for (const [defName, defSchema] of Object.entries(schema.definitions)) {
        if (!allSchemas[defName]) {
          allSchemas[defName] = transformToOpenAPI(defSchema);
        }
      }

      // If the root schema is just a $ref to a definition, return the actual definition
      if (schema.$ref && schema.definitions[typeName]) {
        return transformToOpenAPI(schema.definitions[typeName]);
      }

      // Remove definitions from the schema itself
      delete schema.definitions;
    }

    return transformToOpenAPI(schema);
  } catch (error) {
    console.error(
      `❌ Failed to generate schema for ${typeName}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Extract interface properties from TypeScript source files
 *
 * This function parses TypeScript files to extract property definitions
 * from interfaces, which ts-json-schema-generator fails to do when
 * interfaces extend other interfaces.
 */
function extractInterfaceProperties(
  methodsDir: string,
): Record<string, Record<string, any>> {
  const interfaceProperties: Record<string, Record<string, any>> = {};

  // Get all TypeScript files in the methods directory
  const files = fs.readdirSync(methodsDir).filter((f) => f.endsWith(".ts"));

  for (const file of files) {
    const filePath = path.join(methodsDir, file);
    const sourceCode = fs.readFileSync(filePath, "utf-8");

    // Parse the TypeScript file
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true,
    );

    // Visit all nodes in the AST
    ts.forEachChild(sourceFile, (node) => {
      // Look for interface declarations
      if (ts.isInterfaceDeclaration(node) && node.name) {
        const interfaceName = node.name.text;

        // Only process Request interfaces
        if (!interfaceName.endsWith("Request")) {
          return;
        }

        const properties: Record<string, any> = {};

        // Extract properties from the interface
        for (const member of node.members) {
          if (ts.isPropertySignature(member) && member.name) {
            const propName = member.name.getText(sourceFile);
            const isOptional = member.questionToken !== undefined;

            // Get JSDoc comment if present
            const jsDocTags = ts.getJSDocTags(member);
            let description = "";

            const jsDocComments = (member as any).jsDoc;
            if (jsDocComments && jsDocComments.length > 0) {
              description = jsDocComments[0].comment || "";
            }

            // Get type information
            let typeInfo: any = { type: "string" }; // Default

            if (member.type) {
              if (ts.isTypeReferenceNode(member.type)) {
                const typeName = member.type.typeName.getText(sourceFile);
                // Map known types
                if (typeName === "string") {
                  typeInfo = { type: "string" };
                } else if (typeName === "number") {
                  typeInfo = { type: "number" };
                } else if (typeName === "boolean") {
                  typeInfo = { type: "boolean" };
                } else {
                  // Reference to another type
                  typeInfo = { $ref: `#/components/schemas/${typeName}` };
                }
              } else if (member.type.kind === ts.SyntaxKind.StringKeyword) {
                typeInfo = { type: "string" };
              } else if (member.type.kind === ts.SyntaxKind.NumberKeyword) {
                typeInfo = { type: "number" };
              } else if (member.type.kind === ts.SyntaxKind.BooleanKeyword) {
                typeInfo = { type: "boolean" };
              } else if (member.type.kind === ts.SyntaxKind.UnknownKeyword) {
                typeInfo = {}; // unknown type
              } else if (ts.isUnionTypeNode(member.type)) {
                // Handle union types
                const types = member.type.types.map((t) => {
                  if (t.kind === ts.SyntaxKind.StringKeyword) {
                    return { type: "string" };
                  } else if (t.kind === ts.SyntaxKind.NumberKeyword) {
                    return { type: "number" };
                  } else if (ts.isLiteralTypeNode(t)) {
                    // Handle literal types (e.g., 'account_channels')
                    return {
                      type: "string",
                      enum: [t.literal.getText(sourceFile).replace(/'/g, "")],
                    };
                  }
                  return { type: "string" };
                });

                if (types.length > 1) {
                  typeInfo = { anyOf: types };
                } else {
                  typeInfo = types[0];
                }
              }
            }

            // Create a clean property object without AST node references
            const propertySchema: any = {};

            // Copy type info
            if (typeInfo.type) {
              propertySchema.type = typeInfo.type;
            }
            if (typeInfo.anyOf) {
              propertySchema.anyOf = typeInfo.anyOf;
            }
            if (typeInfo.enum) {
              propertySchema.enum = typeInfo.enum;
            }
            if (typeInfo.$ref) {
              propertySchema.$ref = typeInfo.$ref;
            }

            // Add description if present
            if (description) {
              propertySchema.description = String(description);
            }

            properties[propName] = propertySchema;
          }
        }

        if (Object.keys(properties).length > 0) {
          interfaceProperties[interfaceName] = properties;
        }
      }
    });
  }

  return interfaceProperties;
}

/**
 * Merge properties from base interfaces and extracted TypeScript interfaces into request schemas
 *
 * ts-json-schema-generator doesn't inline properties from extended interfaces,
 * so we need to manually merge them. This function adds properties from:
 * 1. BaseRequest (all requests)
 * 2. LookupByLedgerRequest (specific requests)
 * 3. Request-specific properties extracted from TypeScript source files
 */
function mergeBaseProperties(
  allSchemas: Record<string, any>,
  extractedProperties: Record<string, Record<string, any>>,
): void {
  // Define base interface properties
  const baseRequestProperties = {
    id: {
      anyOf: [{ type: "number" }, { type: "string" }],
      description:
        "A unique value to identify this request. The response to this request uses the same id field. This way, even if responses arrive out of order, you know which request prompted which response.",
    },
    command: {
      type: "string",
      description: "The name of the API method.",
    },
    api_version: {
      type: "number",
      description: "The API version to use. If omitted, use version 1.",
    },
  };

  const lookupByLedgerProperties = {
    ledger_hash: {
      type: "string",
      description: "A 20-byte hex string for the ledger version to use.",
    },
    ledger_index: {
      anyOf: [{ type: "string" }, { type: "number" }],
      description:
        "The ledger index of the ledger to use, or a shortcut string (e.g. 'validated', 'closed', 'current').",
    },
  };

  // Iterate through all schemas and merge base properties into Request types
  for (const [schemaName, schema] of Object.entries(allSchemas)) {
    // Only process Request types (not Response types)
    if (!schemaName.endsWith("Request") || !schema.properties) {
      continue;
    }

    // Merge BaseRequest properties (all requests extend BaseRequest)
    for (const [propName, propSchema] of Object.entries(
      baseRequestProperties,
    )) {
      if (!schema.properties[propName]) {
        schema.properties[propName] = propSchema;
      }
    }

    // Merge LookupByLedgerRequest properties for requests that extend it
    // Based on actual TypeScript interface definitions
    const extendsLookupByLedger = [
      "AccountChannelsRequest",
      "AccountCurrenciesRequest",
      "AccountInfoRequest",
      "AccountLinesRequest",
      "AccountNFTsRequest",
      "AccountObjectsRequest",
      "AccountOffersRequest",
      "AccountTxRequest",
      "BookOffersRequest",
      "DepositAuthorizedRequest",
      "GatewayBalancesRequest",
      "LedgerRequest",
      "LedgerDataRequest",
      "LedgerEntryRequest",
      "NFTBuyOffersRequest",
      "NFTHistoryRequest",
      "NFTInfoRequest",
      "NFTsByIssuerRequest",
      "NFTSellOffersRequest",
      "RipplePathFindRequest",
      "TransactionEntryRequest",
    ].includes(schemaName);

    if (extendsLookupByLedger) {
      for (const [propName, propSchema] of Object.entries(
        lookupByLedgerProperties,
      )) {
        if (!schema.properties[propName]) {
          schema.properties[propName] = propSchema;
        }
      }
    }

    // Merge request-specific properties extracted from TypeScript source
    if (extractedProperties[schemaName]) {
      for (const [propName, propSchema] of Object.entries(
        extractedProperties[schemaName],
      )) {
        // Don't override base properties that were already added
        if (!schema.properties[propName]) {
          schema.properties[propName] = propSchema;
        }
      }
    }
  }
}

/**
 * Create OpenAPI path for a method
 */
function createMethodPath(
  method: MethodMetadata,
  requestSchema: any,
  responseSchema: any,
): any {
  return {
    post: {
      summary: method.description,
      description: `${method.description}\n\nDocumentation: https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/${method.category.toLowerCase().replace(/ /g, "-")}/${method.command}.md`,
      operationId: method.command,
      tags: [method.category],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: requestSchema
              ? { $ref: `#/components/schemas/${method.requestType}` }
              : {},
          },
        },
      },
      responses: {
        "200": {
          description: "Successful response",
          content: {
            "application/json": {
              schema: responseSchema
                ? { $ref: `#/components/schemas/${method.responseType}` }
                : {},
            },
          },
        },
      },
    },
  };
}

/**
 * Create a fresh schema generator
 * Note: ts-json-schema-generator has a caching bug where using the same generator
 * instance for multiple types can cause "missing definition" errors.
 * Creating a fresh generator for each type avoids this issue.
 */
function createFreshGenerator(): TJS.SchemaGenerator {
  const generator = TJS.createGenerator(config);
  if (!generator) {
    throw new Error("Failed to create schema generator");
  }
  return generator;
}

/**
 * Main generation function
 */
async function generateOpenAPISchema(): Promise<void> {
  console.log("🚀 Starting OpenAPI schema generation for XRPL API v2...\n");

  // Initialize OpenAPI schema
  const openapi: OpenAPISchema = {
    openapi: "3.0.3",
    info: {
      title: "XRPL JSON-RPC API",
      version: "2.0.0",
      description:
        "OpenAPI specification for XRP Ledger JSON-RPC API v2. This schema covers HTTP-compatible methods only (WebSocket streaming methods are excluded).\n\n**Important Notes:**\n- This schema supports **API v2 only** (not v1 or v3)\n- All methods use the same JSON-RPC endpoint in practice\n- Separate paths are provided for better developer experience and client generation\n- For more information, visit https://xrpl.org/docs/references/http-websocket-apis/",
    },
    servers: [
      {
        url: "https://s1.ripple.com:51234",
        description: "Mainnet",
      },
      {
        url: "https://s.altnet.rippletest.net:51234",
        description: "Testnet",
      },
      {
        url: "https://s.devnet.rippletest.net:51234",
        description: "Devnet",
      },
    ],
    paths: {},
    components: {
      schemas: {},
    },
  };

  // Get methods to include
  const methods = getIncludedMethods();
  console.log(`📋 Processing ${methods.length} methods...\n`);

  let successCount = 0;
  let failCount = 0;
  const failedMethods: string[] = [];

  // Generate schemas for each method
  // Note: We create a fresh generator for each type to avoid ts-json-schema-generator
  // caching bugs that cause "missing definition" errors when reusing the same generator.
  for (const method of methods) {
    console.log(`Processing ${method.command}...`);

    // Generate request schema with a fresh generator
    const requestGenerator = createFreshGenerator();
    const requestSchema = generateSchemaForType(
      requestGenerator,
      method.requestType,
      openapi.components.schemas,
    );
    if (requestSchema) {
      openapi.components.schemas[method.requestType] = requestSchema;
    }

    // Generate response schema with a fresh generator
    const responseGenerator = createFreshGenerator();
    const responseSchema = generateSchemaForType(
      responseGenerator,
      method.responseType,
      openapi.components.schemas,
    );
    if (responseSchema) {
      openapi.components.schemas[method.responseType] = responseSchema;
    }

    // Create path if both schemas were generated
    if (requestSchema && responseSchema) {
      openapi.paths[`/${method.command}`] = createMethodPath(
        method,
        requestSchema,
        responseSchema,
      );
      successCount++;
      console.log(`  ✅ ${method.command}`);
    } else {
      failCount++;
      failedMethods.push(method.command);
      console.log(`  ❌ ${method.command} (schema generation failed)`);
    }
  }

  console.log(`\n📊 Generation Summary:`);
  console.log(`  ✅ Success: ${successCount}/${methods.length} methods`);
  console.log(`  ❌ Failed: ${failCount}/${methods.length} methods`);
  if (failedMethods.length > 0) {
    console.log(`  Failed methods: ${failedMethods.join(", ")}`);
  }

  // Post-process: Extract properties from TypeScript source files
  console.log(
    "\n🔧 Post-processing: Extracting properties from TypeScript source files...",
  );
  const methodsDir = path.join(
    __dirname,
    "..",
    "packages",
    "xrpl",
    "src",
    "models",
    "methods",
  );
  const extractedProperties = extractInterfaceProperties(methodsDir);
  console.log(
    `✅ Extracted properties from ${Object.keys(extractedProperties).length} interfaces`,
  );

  // Post-process: Merge base interface properties into request schemas
  console.log("\n🔧 Post-processing: Merging base interface properties...");
  mergeBaseProperties(openapi.components.schemas, extractedProperties);
  console.log("✅ Base properties merged successfully");

  // Post-process: Fix any remaining #/definitions/ references
  let openapiJson = JSON.stringify(openapi, null, 2);
  openapiJson = openapiJson.replace(
    /#\/definitions\//g,
    "#/components/schemas/",
  );

  // Write to file
  fs.writeFileSync(outputPath, openapiJson);
  console.log(`\n✅ OpenAPI schema written to ${outputPath}`);

  // Validate the schema
  console.log("\n🔍 Validating OpenAPI schema...");
  try {
    await SwaggerParser.validate(outputPath);
    console.log("✅ Schema is valid!");
  } catch (error) {
    console.error("❌ Schema validation failed:", error);
    throw error;
  }
}

// Run the generator
generateOpenAPISchema().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
