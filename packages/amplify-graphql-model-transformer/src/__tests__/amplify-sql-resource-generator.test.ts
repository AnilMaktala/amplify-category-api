import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { MYSQL_DB_TYPE, constructDataSourceStrategies, validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { parse } from 'graphql';
import { SQLLambdaModelDataSourceStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ResourceConstants } from 'graphql-transformer-common';
import { ModelTransformer } from '../graphql-model-transformer';

describe('ModelTransformer with SQL data sources:', () => {
  const mysqlStrategy: SQLLambdaModelDataSourceStrategy = {
    name: 'mysqlStrategy',
    dbType: MYSQL_DB_TYPE,
    dbConnectionConfig: {
      hostnameSsmPath: '/test/hostname',
      portSsmPath: '/test/port',
      usernameSsmPath: '/test/username',
      passwordSsmPath: '/test/password',
      databaseNameSsmPath: '/test/databaseName',
    },
  };

  it('should successfully transform simple valid schema', async () => {
    const validSchema = `
      type Post @model {
          id: ID! @primaryKey
          title: String!
      }
      type Comment @model {
        id: ID! @primaryKey
        content: String
      }
    `;

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
    });
    expect(out).toBeDefined();
    const sqlApiStack = out.stacks[ResourceConstants.RESOURCES.SQLStackName];
    expect(sqlApiStack).toBeDefined();
    expect(out.functions[`${ResourceConstants.RESOURCES.SQLLambdaLogicalID}.zip`]).toBeDefined();
    expect(out.functions[`${ResourceConstants.RESOURCES.SQLPatchingLambdaLogicalID}.zip`]).toBeDefined();
    validateModelSchema(parse(out.schema));
  });
});
