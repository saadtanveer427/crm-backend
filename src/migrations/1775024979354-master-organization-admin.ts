import { MigrationInterface, QueryRunner } from 'typeorm';

const ADMIN_ID = '46092f91-5266-43ed-a241-a08d0947fc6a';

const organizations = [
  { orgId: '99d5958f-cb0c-42ca-8e43-758c8c2debc0', orgName: 'Acme Corp' },
  { orgId: '14480f03-ce9b-4d2c-a4de-5c4bc246c854', orgName: 'Globex Corporation' },
  { orgId: 'f644ec9a-688b-4d4e-9ee7-9a385f1212c7', orgName: 'Initech' },
  { orgId: '3841c10a-353e-4179-b649-999cd3bec2f6', orgName: 'Umbrella Inc' },
  { orgId: '1fe408a3-3472-412f-9111-a4e8e62e8db4', orgName: 'Stark Industries' },
  { orgId: '0dd5acc5-75a6-4635-b42d-618ccae0ea4e', orgName: 'Wayne Enterprises' },
  { orgId: 'afd471c2-9b70-4fbc-a69c-fe95c6364a98', orgName: 'Hooli' },
  { orgId: '7c78bff1-cfb3-4c0d-9e2a-7d12fa83854b', orgName: 'Pied Piper' },
  { orgId: '983268ce-3cd3-47f9-adc2-4b6b416b2a1e', orgName: 'Dunder Mifflin' },
  { orgId: 'd7b982af-0d32-4151-81ac-ad2276e86139', orgName: 'Vandelay Industries' },
];

// The single admin belongs to the first org but has visibility across all orgs via role

export class MasterOrganizationAdmin1775024979354 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const org of organizations) {
      await queryRunner.query(`
        INSERT INTO organization (id, name, created_at, updated_at)
        VALUES ('${org.orgId}', '${org.orgName}', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `);
    }

    await queryRunner.query(`
      INSERT INTO users (id, name, email, role, organization_id, created_at, updated_at)
      VALUES (
        '${ADMIN_ID}',
        'Super Admin',
        'admin@crm.com',
        'admin',
        null,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM users WHERE id = '${ADMIN_ID}'`);

    const orgIds = organizations.map((o) => `'${o.orgId}'`).join(', ');
    await queryRunner.query(`DELETE FROM organization WHERE id IN (${orgIds})`);
  }
}
