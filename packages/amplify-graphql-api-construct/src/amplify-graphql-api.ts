import { Construct } from 'constructs';
import { executeTransform } from '@aws-amplify/graphql-transformer';
import { NestedStack, Stack } from 'aws-cdk-lib';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { AssetProps } from '@aws-amplify/graphql-transformer-interfaces';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import { graphqlOutputKey } from '@aws-amplify/backend-output-schemas';
import type { GraphqlOutput, AwsAppsyncAuthenticationType } from '@aws-amplify/backend-output-schemas';
import {
  AppsyncFunction,
  DataSourceOptions,
  DynamoDbDataSource,
  ElasticsearchDataSource,
  EventBridgeDataSource,
  ExtendedResolverProps,
  HttpDataSource,
  HttpDataSourceOptions,
  LambdaDataSource,
  NoneDataSource,
  OpenSearchDataSource,
  RdsDataSource,
  Resolver,
} from 'aws-cdk-lib/aws-appsync';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { IDomain } from 'aws-cdk-lib/aws-elasticsearch';
import { IDomain as IOpenSearchDomain } from 'aws-cdk-lib/aws-opensearchservice';
import { IEventBus } from 'aws-cdk-lib/aws-events';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { IServerlessCluster } from 'aws-cdk-lib/aws-rds';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { parseUserDefinedSlots, validateFunctionSlots, separateSlots } from './internal/user-defined-slots';
import type {
  AmplifyGraphqlApiResources,
  AmplifyGraphqlApiProps,
  FunctionSlot,
  IBackendOutputStorageStrategy,
  AddFunctionProps,
  ConflictResolution,
} from './types';
import {
  convertAuthorizationModesToTransformerAuthConfig,
  convertToResolverConfig,
  defaultTranslationBehavior,
  AssetManager,
  getGeneratedResources,
  getGeneratedFunctionSlots,
  CodegenAssets,
  addAmplifyMetadataToStackDescription,
  getAdditionalAuthenticationTypes,
} from './internal';
import { getStackForScope, walkAndProcessNodes } from './internal/construct-tree';

/**
 * L3 Construct which invokes the Amplify Transformer Pattern over an input Graphql Schema.
 *
 * This can be used to quickly define appsync apis which support full CRUD+List and Subscriptions, relationships,
 * auth, search over data, the ability to inject custom business logic and query/mutation operations, and connect to ML services.
 *
 * For more information, refer to the docs links below:
 * Data Modeling - https://docs.amplify.aws/cli/graphql/data-modeling/
 * Authorization - https://docs.amplify.aws/cli/graphql/authorization-rules/
 * Custom Business Logic - https://docs.amplify.aws/cli/graphql/custom-business-logic/
 * Search - https://docs.amplify.aws/cli/graphql/search-and-result-aggregations/
 * ML Services - https://docs.amplify.aws/cli/graphql/connect-to-machine-learning-services/
 *
 * For a full reference of the supported custom graphql directives - https://docs.amplify.aws/cli/graphql/directives-reference/
 *
 * The output of this construct is a mapping of L2 or L1 resources generated by the transformer, which generally follow the access pattern
 *
 * ```typescript
 *   const api = new AmplifyGraphQlApi(this, 'api', { <params> });
 *   // Access L2 resources under `.resources`
 *   api.resources.tables["Todo"].tableArn;
 *
 *   // Access L1 resources under `.resources.cfnResources`
 *   api.resources.cfnResources.cfnGraphqlApi.xrayEnabled = true;
 *   Object.values(api.resources.cfnResources.cfnTables).forEach(table => {
 *     table.pointInTimeRecoverySpecification = { pointInTimeRecoveryEnabled: false };
 *   });
 * ```
 * `resources.<ResourceType>.<ResourceName>` - you can then perform any CDK action on these resulting resoureces.
 */
export class AmplifyGraphqlApi extends Construct {
  /**
   * Generated L1 and L2 CDK resources.
   */
  public readonly resources: AmplifyGraphqlApiResources;

  /**
   * Generated assets required for codegen steps. Persisted in order to render as part of the output strategy.
   */
  private readonly codegenAssets: CodegenAssets;

  /**
   * Resolvers generated by the transform process, persisted on the side in order to facilitate pulling a manifest
   * for the purposes of inspecting and producing overrides.
   */
  public readonly generatedFunctionSlots: FunctionSlot[];

  /**
   * Graphql URL For the generated API. May be a CDK Token.
   */
  public readonly graphqlUrl: string;

  /**
   * Realtime URL For the generated API. May be a CDK Token.
   */
  public readonly realtimeUrl: string;

  /**
   * Generated Api Key if generated. May be a CDK Token.
   */
  public readonly apiKey: string | undefined;

  /**
   * Generated Api Id. May be a CDK Token.
   */
  public readonly apiId: string;

  /**
   * Conflict resolution setting
   */
  private readonly conflictResolution: ConflictResolution | undefined;

  /**
   * New AmplifyGraphqlApi construct, this will create an appsync api with authorization, a schema, and all necessary resolvers, functions,
   * and datasources.
   * @param scope the scope to create this construct within.
   * @param id the id to use for this api.
   * @param props the properties used to configure the generated api.
   */
  constructor(scope: Construct, id: string, props: AmplifyGraphqlApiProps) {
    super(scope, id);

    validateNoOtherAmplifyGraphqlApiInStack(this);

    const {
      definition,
      authorizationModes,
      conflictResolution,
      functionSlots,
      transformerPlugins,
      predictionsBucket,
      stackMappings,
      translationBehavior,
      functionNameMap,
      outputStorageStrategy,
    } = props;

    addAmplifyMetadataToStackDescription(scope);

    const { authConfig, authSynthParameters } = convertAuthorizationModesToTransformerAuthConfig(authorizationModes);

    validateFunctionSlots(functionSlots ?? []);
    const separatedFunctionSlots = separateSlots([...(functionSlots ?? []), ...definition.functionSlots]);

    // Allow amplifyEnvironmentName to be retrieve from context, and use value 'NONE' if no value can be found.
    // amplifyEnvironmentName is required for logical id suffixing, as well as Exports from the nested stacks.
    // Allow export so customers can reuse the env in their own references downstream.
    const amplifyEnvironmentName = this.node.tryGetContext('amplifyEnvironmentName') ?? 'NONE';
    if (amplifyEnvironmentName.length > 8) {
      throw new Error(`or cdk --context env must have a length <= 8, found ${amplifyEnvironmentName}`);
    }

    const assetManager = new AssetManager();

    executeTransform({
      scope: this,
      nestedStackProvider: {
        provide: (nestedStackScope: Construct, name: string) => new NestedStack(nestedStackScope, name),
      },
      assetProvider: {
        provide: (assetScope: Construct, assetId: string, assetProps: AssetProps) =>
          new Asset(assetScope, assetId, { path: assetManager.addAsset(assetProps.fileName, assetProps.fileContent) }),
      },
      synthParameters: {
        amplifyEnvironmentName: amplifyEnvironmentName,
        apiName: props.apiName ?? id,
        ...authSynthParameters,
      },
      schema: definition.schema,
      userDefinedSlots: parseUserDefinedSlots(separatedFunctionSlots),
      transformersFactoryArgs: {
        customTransformers: transformerPlugins ?? [],
        ...(predictionsBucket ? { storageConfig: { bucketName: predictionsBucket.bucketName } } : {}),
        functionNameMap,
      },
      authConfig,
      stackMapping: stackMappings ?? {},
      resolverConfig: conflictResolution ? convertToResolverConfig(conflictResolution) : undefined,
      transformParameters: {
        ...defaultTranslationBehavior,
        ...(translationBehavior ?? {}),
      },
    });

    this.codegenAssets = new CodegenAssets(this, 'AmplifyCodegenAssets', { modelSchema: definition.schema });

    this.resources = getGeneratedResources(this);
    this.conflictResolution = conflictResolution;
    this.generatedFunctionSlots = getGeneratedFunctionSlots(assetManager.resolverAssets);
    this.storeOutput(outputStorageStrategy);

    this.apiId = this.resources.cfnResources.cfnGraphqlApi.attrApiId;
    this.graphqlUrl = this.resources.cfnResources.cfnGraphqlApi.attrGraphQlUrl;
    this.realtimeUrl = this.resources.cfnResources.cfnGraphqlApi.attrRealtimeUrl;
    this.apiKey = this.resources.cfnResources.cfnApiKey?.attrApiKey;
  }

  /**
   * Stores graphql api output to be used for client config generation
   * @param outputStorageStrategy Strategy to store construct outputs. If no strategy is provided a default strategy will be used.
   */
  private storeOutput(
    outputStorageStrategy: IBackendOutputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(Stack.of(this)),
  ): void {
    const stack = Stack.of(this);
    const output: GraphqlOutput = {
      version: '1',
      payload: {
        awsAppsyncApiId: this.resources.cfnResources.cfnGraphqlApi.attrApiId,
        awsAppsyncApiEndpoint: this.resources.cfnResources.cfnGraphqlApi.attrGraphQlUrl,
        awsAppsyncAuthenticationType: this.resources.cfnResources.cfnGraphqlApi.authenticationType as AwsAppsyncAuthenticationType,
        awsAppsyncRegion: stack.region,
        amplifyApiModelSchemaS3Uri: this.codegenAssets.modelSchemaS3Uri,
      },
    };

    if (this.resources.cfnResources.cfnApiKey) {
      output.payload.awsAppsyncApiKey = this.resources.cfnResources.cfnApiKey.attrApiKey;
    }

    const additionalAuthTypes = getAdditionalAuthenticationTypes(this.resources.cfnResources.cfnGraphqlApi);
    if (additionalAuthTypes) {
      output.payload.awsAppsyncAdditionalAuthenticationTypes = additionalAuthTypes;
    }

    if (this.conflictResolution?.project?.handlerType) {
      output.payload.awsAppsyncConflictResolutionMode = this.conflictResolution?.project?.handlerType;
    }

    outputStorageStrategy.addBackendOutputEntry(graphqlOutputKey, output);
  }

  /**
   * The following are proxy methods to the L2 IGraphqlApi interface, to facilitate easier use of the L3 without needing
   * to access the underlying resources.
   */

  /**
   * Add a new DynamoDB data source to this API. This is a proxy method to the L2 GraphqlApi Construct.
   * @param id The data source's id.
   * @param table The DynamoDB table backing this data source.
   * @param options The optional configuration for this data source.
   * @returns the generated data source.
   */
  public addDynamoDbDataSource(id: string, table: ITable, options?: DataSourceOptions): DynamoDbDataSource {
    return this.resources.graphqlApi.addDynamoDbDataSource(id, table, options);
  }

  /**
   * Add a new elasticsearch data source to this API. This is a proxy method to the L2 GraphqlApi Construct.
   * @deprecated use `addOpenSearchDataSource`
   * @param id The data source's id.
   * @param domain The elasticsearch domain for this data source.
   * @param options The optional configuration for this data source.
   * @returns the generated data source.
   */
  public addElasticsearchDataSource(id: string, domain: IDomain, options?: DataSourceOptions): ElasticsearchDataSource {
    return this.resources.graphqlApi.addElasticsearchDataSource(id, domain, options);
  }

  /**
   * Add an EventBridge data source to this api. This is a proxy method to the L2 GraphqlApi Construct.
   * @param id The data source's id.
   * @param eventBus The EventBridge EventBus on which to put events.
   * @param options The optional configuration for this data source.
   */
  public addEventBridgeDataSource(id: string, eventBus: IEventBus, options?: DataSourceOptions): EventBridgeDataSource {
    return this.resources.graphqlApi.addEventBridgeDataSource(id, eventBus, options);
  }

  /**
   * Add a new http data source to this API. This is a proxy method to the L2 GraphqlApi Construct.
   * @param id The data source's id.
   * @param endpoint The http endpoint.
   * @param options The optional configuration for this data source.
   * @returns the generated data source.
   */
  public addHttpDataSource(id: string, endpoint: string, options?: HttpDataSourceOptions): HttpDataSource {
    return this.resources.graphqlApi.addHttpDataSource(id, endpoint, options);
  }

  /**
   * Add a new Lambda data source to this API. This is a proxy method to the L2 GraphqlApi Construct.
   * @param id The data source's id.
   * @param lambdaFunction The Lambda function to call to interact with this data source.
   * @param options The optional configuration for this data source.
   * @returns the generated data source.
   */
  public addLambdaDataSource(id: string, lambdaFunction: IFunction, options?: DataSourceOptions): LambdaDataSource {
    return this.resources.graphqlApi.addLambdaDataSource(id, lambdaFunction, options);
  }

  /**
   * Add a new dummy data source to this API. This is a proxy method to the L2 GraphqlApi Construct.
   * Useful for pipeline resolvers and for backend changes that don't require a data source.
   * @param id The data source's id.
   * @param options The optional configuration for this data source.
   * @returns the generated data source.
   */
  public addNoneDataSource(id: string, options?: DataSourceOptions): NoneDataSource {
    return this.resources.graphqlApi.addNoneDataSource(id, options);
  }

  /**
   * dd a new OpenSearch data source to this API. This is a proxy method to the L2 GraphqlApi Construct.
   * @param id The data source's id.
   * @param domain The OpenSearch domain for this data source.
   * @param options The optional configuration for this data source.
   * @returns the generated data source.
   */
  public addOpenSearchDataSource(id: string, domain: IOpenSearchDomain, options?: DataSourceOptions): OpenSearchDataSource {
    return this.resources.graphqlApi.addOpenSearchDataSource(id, domain, options);
  }

  /**
   * Add a new Rds data source to this API. This is a proxy method to the L2 GraphqlApi Construct.
   * @param id The data source's id.
   * @param serverlessCluster The serverless cluster to interact with this data source.
   * @param secretStore The secret store that contains the username and password for the serverless cluster.
   * @param databaseName The optional name of the database to use within the cluster.
   * @param options The optional configuration for this data source.
   * @returns the generated data source.
   */
  public addRdsDataSource(
    id: string,
    serverlessCluster: IServerlessCluster,
    secretStore: ISecret,
    databaseName?: string,
    options?: DataSourceOptions,
  ): RdsDataSource {
    return this.resources.graphqlApi.addRdsDataSource(id, serverlessCluster, secretStore, databaseName, options);
  }

  /**
   * Add a resolver to the api. This is a proxy method to the L2 GraphqlApi Construct.
   * @param id The resolver's id.
   * @param props the resolver properties.
   * @returns the generated resolver.
   */
  public addResolver(id: string, props: ExtendedResolverProps): Resolver {
    return this.resources.graphqlApi.createResolver(id, props);
  }

  /**
   * Add an appsync function to the api.
   * @param id the function's id.
   * @returns the generated appsync function.
   */
  public addFunction(id: string, props: AddFunctionProps): AppsyncFunction {
    return new AppsyncFunction(this, id, {
      api: this.resources.graphqlApi,
      ...props,
    });
  }
}

/**
 * Given the provided scope, walk the node tree, and throw an exception if any other AmplifyGraphqlApi constructs
 * are found in the stack.
 * @param scope the scope this construct is created in.
 */
const validateNoOtherAmplifyGraphqlApiInStack = (scope: Construct): void => {
  const rootStack = getStackForScope(scope, true);

  let wasOtherAmplifyGraphlApiFound = false;
  walkAndProcessNodes(rootStack, (node: Construct) => {
    if (node instanceof AmplifyGraphqlApi && scope !== node) {
      wasOtherAmplifyGraphlApiFound = true;
    }
  });

  if (wasOtherAmplifyGraphlApiFound) {
    throw new Error('Only one AmplifyGraphqlApi is expected in a stack');
  }
};
