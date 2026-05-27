import * as Joi from "joi"

const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().default(3000),
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),

  // Optional Phase 2 — only required at boot when the corresponding feature
  // is actually exercised. Empty string passes validation so dev/CI without
  // Firebase or faucet keys still boots cleanly.
  FIREBASE_PROJECT_ID: Joi.string().allow("").optional(),
  FIREBASE_ADMIN_KEY_PATH: Joi.string().allow("").optional(),
  ALCHEMY_API_KEY: Joi.string().allow("").optional(),
  COINBASE_FAUCET_API_KEY: Joi.string().allow("").optional(),
  HELIUS_API_KEY: Joi.string().allow("").optional(),
  STARKNET_FAUCET_API_KEY: Joi.string().allow("").optional()
})

export { envValidationSchema }
