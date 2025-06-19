import { MigrationInterface, QueryRunner } from "typeorm";

export class CleanSchema1749910431793 implements MigrationInterface {
    name = 'CleanSchema1749910431793'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "menus" ADD "category" character varying(50)`);
        await queryRunner.query(`COMMENT ON COLUMN "menus"."category" IS 'Categoría del ítem (ej: "Entradas", "Platos Principales")'`);
        await queryRunner.query(`ALTER TABLE "menus" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "menus" ADD "description" text`);
        await queryRunner.query(`ALTER TABLE "menus" DROP COLUMN "price"`);
        await queryRunner.query(`ALTER TABLE "menus" ADD "price" numeric(10,2)`);
        await queryRunner.query(`COMMENT ON COLUMN "menus"."price" IS 'Precio en formato decimal (ej: 1500.50)'`);
        await queryRunner.query(`COMMENT ON COLUMN "menus"."imageUrl" IS 'URL de la imagen del ítem del menú'`);
        await queryRunner.query(`CREATE INDEX "IDX_62f6422b138b02c889426a1bf4" ON "menus" ("restaurantId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_62f6422b138b02c889426a1bf4"`);
        await queryRunner.query(`COMMENT ON COLUMN "menus"."imageUrl" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "menus"."price" IS 'Precio en formato decimal (ej: 1500.50)'`);
        await queryRunner.query(`ALTER TABLE "menus" DROP COLUMN "price"`);
        await queryRunner.query(`ALTER TABLE "menus" ADD "price" double precision`);
        await queryRunner.query(`ALTER TABLE "menus" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "menus" ADD "description" character varying`);
        await queryRunner.query(`COMMENT ON COLUMN "menus"."category" IS 'Categoría del ítem (ej: "Entradas", "Platos Principales")'`);
        await queryRunner.query(`ALTER TABLE "menus" DROP COLUMN "category"`);
    }

}
