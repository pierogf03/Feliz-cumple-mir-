CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL
);

--> statement-breakpoint
CREATE TABLE `love_reasons` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);

--> statement-breakpoint
CREATE TABLE `memories` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`media_url` text DEFAULT '' NOT NULL,
	`thumbnail_url` text DEFAULT '' NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`date` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`visible` integer DEFAULT 1 NOT NULL,
	`style` text DEFAULT 'paper' NOT NULL,
	`size` text DEFAULT 'medium' NOT NULL,
	`created_at` text NOT NULL
);

--> statement-breakpoint
CREATE INDEX `memories_visible_order` ON `memories` (`visible`,`sort_order`);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);

--> statement-breakpoint
CREATE TABLE `timeline` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text DEFAULT '' NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`media_url` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
