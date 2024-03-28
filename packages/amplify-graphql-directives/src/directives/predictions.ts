import { Directive } from './directive';

const name = 'predictions';
const definition = /* GraphQL */ `
  directive @${name}(actions: [PredictionsActions!]!) on FIELD_DEFINITION
  enum PredictionsActions {
    identifyText
    identifyLabels
    convertTextToSpeech
    translateText
  }
`;
const defaults = {};

export const PredictionsDirective: Directive = {
  name,
  definition,
  defaults,
};
