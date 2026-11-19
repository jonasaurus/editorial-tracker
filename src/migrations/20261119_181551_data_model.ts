import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`content_items\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`status\` text DEFAULT 'idea' NOT NULL,
  	\`type\` text NOT NULL,
  	\`deadline\` text,
  	\`archived\` integer DEFAULT false,
  	\`created_by_id\` integer,
  	\`published_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`content_items_created_by_idx\` ON \`content_items\` (\`created_by_id\`);`)
  await db.run(sql`CREATE INDEX \`content_items_updated_at_idx\` ON \`content_items\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`content_items_created_at_idx\` ON \`content_items\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`content_items_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`content_items\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`content_items_rels_order_idx\` ON \`content_items_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`content_items_rels_parent_idx\` ON \`content_items_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`content_items_rels_path_idx\` ON \`content_items_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`content_items_rels_users_id_idx\` ON \`content_items_rels\` (\`users_id\`);`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`name\` text NOT NULL;`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`role\` text NOT NULL;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`content_items_id\` integer REFERENCES content_items(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_content_items_id_idx\` ON \`payload_locked_documents_rels\` (\`content_items_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`content_items\`;`)
  await db.run(sql`DROP TABLE \`content_items_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id") SELECT "id", "order", "parent_id", "path", "users_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`name\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`role\`;`)
}
