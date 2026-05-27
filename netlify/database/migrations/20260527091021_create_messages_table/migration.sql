CREATE TABLE "messages" (
	"id" serial PRIMARY KEY,
	"topic" text NOT NULL,
	"message" text NOT NULL,
	"direction" text DEFAULT 'received' NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL
);
