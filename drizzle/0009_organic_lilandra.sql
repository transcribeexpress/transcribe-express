CREATE TABLE IF NOT EXISTS `gdprRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`email` varchar(255) NOT NULL,
	`requestType` enum('export','deletion','rectification','portability') NOT NULL,
	`reason` text,
	`status` enum('pending','processing','completed','rejected') NOT NULL DEFAULT 'pending',
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gdprRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `supportTickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`subject` varchar(500) NOT NULL,
	`category` enum('technical','billing','account','feature','other') NOT NULL DEFAULT 'other',
	`message` text NOT NULL,
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supportTickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `transcriptions` ADD COLUMN IF NOT EXISTS `resultUrl` text;--> statement-breakpoint
ALTER TABLE `transcriptions` ADD COLUMN IF NOT EXISTS `resultSrt` text;--> statement-breakpoint
ALTER TABLE `transcriptions` ADD COLUMN IF NOT EXISTS `resultVtt` text;--> statement-breakpoint
ALTER TABLE `transcriptions` ADD COLUMN IF NOT EXISTS `resultTxt` text;
