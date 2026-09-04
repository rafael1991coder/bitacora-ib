CREATE TABLE `resources` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`type` text NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `studied` (
	`resource_id` text NOT NULL,
	`user_id` text NOT NULL,
	`studied_at` text NOT NULL,
	PRIMARY KEY(`resource_id`, `user_id`),
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`password` text NOT NULL,
	`pin` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_name_unique` ON `users` (`name`);