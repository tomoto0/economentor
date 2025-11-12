CREATE TABLE `learning_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`noteText` text NOT NULL,
	`category` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learning_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practice_problems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`problemText` text NOT NULL,
	`solution` text,
	`difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'medium',
	`solved` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `practice_problems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`question` text NOT NULL,
	`options` text NOT NULL,
	`correctAnswer` varchar(255) NOT NULL,
	`explanation` text,
	`userAnswer` varchar(255),
	`isCorrect` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quizzes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `learning_notes` ADD CONSTRAINT `learning_notes_sessionId_learning_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `learning_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practice_problems` ADD CONSTRAINT `practice_problems_sessionId_learning_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `learning_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizzes` ADD CONSTRAINT `quizzes_sessionId_learning_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `learning_sessions`(`id`) ON DELETE cascade ON UPDATE no action;