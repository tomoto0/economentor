CREATE TABLE `chat_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`sender` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`contentType` enum('text','json','markdown') NOT NULL DEFAULT 'text',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learning_sessions` (
	`id` varchar(64) NOT NULL,
	`topic` varchar(255) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learning_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `chat_logs` ADD CONSTRAINT `chat_logs_sessionId_learning_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `learning_sessions`(`id`) ON DELETE cascade ON UPDATE no action;