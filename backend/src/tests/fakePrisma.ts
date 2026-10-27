/**
 * A tiny in-memory stand-in for the Prisma client, covering only the calls
 * the auth/ownership code paths make. Lets the tests exercise the real
 * Express app, middleware and services without a database.
 */
type Row = Record<string, any>;

export function createFakePrisma() {
  const users: Row[] = [];
  const sessions: Row[] = [];
  const orders: Row[] = [];
  const messages: Row[] = [];
  const inventory: Record<string, number> = {};
  let seq = 0;
  const id = (prefix: string) => `${prefix}_${++seq}`;

  const matches = (row: Row, where: Row = {}) =>
    Object.entries(where).every(([k, v]) => (typeof v === "object" && v !== null ? true : row[k] === v));

  const fake: any = {
    __state: { users, sessions, orders, messages, inventory },

    user: {
      async create({ data }: { data: Row }) {
        if (users.some((u) => u.email === data.email)) {
          throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
        }
        const row = { id: id("user"), role: "CUSTOMER", createdAt: new Date(), ...data };
        users.push(row);
        return row;
      },
      async findUnique({ where }: { where: Row }) {
        return users.find((u) => matches(u, where)) ?? null;
      },
    },

    agentSession: {
      async findFirst({ where }: { where: Row }) {
        return sessions.find((s) => matches(s, where)) ?? null;
      },
      async create({ data }: { data: Row }) {
        const row = { id: id("sess"), startedAt: new Date(), ...data };
        sessions.push(row);
        return row;
      },
    },

    agentMessage: {
      async findMany({ where }: { where: Row }) {
        return messages.filter((m) => matches(m, where));
      },
    },

    auditLog: {
      async findMany() {
        return [];
      },
    },

    order: {
      async findUnique({ where }: { where: Row }) {
        return orders.find((o) => matches(o, where)) ?? null;
      },
      async findMany({ where }: { where?: Row }) {
        return orders.filter((o) => matches(o, where));
      },
      async update({ where, data }: { where: Row; data: Row }) {
        const row = orders.find((o) => matches(o, where));
        if (!row) throw new Error("Record not found");
        Object.assign(row, data);
        return row;
      },
    },

    inventory: {
      async update({ where, data }: { where: Row; data: Row }) {
        inventory[where.productId] -= data.quantity.decrement;
        return {};
      },
    },

    async $transaction(fn: (tx: any) => Promise<any>) {
      return fn(fake);
    },
  };

  return fake;
}
