import { print } from 'graphql';
import { EXTRA_DIRECTIVES_DOCUMENT } from './transformation/validation';

export {
  constructDataSourceStrategies,
  constructSqlDirectiveDataSourceStrategies,
  getModelTypeNames,
  GraphQLTransform,
  GraphQLTransformOptions,
  SyncUtils,
} from './transformation';
export { UserDefinedSlot, UserDefinedResolver } from './transformation/types';
export { validateModelSchema } from './transformation/validation';
export {
  ConflictDetectionType,
  ConflictHandlerType,
  ResolverConfig,
  SyncConfig,
  SyncConfigOptimistic,
  SyncConfigServer,
  SyncConfigLambda,
  TransformConfig,
} from './config/index';
export {
  APICategory,
  collectDirectives,
  collectDirectivesByTypeNames,
  DirectiveWrapper,
  fieldsWithSqlDirective,
  generateGetArgumentsInput,
  GetArgumentsOptions,
  getImportedRDSTypeFromStrategyDbType,
  getKeySchema,
  getModelDataSourceStrategy,
  getParameterStoreSecretPath,
  getPrimaryKeyFields,
  getResourceName,
  getSortKeyFieldNames,
  getStrategyDbTypeFromTypeNode,
  getTable,
  isAmplifyDynamoDbModelDataSourceStrategy,
  isDefaultDynamoDbModelDataSourceStrategy,
  isDynamoDbModel,
  isDynamoDbType,
  isMutationNode,
  isObjectTypeDefinitionNode,
  isQueryNode,
  isSqlDbType,
  isSqlModel,
  isSqlStrategy,
  setResourceName,

  // Exported but possibly unused
  // TODO: Revisit these after the combine feature work. If they're not used, remove them
  isDynamoDbStrategy,
} from './utils';
export type { SetResourceNameProps } from './utils';
export * from './utils/operation-names';
export * from './errors';
export {
  TransformerModelBase,
  TransformerModelEnhancerBase,
  TransformerPluginBase,
  TransformerAuthBase,
} from './transformation/transformer-plugin-base';
export { TransformerResolver, StackManager } from './transformer-context';
export {
  DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
  DDB_DB_TYPE,
  DDB_DEFAULT_DATASOURCE_STRATEGY,
  ImportAppSyncAPIInputs,
  ImportedDataSourceConfig,
  ImportedDataSourceType,
  ImportedRDSType,
  MYSQL_DB_TYPE,
  POSTGRES_DB_TYPE,
  RDSConnectionSecrets,
  RDSDataSourceConfig,
  SQL_SCHEMA_FILE_NAME,
} from './types';
/**
 * Returns the extra set of directives that are supported by AppSync service.
 */
export const getAppSyncServiceExtraDirectives = (): string => {
  return print(EXTRA_DIRECTIVES_DOCUMENT);
};

export { MappingTemplate } from './cdk-compat';
export {
  EnumWrapper,
  FieldWrapper,
  InputFieldWrapper,
  InputObjectDefinitionWrapper,
  ObjectDefinitionWrapper,
} from './wrappers/object-definition-wrapper';
// No-op change to trigger re-publish
