
import { z } from 'zod';
import { insertUserSchema, users, transactions } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  badRequest: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: z.object({
        username: z.string().min(3),
        password: z.string().min(6),
        fullName: z.string().min(2),
      }),
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  banking: {
    deposit: {
      method: 'POST' as const,
      path: '/api/deposit' as const,
      input: z.object({
        amount: z.coerce.number().positive(),
        description: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof transactions.$inferSelect>(),
        400: errorSchemas.badRequest,
      },
    },
    withdraw: {
      method: 'POST' as const,
      path: '/api/withdraw' as const,
      input: z.object({
        amount: z.coerce.number().positive(),
        description: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof transactions.$inferSelect>(),
        400: errorSchemas.badRequest,
      },
    },
    transfer: {
      method: 'POST' as const,
      path: '/api/transfer' as const,
      input: z.object({
        amount: z.coerce.number().positive(),
        toAccountNumber: z.string(),
        description: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof transactions.$inferSelect>(),
        400: errorSchemas.badRequest,
      },
    },
    transactions: {
      method: 'GET' as const,
      path: '/api/transactions' as const,
      responses: {
        200: z.array(z.custom<typeof transactions.$inferSelect>()),
      },
    },
  },
  admin: {
    users: {
      method: 'GET' as const,
      path: '/api/admin/users' as const,
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
        403: errorSchemas.unauthorized,
      },
    },
    transactions: {
      method: 'GET' as const,
      path: '/api/admin/transactions' as const,
      responses: {
        200: z.array(z.custom<typeof transactions.$inferSelect & { user: typeof users.$inferSelect }>()),
        403: errorSchemas.unauthorized,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
