import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const papers = pgTable("papers", {
  id: serial("id").primaryKey(),
  examTitle: text("exam_title").notNull().default("Monthly Test"),
  subject: text("subject").notNull().default(""),
  className: text("class_name").notNull().default(""),
  language: text("language").notNull().default("en"),
  copyMode: text("copy_mode").notNull().default("1"),
  totalMarks: integer("total_marks").notNull().default(0),
  data: jsonb("data").notNull(),
  downloads: integer("downloads").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // mcq | short | long
  text: text("text").notNull(),
  options: jsonb("options").$type<string[]>().notNull().default([]),
  subParts: jsonb("sub_parts").$type<{ text: string; marks: number }[]>().notNull().default([]),
  marks: integer("marks").notNull().default(1),
  subject: text("subject").notNull().default(""),
  className: text("class_name").notNull().default(""),
  chapter: text("chapter").notNull().default(""),
  language: text("language").notNull().default("en"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  config: jsonb("config").notNull(),
  builtIn: boolean("built_in").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const downloadLogs = pgTable("download_logs", {
  id: serial("id").primaryKey(),
  paperId: integer("paper_id"),
  paperTitle: text("paper_title").notNull().default(""),
  format: text("format").notNull(), // pdf | docx | print
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
