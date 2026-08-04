CREATE TABLE `creditRechargeHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stripePaymentIntentId` varchar(255),
	`stripeSessionId` varchar(255),
	`amountCents` int NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'eur',
	`minutesAdded` int NOT NULL,
	`priceId` varchar(255) NOT NULL,
	`planAtPurchase` varchar(50) NOT NULL,
	`status` enum('completed','pending','failed','refunded') NOT NULL DEFAULT 'completed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creditRechargeHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`defaultLanguage` varchar(10) DEFAULT 'fr',
	`defaultExportFormat` enum('txt','srt','vtt') DEFAULT 'txt',
	`emailNotifications` int NOT NULL DEFAULT 1,
	`notifyOnComplete` int NOT NULL DEFAULT 1,
	`notifyOnLowCredits` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `userPreferences_userId_unique` UNIQUE(`userId`)
);
