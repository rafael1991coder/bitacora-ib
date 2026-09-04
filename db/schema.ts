import { primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  password: text('password').notNull(),
  pin: text('pin').notNull(),
  createdAt: text('created_at').notNull(),
});

export const resources = sqliteTable('resources', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  type: text('type', { enum: ['video', 'documento', 'imagen'] }).notNull(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
});

export const studied = sqliteTable('studied', {
  resourceId: text('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  studiedAt: text('studied_at').notNull(),
}, (table) => [primaryKey({ columns: [table.resourceId, table.userId] })]);
