import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserProviderType1722400000000 implements MigrationInterface {
  name = 'UpdateUserProviderType1722400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the enum type
    await queryRunner.query(`
      CREATE TYPE "auth_provider_enum" AS ENUM('local', 'facebook', 'line', 'apple', 'google')
    `);

    // Add the new provider column
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD "provider" "auth_provider_enum" NOT NULL DEFAULT 'local'
    `);

    // Add the new providerId column  
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD "providerId" character varying
    `);

    // Migrate existing data: set provider to 'facebook' where isFacebookUser is true
    await queryRunner.query(`
      UPDATE "users" 
      SET "provider" = 'facebook', "providerId" = "facebookId"
      WHERE "isFacebookUser" = true
    `);

    // Drop the old columns
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "isFacebookUser"
    `);
    
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "facebookId"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the old columns
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD "isFacebookUser" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD "facebookId" character varying
    `);

    // Migrate data back
    await queryRunner.query(`
      UPDATE "users" 
      SET "isFacebookUser" = true, "facebookId" = "providerId"
      WHERE "provider" = 'facebook'
    `);

    // Drop the new columns
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "providerId"
    `);

    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "provider"
    `);

    // Drop the enum type
    await queryRunner.query(`
      DROP TYPE "auth_provider_enum"
    `);
  }
}
