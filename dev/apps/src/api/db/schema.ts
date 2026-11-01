import { pgTable, unique, uuid, varchar, timestamp, bigint, text, foreignKey, primaryKey, date } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const habits = pgTable("habits", {
	id: uuid().primaryKey().notNull(),
	name: varchar({ length: 50 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	rowVersion: bigint("row_version", { mode: "number" }).default(1).notNull(),
	txnId: text("txn_id"),
}, (table) => [
	unique("habits_name_key").on(table.name),
]);

export const habitChecks = pgTable("habit_checks", {
	habitId: uuid("habit_id").notNull(),
	checkDate: date("check_date").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	rowVersion: bigint("row_version", { mode: "number" }).default(1).notNull(),
	txnId: text("txn_id"),
}, (table) => [
	foreignKey({
			columns: [table.habitId],
			foreignColumns: [habits.id],
			name: "habit_checks_habit_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.habitId, table.checkDate], name: "habit_checks_pkey"}),
]);
