
import { z } from 'zod';
import { User, Transaction } from './schema';

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

// Type schemas for responses
const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  password: z.string(),
  fullName: z.string(),
  accountNumber: z.string(),
  balance: z.string(),
  createdAt: z.coerce.date(),
  isAdmin: z.boolean(),
});

const transactionSchema = z.object({
  id: z.number(),
  userId: z.number(),
  type: z.enum(['deposit', 'withdraw', 'transfer']),
  amount: z.number(),
  description: z.string().optional(),
  from_user: z.string().nullable().optional(),
  to_user: z.string().nullable().optional(),
  relatedUserId: z.number().nullish(), // null for deposit/withdraw, number for transfers
  date: z.coerce.date(),
});

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
        201: userSchema,
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
        200: userSchema,
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
        200: userSchema,
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
        200: transactionSchema,
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
        200: transactionSchema,
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
        200: transactionSchema,
        400: errorSchemas.badRequest,
      },
    },
    transactions: {
      method: 'GET' as const,
      path: '/api/transactions' as const,
      responses: {
        200: z.array(transactionSchema),
      },
    },
  },
  admin: {
    users: {
      method: 'GET' as const,
      path: '/api/admin/users' as const,
      responses: {
        200: z.array(userSchema),
        403: errorSchemas.unauthorized,
      },
    },
    transactions: {
      method: 'GET' as const,
      path: '/api/admin/transactions' as const,
      responses: {
        200: z.array(transactionSchema.extend({ user: userSchema })),
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
