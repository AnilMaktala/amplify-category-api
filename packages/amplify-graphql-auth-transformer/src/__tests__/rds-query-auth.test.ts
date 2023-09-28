import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { parse } from 'graphql';
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';
import { AuthTransformer } from '../graphql-auth-transformer';

describe('Verify RDS Model level Auth rules on queries:', () => {

  it('should successfully transform apiKey auth rule', async () => {
    const validSchema = `
      type Post @model
        @auth(rules: [{allow: public}]) {
          id: ID!
          title: String!
      }
    `;

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new AuthTransformer()],
      modelToDatasourceMap: new Map(
        Object.entries({
          Post: {
            dbType: 'MySQL',
            provisionDB: false,
          },
        }),
      ),
    });
    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    parse(out.schema);

    // Verify Get Query authorization rule
    expect(out.resolvers['Query.getPost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Query.getPost.postAuth.1.req.vtl']).toMatchSnapshot();

    // Verify List Query authorization rule
    expect(out.resolvers['Query.listPosts.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Query.listPosts.postAuth.1.req.vtl']).toMatchSnapshot();
  });

  it('should successfully transform cognito auth rules', async () => {
    const validSchema = `
      type PostPrivate @model
        @auth(rules: [
          {allow: private}
        ]) {
          id: ID!
          title: String!
      }

      type PostSingleOwner @model
        @auth(rules: [
          {allow: owner}
        ]) {
          id: ID!
          title: String!
      }

      type PostOwners @model
        @auth(rules: [
          {allow: owner, ownerField: "owners"}
        ]) {
          id: ID!
          title: String!
          owners: [String]
      }

      type PostStaticGroups @model
        @auth(rules: [
          {allow: groups, groups: ["Admin", "Moderator"]}
        ]) {
          id: ID!
          title: String!
      }

      type PostGroups @model
        @auth(rules: [
          {allow: groups, groupsField: "groups"}
        ]) {
          id: ID!
          title: String!
          groups: [String]
      }

      type PostSingleGroup @model
        @auth(rules: [
          {allow: groups, groupsField: "group"}
        ]) {
          id: ID!
          title: String!
          group: String
      }
    `;

    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [],
    };

    const modelToDatasourceMap = new Map();
    ['PostPrivate', 'PostSingleOwner', 'PostOwners', 'PostStaticGroups', 'PostSingleGroup', 'PostGroups'].forEach((model) => {
      modelToDatasourceMap.set(model, {
        dbType: 'MySQL',
        provisionDB: false,
      })
    });

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new AuthTransformer()],
      authConfig,
      modelToDatasourceMap,
    });
    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    parse(out.schema);

    const authResolvers = [
      // Private
      'Query.getPostPrivate.auth.1.req.vtl',
      'Query.getPostPrivate.postAuth.1.req.vtl',
      'Query.listPostPrivates.auth.1.req.vtl',
      'Query.listPostPrivates.postAuth.1.req.vtl',
      // Owner
      'Query.getPostSingleOwner.auth.1.req.vtl',
      'Query.getPostSingleOwner.postAuth.1.req.vtl',
      'Query.listPostSingleOwners.auth.1.req.vtl',
      'Query.listPostSingleOwners.postAuth.1.req.vtl',
      // Owners
      'Query.getPostOwners.auth.1.req.vtl',
      'Query.getPostOwners.postAuth.1.req.vtl',
      'Query.listPostOwners.auth.1.req.vtl',
      'Query.listPostOwners.postAuth.1.req.vtl',
      // Static Groups
      'Query.getPostStaticGroups.auth.1.req.vtl',
      'Query.getPostStaticGroups.postAuth.1.req.vtl',
      'Query.listPostStaticGroups.auth.1.req.vtl',
      'Query.listPostStaticGroups.postAuth.1.req.vtl',
      // Group
      'Query.getPostSingleGroup.auth.1.req.vtl',
      'Query.getPostSingleGroup.postAuth.1.req.vtl',
      'Query.listPostSingleGroups.auth.1.req.vtl',
      'Query.listPostSingleGroups.postAuth.1.req.vtl',
      // Groups
      'Query.getPostGroups.auth.1.req.vtl',
      'Query.getPostGroups.postAuth.1.req.vtl',
      'Query.listPostGroups.auth.1.req.vtl',
      'Query.listPostGroups.postAuth.1.req.vtl',
    ];

    authResolvers.forEach((resolver) => {
      expect(out.resolvers[resolver]).toBeDefined();
      expect(out.resolvers[resolver]).toMatchSnapshot();
    });
  });

  it('should successfully transform oidc auth rules', async () => {
    const validSchema = `
      type PostPrivate @model
        @auth(rules: [
          {allow: private, provider: oidc}
        ]) {
          id: ID!
          title: String!
      }

      type PostSingleOwner @model
        @auth(rules: [
          {allow: owner, provider: oidc}
        ]) {
          id: ID!
          title: String!
      }

      type PostOwners @model
        @auth(rules: [
          {allow: owner, ownerField: "owners", provider: oidc}
        ]) {
          id: ID!
          title: String!
          owners: [String]
      }

      type PostStaticGroups @model
        @auth(rules: [
          {allow: groups, groups: ["Admin", "Moderator"], provider: oidc}
        ]) {
          id: ID!
          title: String!
      }

      type PostGroups @model
        @auth(rules: [
          {allow: groups, groupsField: "groups", provider: oidc}
        ]) {
          id: ID!
          title: String!
          groups: [String]
      }

      type PostSingleGroup @model
        @auth(rules: [
          {allow: groups, groupsField: "group", provider: oidc}
        ]) {
          id: ID!
          title: String!
          group: String
      }
    `;

    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'OPENID_CONNECT',
        openIDConnectConfig: {
          name: 'myOIDCProvider',
          issuerUrl: 'https://some-oidc-provider/auth',
          clientId: 'my-sample-client-id',
        },
      },
      additionalAuthenticationProviders: [],
    };

    const modelToDatasourceMap = new Map();
    ['PostPrivate', 'PostSingleOwner', 'PostOwners', 'PostStaticGroups', 'PostSingleGroup', 'PostGroups'].forEach((model) => {
      modelToDatasourceMap.set(model, {
        dbType: 'MySQL',
        provisionDB: false,
      })
    });

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new AuthTransformer()],
      authConfig,
      modelToDatasourceMap,
    });
    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    parse(out.schema);

    const authResolvers = [
      // Private
      'Query.getPostPrivate.auth.1.req.vtl',
      'Query.getPostPrivate.postAuth.1.req.vtl',
      'Query.listPostPrivates.auth.1.req.vtl',
      'Query.listPostPrivates.postAuth.1.req.vtl',
      // Owner
      'Query.getPostSingleOwner.auth.1.req.vtl',
      'Query.getPostSingleOwner.postAuth.1.req.vtl',
      'Query.listPostSingleOwners.auth.1.req.vtl',
      'Query.listPostSingleOwners.postAuth.1.req.vtl',
      // Owners
      'Query.getPostOwners.auth.1.req.vtl',
      'Query.getPostOwners.postAuth.1.req.vtl',
      'Query.listPostOwners.auth.1.req.vtl',
      'Query.listPostOwners.postAuth.1.req.vtl',
      // Static Groups
      'Query.getPostStaticGroups.auth.1.req.vtl',
      'Query.getPostStaticGroups.postAuth.1.req.vtl',
      'Query.listPostStaticGroups.auth.1.req.vtl',
      'Query.listPostStaticGroups.postAuth.1.req.vtl',
      // Group
      'Query.getPostSingleGroup.auth.1.req.vtl',
      'Query.getPostSingleGroup.postAuth.1.req.vtl',
      'Query.listPostSingleGroups.auth.1.req.vtl',
      'Query.listPostSingleGroups.postAuth.1.req.vtl',
      // Groups
      'Query.getPostGroups.auth.1.req.vtl',
      'Query.getPostGroups.postAuth.1.req.vtl',
      'Query.listPostGroups.auth.1.req.vtl',
      'Query.listPostGroups.postAuth.1.req.vtl',
    ];

    authResolvers.forEach((resolver) => {
      expect(out.resolvers[resolver]).toBeDefined();
      expect(out.resolvers[resolver]).toMatchSnapshot();
    });
  });

  it('should successfully transform function auth rule', async () => {
    const validSchema = `
      type Post @model
        @auth(rules: [{allow: custom}]) {
          id: ID!
          title: String!
      }
    `;

    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AWS_LAMBDA',
        lambdaAuthorizerConfig: {
          lambdaFunction: 'TEST_LAMBDA_AUTH_FUNCTION', 
        }
      },
      additionalAuthenticationProviders: [],
    };

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new AuthTransformer()],
      authConfig,
      modelToDatasourceMap: new Map(
        Object.entries({
          Post: {
            dbType: 'MySQL',
            provisionDB: false,
          },
        }),
      ),
    });
    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    parse(out.schema);

    // Verify Get Query authorization rule
    expect(out.resolvers['Query.getPost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Query.getPost.postAuth.1.req.vtl']).toMatchSnapshot();

    // Verify List Query authorization rule
    expect(out.resolvers['Query.listPosts.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Query.listPosts.postAuth.1.req.vtl']).toMatchSnapshot();
  });

  it('should successfully transform iam auth rules', async () => {
    const validSchema = `
      type PostPrivate @model
        @auth(rules: [
          {allow: private, provider: iam}
        ]) {
          id: ID!
          title: String!
      }

      type PostPublic @model
        @auth(rules: [
          {allow: public, provider: iam}
        ]) {
          id: ID!
          title: String!
      }
    `;

    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AWS_IAM',
      },
      additionalAuthenticationProviders: [],
    };

    const modelToDatasourceMap = new Map();
    ['PostPrivate', 'PostPublic'].forEach((model) => {
      modelToDatasourceMap.set(model, {
        dbType: 'MySQL',
        provisionDB: false,
      })
    });

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new AuthTransformer()],
      authConfig,
      modelToDatasourceMap,
    });
    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    parse(out.schema);

    const authResolvers = [
      // Private
      'Query.getPostPrivate.auth.1.req.vtl',
      'Query.getPostPrivate.postAuth.1.req.vtl',
      'Query.listPostPrivates.auth.1.req.vtl',
      'Query.listPostPrivates.postAuth.1.req.vtl',
      // Public
      'Query.getPostPublic.auth.1.req.vtl',
      'Query.getPostPublic.postAuth.1.req.vtl',
      'Query.listPostPublics.auth.1.req.vtl',
      'Query.listPostPublics.postAuth.1.req.vtl',
    ];

    authResolvers.forEach((resolver) => {
      expect(out.resolvers[resolver]).toBeDefined();
      expect(out.resolvers[resolver]).toMatchSnapshot();
    });
  });

});
