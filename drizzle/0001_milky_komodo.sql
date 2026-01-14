CREATE TABLE `transcriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','processing','completed','error') NOT NULL DEFAULT 'pending',
	`fileUrl` text NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`duration` int,
	`resultUrl` text,
	`resultSrt` text,
	`resultVtt` text,
	`resultTxt` text,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transcriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `transcriptions` ADD CONSTRAINT `transcriptions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;