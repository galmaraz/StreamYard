import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1780881200000 implements MigrationInterface {
  name = 'InitialSchema1780881200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE "public"."users_role_enum" AS ENUM ('admin', 'host', 'guest', 'viewer');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE "public"."rooms_status_enum" AS ENUM ('active', 'ended');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password_hash" character varying NOT NULL,
        "display_name" character varying NOT NULL,
        "role" "public"."users_role_enum" NOT NULL DEFAULT 'host',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rooms" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "status" "public"."rooms_status_enum" NOT NULL DEFAULT 'active',
        "is_private" boolean NOT NULL DEFAULT false,
        "access_code" character varying(12) NOT NULL DEFAULT 'LIVE2026',
        "host_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "ended_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_rooms_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_rooms_slug" ON "rooms" ("slug")`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_rooms_host_id_users'
        ) THEN
          ALTER TABLE "rooms"
            ADD CONSTRAINT "FK_rooms_host_id_users"
            FOREIGN KEY ("host_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "participants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "room_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "display_name" character varying NOT NULL,
        "participant_role" character varying NOT NULL DEFAULT 'participant',
        "socket_id" character varying,
        "mic_enabled" boolean NOT NULL DEFAULT true,
        "camera_enabled" boolean NOT NULL DEFAULT true,
        "hand_raised" boolean NOT NULL DEFAULT false,
        "joined_at" TIMESTAMP NOT NULL DEFAULT now(),
        "left_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_participants_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_participants_room_id" ON "participants" ("room_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_participants_user_id" ON "participants" ("user_id")`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_participants_room_id_rooms'
        ) THEN
          ALTER TABLE "participants"
            ADD CONSTRAINT "FK_participants_room_id_rooms"
            FOREIGN KEY ("room_id") REFERENCES "rooms"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "room_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "room_id" uuid NOT NULL,
        "participant_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "display_name" character varying NOT NULL,
        "content" character varying(500) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_room_messages_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_room_messages_room_id" ON "room_messages" ("room_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_room_messages_participant_id" ON "room_messages" ("participant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_room_messages_user_id" ON "room_messages" ("user_id")`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_room_messages_room_id_rooms'
        ) THEN
          ALTER TABLE "room_messages"
            ADD CONSTRAINT "FK_room_messages_room_id_rooms"
            FOREIGN KEY ("room_id") REFERENCES "rooms"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_room_messages_participant_id_participants'
        ) THEN
          ALTER TABLE "room_messages"
            ADD CONSTRAINT "FK_room_messages_participant_id_participants"
            FOREIGN KEY ("participant_id") REFERENCES "participants"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "room_messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "participants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rooms"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."rooms_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
  }
}
